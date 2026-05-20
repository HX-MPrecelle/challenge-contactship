import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { HubSpotAuthError } from "@/lib/errors";

const HUBSPOT_TOKEN_URL = "https://api.hubapi.com/oauth/v1/token";
const HUBSPOT_TOKEN_INFO_URL = "https://api.hubapi.com/oauth/v1/access-tokens";

export type HubSpotTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

export type HubSpotTokenInfo = {
  hub_id: number;
  hub_domain?: string;
  app_id?: number;
  scopes: string[];
  expires_in: number;
};

/**
 * Exchange the authorization code returned to /api/hubspot/callback for an
 * access + refresh token pair. Throws if the exchange fails (typically a
 * stale code or a redirect_uri mismatch).
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<HubSpotTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: process.env.HUBSPOT_CLIENT_ID!,
    client_secret: process.env.HUBSPOT_CLIENT_SECRET!,
    redirect_uri: redirectUri,
    code,
  });

  const res = await fetch(HUBSPOT_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const detail = await safeReadError(res);
    throw new HubSpotAuthError(
      `Code exchange failed: HTTP ${res.status} — ${detail}`
    );
  }

  return (await res.json()) as HubSpotTokenResponse;
}

/**
 * Refresh an access token using the long-lived refresh token. HubSpot
 * returns a brand-new access_token and refresh_token; both must be persisted.
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<HubSpotTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: process.env.HUBSPOT_CLIENT_ID!,
    client_secret: process.env.HUBSPOT_CLIENT_SECRET!,
    refresh_token: refreshToken,
  });

  const res = await fetch(HUBSPOT_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const detail = await safeReadError(res);
    throw new HubSpotAuthError(
      `Refresh failed: HTTP ${res.status} — ${detail}`
    );
  }

  return (await res.json()) as HubSpotTokenResponse;
}

/**
 * Inspect an access token to discover the portal it grants access to plus
 * the scopes the user actually approved. Called once right after the code
 * exchange so we can populate hubspot_connections with portal_id + scopes.
 */
export async function inspectAccessToken(
  accessToken: string
): Promise<HubSpotTokenInfo> {
  const res = await fetch(`${HUBSPOT_TOKEN_INFO_URL}/${accessToken}`);
  if (!res.ok) {
    const detail = await safeReadError(res);
    throw new HubSpotAuthError(
      `Token introspection failed: HTTP ${res.status} — ${detail}`
    );
  }
  return (await res.json()) as HubSpotTokenInfo;
}

/**
 * Persist a token into Supabase Vault using the SECURITY DEFINER wrapper.
 * Returns the secret's UUID, which is what we store on hubspot_connections.
 */
export async function storeTokenInVault(
  token: string,
  label: string
): Promise<string> {
  const admin = createServiceClient();
  const { data, error } = await admin.rpc("create_hubspot_token_secret", {
    token,
    label,
  });
  if (error || !data) {
    throw new HubSpotAuthError(
      `Vault write failed: ${error?.message ?? "no id returned"}`
    );
  }
  return data;
}

/**
 * Replace the value behind an existing Vault secret. Used during token
 * refresh: HubSpot rotates both access and refresh on every refresh, and
 * we want to keep the same `*_secret` UUIDs in hubspot_connections so the
 * row identity is stable.
 */
export async function updateTokenInVault(
  secretId: string,
  newToken: string
): Promise<void> {
  const admin = createServiceClient();
  const { error } = await admin.rpc("update_hubspot_token_secret", {
    secret_id: secretId,
    new_token: newToken,
  });
  if (error) {
    throw new HubSpotAuthError(`Vault update failed: ${error.message}`);
  }
}

/**
 * Read the decrypted token value out of Vault. The service role is the only
 * caller that has EXECUTE on this RPC (enforced in migration 007).
 */
export async function readTokenFromVault(secretId: string): Promise<string> {
  const admin = createServiceClient();
  const { data, error } = await admin.rpc("get_hubspot_token_secret", {
    secret_id: secretId,
  });
  if (error || !data) {
    throw new HubSpotAuthError(
      `Vault read failed: ${error?.message ?? "secret not found"}`
    );
  }
  return data;
}

async function safeReadError(res: Response): Promise<string> {
  try {
    const text = await res.text();
    return text.slice(0, 500);
  } catch {
    return "no body";
  }
}

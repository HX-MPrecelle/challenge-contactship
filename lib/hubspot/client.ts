import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { HubSpotAuthError, HubSpotRateLimitError } from "@/lib/errors";
import {
  readTokenFromVault,
  refreshAccessToken,
  updateTokenInVault,
} from "@/lib/hubspot/oauth";

const HUBSPOT_API_BASE = "https://api.hubapi.com";

// Refresh proactively if the access token expires in less than this window.
const REFRESH_WINDOW_MS = 5 * 60 * 1000;

export type HubSpotClient = {
  portalId: string;
  fetch: (path: string, init?: RequestInit) => Promise<Response>;
};

/**
 * Build a HubSpot client scoped to one organization's connection. Handles
 * proactive token refresh + a single retry on 429 (HubSpot rate-limit).
 *
 * If the refresh token is invalid (HubSpot rotated it out from under us, the
 * user revoked the integration, etc.), this throws HubSpotAuthError and
 * marks the connection as needing reconnection so the UI can prompt the
 * user. Callers should let that error bubble.
 */
export async function getHubSpotClient(orgId: string): Promise<HubSpotClient> {
  const admin = createServiceClient();

  const { data: connection, error } = await admin
    .from("hubspot_connections")
    .select(
      "id, portal_id, access_token_secret, refresh_token_secret, token_expires_at, needs_reconnect"
    )
    .eq("org_id", orgId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load HubSpot connection: ${error.message}`);
  }
  if (!connection) {
    throw new HubSpotAuthError(
      "No HubSpot connection exists for this organization"
    );
  }
  if (connection.needs_reconnect) {
    throw new HubSpotAuthError(
      "HubSpot connection needs to be re-established"
    );
  }
  if (!connection.access_token_secret || !connection.refresh_token_secret) {
    throw new HubSpotAuthError("HubSpot connection is missing tokens");
  }

  const expiresAt = connection.token_expires_at
    ? new Date(connection.token_expires_at).getTime()
    : 0;
  const expiresInMs = expiresAt - Date.now();

  if (expiresInMs < REFRESH_WINDOW_MS) {
    await refreshConnection({
      connectionId: connection.id,
      refreshSecretId: connection.refresh_token_secret,
      accessSecretId: connection.access_token_secret,
    });
  }

  const accessToken = await readTokenFromVault(connection.access_token_secret);

  return {
    portalId: connection.portal_id,
    fetch: (path, init) => hubspotFetch(accessToken, path, init),
  };
}

async function refreshConnection(params: {
  connectionId: string;
  refreshSecretId: string;
  accessSecretId: string;
}): Promise<void> {
  const refreshToken = await readTokenFromVault(params.refreshSecretId);

  let next;
  try {
    next = await refreshAccessToken(refreshToken);
  } catch (err) {
    // Refresh token rejected. Flag the connection so the UI can prompt for
    // reconnection. We still throw so the caller can short-circuit.
    const admin = createServiceClient();
    await admin
      .from("hubspot_connections")
      .update({ needs_reconnect: true })
      .eq("id", params.connectionId);
    throw err;
  }

  await Promise.all([
    updateTokenInVault(params.accessSecretId, next.access_token),
    updateTokenInVault(params.refreshSecretId, next.refresh_token),
  ]);

  const admin = createServiceClient();
  await admin
    .from("hubspot_connections")
    .update({
      token_expires_at: new Date(
        Date.now() + next.expires_in * 1000
      ).toISOString(),
    })
    .eq("id", params.connectionId);
}

async function hubspotFetch(
  accessToken: string,
  path: string,
  init?: RequestInit
): Promise<Response> {
  const url = path.startsWith("http") ? path : `${HUBSPOT_API_BASE}${path}`;
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const doFetch = () => fetch(url, { ...init, headers });

  let res = await doFetch();

  if (res.status === 429) {
    const retryAfter = parseRetryAfter(res.headers.get("Retry-After"));
    await sleep(retryAfter);
    res = await doFetch();
    if (res.status === 429) {
      throw new HubSpotRateLimitError(retryAfter);
    }
  }

  return res;
}

function parseRetryAfter(header: string | null): number {
  if (!header) return 1000;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.min(seconds * 1000, 10_000);
  }
  return 1000;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

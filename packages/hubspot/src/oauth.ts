import { z } from "zod";

const AUTH_HOST = "https://app.hubspot.com";
const API_HOST = "https://api.hubapi.com";

const DEFAULT_SCOPES = [
  "oauth",
  "crm.objects.contacts.read",
  "crm.objects.contacts.write",
  "crm.objects.notes.read",
  "crm.objects.notes.write",
  "crm.schemas.contacts.read",
] as const;

const TokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  token_type: z.literal("bearer").optional(),
});

const TokenInfoSchema = z.object({
  user: z.string().optional(),
  hub_id: z.number(),
  app_id: z.number().optional(),
  expires_in: z.number().optional(),
  user_id: z.number().optional(),
  scopes: z.array(z.string()).optional(),
});

export interface HubspotOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes?: readonly string[];
}

export interface HubspotTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  hubId: string;
  scopes: string[];
}

export function buildAuthorizationUrl(config: HubspotOAuthConfig, state: string): string {
  const scopes = (config.scopes ?? DEFAULT_SCOPES).join(" ");
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: scopes,
    state,
  });
  return `${AUTH_HOST}/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string,
  config: HubspotOAuthConfig,
): Promise<HubspotTokens> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    code,
  });

  const response = await fetch(`${API_HOST}/oauth/v1/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new HubspotOAuthError(
      `HubSpot token exchange failed (${response.status}): ${text}`,
      response.status,
    );
  }

  const parsed = TokenResponseSchema.parse(await response.json());
  const info = await introspectAccessToken(parsed.access_token);

  return {
    accessToken: parsed.access_token,
    refreshToken: parsed.refresh_token,
    expiresAt: new Date(Date.now() + parsed.expires_in * 1000),
    hubId: String(info.hub_id),
    scopes: info.scopes ?? [],
  };
}

export async function refreshAccessToken(
  refreshToken: string,
  config: HubspotOAuthConfig,
): Promise<Omit<HubspotTokens, "hubId" | "scopes">> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
  });

  const response = await fetch(`${API_HOST}/oauth/v1/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new HubspotOAuthError(
      `HubSpot token refresh failed (${response.status}): ${text}`,
      response.status,
    );
  }

  const parsed = TokenResponseSchema.parse(await response.json());
  return {
    accessToken: parsed.access_token,
    refreshToken: parsed.refresh_token,
    expiresAt: new Date(Date.now() + parsed.expires_in * 1000),
  };
}

export async function introspectAccessToken(accessToken: string) {
  const response = await fetch(
    `${API_HOST}/oauth/v1/access-tokens/${encodeURIComponent(accessToken)}`,
  );
  if (!response.ok) {
    const text = await response.text();
    throw new HubspotOAuthError(
      `HubSpot token introspection failed (${response.status}): ${text}`,
      response.status,
    );
  }
  return TokenInfoSchema.parse(await response.json());
}

export class HubspotOAuthError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "HubspotOAuthError";
  }
}

export { DEFAULT_SCOPES };

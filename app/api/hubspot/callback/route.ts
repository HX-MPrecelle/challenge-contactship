import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  exchangeCodeForTokens,
  inspectAccessToken,
  storeTokenInVault,
  updateTokenInVault,
} from "@/lib/hubspot/oauth";

const STATE_COOKIE = "hs_oauth_state";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const hubspotError = searchParams.get("error");

  if (hubspotError) {
    return NextResponse.redirect(
      new URL(
        `/onboarding?error=${encodeURIComponent(hubspotError)}`,
        origin
      )
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/onboarding?error=missing-code", origin)
    );
  }

  const expectedState = request.cookies.get(STATE_COOKIE)?.value;
  if (!expectedState || expectedState !== state) {
    return NextResponse.redirect(
      new URL("/onboarding?error=state-mismatch", origin)
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  const orgId = user.app_metadata?.org_id as string | undefined;
  if (!orgId) {
    return NextResponse.redirect(
      new URL("/login?error=no-org", origin)
    );
  }

  try {
    const tokens = await exchangeCodeForTokens(
      code,
      process.env.HUBSPOT_REDIRECT_URI!
    );
    const info = await inspectAccessToken(tokens.access_token);

    const admin = createServiceClient();

    // Re-OAuth flow: if a connection already exists, rotate the values
    // behind its existing Vault secret IDs instead of minting new ones.
    // vault.secrets has a UNIQUE constraint on name, so create_secret with
    // the same label fails the second time around.
    const { data: existingConnection } = await admin
      .from("hubspot_connections")
      .select("access_token_secret, refresh_token_secret")
      .eq("org_id", orgId)
      .maybeSingle();

    let accessSecretId: string;
    let refreshSecretId: string;

    if (
      existingConnection?.access_token_secret &&
      existingConnection.refresh_token_secret
    ) {
      await Promise.all([
        updateTokenInVault(
          existingConnection.access_token_secret,
          tokens.access_token
        ),
        updateTokenInVault(
          existingConnection.refresh_token_secret,
          tokens.refresh_token
        ),
      ]);
      accessSecretId = existingConnection.access_token_secret;
      refreshSecretId = existingConnection.refresh_token_secret;
    } else {
      [accessSecretId, refreshSecretId] = await Promise.all([
        storeTokenInVault(tokens.access_token, `hubspot:access:org:${orgId}`),
        storeTokenInVault(tokens.refresh_token, `hubspot:refresh:org:${orgId}`),
      ]);
    }

    const { error: upsertError } = await admin
      .from("hubspot_connections")
      .upsert(
        {
          org_id: orgId,
          portal_id: String(info.hub_id),
          portal_name: info.hub_domain ?? null,
          access_token_secret: accessSecretId,
          refresh_token_secret: refreshSecretId,
          token_expires_at: new Date(
            Date.now() + tokens.expires_in * 1000
          ).toISOString(),
          scopes: info.scopes,
          connected_by: user.id,
          connected_at: new Date().toISOString(),
          needs_reconnect: false,
        },
        { onConflict: "org_id" }
      );

    if (upsertError) {
      console.error("[hubspot/callback] upsert failed", upsertError);
      return NextResponse.redirect(
        new URL("/onboarding?error=persist-failed", origin)
      );
    }
  } catch (error) {
    console.error("[hubspot/callback] OAuth flow failed", error);
    return NextResponse.redirect(
      new URL("/onboarding?error=oauth-failed", origin)
    );
  }

  const response = NextResponse.redirect(
    new URL("/onboarding?step=3", origin)
  );
  response.cookies.delete(STATE_COOKIE);
  return response;
}

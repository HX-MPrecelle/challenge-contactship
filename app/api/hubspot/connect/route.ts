import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

const HUBSPOT_AUTHORIZE_URL = "https://app.hubspot.com/oauth/authorize";
const REQUIRED_SCOPES = [
  "oauth",
  "crm.objects.contacts.read",
  "crm.objects.contacts.write",
];

const STATE_COOKIE = "hs_oauth_state";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // CSRF token. We hand it to HubSpot via `state` and store the same value
  // in an httpOnly cookie; the callback rejects mismatches.
  const state = randomBytes(24).toString("hex");

  const authorizeUrl = new URL(HUBSPOT_AUTHORIZE_URL);
  authorizeUrl.searchParams.set("client_id", process.env.HUBSPOT_CLIENT_ID!);
  authorizeUrl.searchParams.set("scope", REQUIRED_SCOPES.join(" "));
  authorizeUrl.searchParams.set(
    "redirect_uri",
    process.env.HUBSPOT_REDIRECT_URI!
  );
  authorizeUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set({
    name: STATE_COOKIE,
    value: state,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });
  return response;
}

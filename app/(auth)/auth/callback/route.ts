import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { bootstrapOrgForUser } from "@/lib/auth/org";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next");

  if (!tokenHash || !type) {
    return NextResponse.redirect(
      new URL(`/login?error=missing-token`, origin)
    );
  }

  const supabase = await createClient();

  // verifyOtp accepts the token_hash for email confirmation links. After
  // success the user session is set in cookies — the next call to getUser()
  // returns the freshly-authenticated user.
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: type as "email" | "magiclink" | "signup" | "recovery" | "invite",
    token_hash: tokenHash,
  });

  if (verifyError) {
    console.error("[auth/callback] verifyOtp failed", verifyError);
    return NextResponse.redirect(
      new URL(`/login?error=verify-failed`, origin)
    );
  }

  const {
    data: { user },
    error: getUserError,
  } = await supabase.auth.getUser();

  if (getUserError || !user) {
    console.error("[auth/callback] getUser failed", getUserError);
    return NextResponse.redirect(
      new URL(`/login?error=no-user`, origin)
    );
  }

  let bootstrap;
  try {
    bootstrap = await bootstrapOrgForUser(user);
  } catch (error) {
    console.error("[auth/callback] bootstrapOrgForUser failed", error);
    return NextResponse.redirect(
      new URL(`/login?error=org-bootstrap-failed`, origin)
    );
  }

  // Default destination depends on onboarding state; respect ?next= if the
  // middleware sent the user here from a protected route, but only when the
  // org is already onboarded — otherwise drag them through onboarding first.
  const fallback = bootstrap.onboardingComplete ? "/contacts" : "/onboarding";
  const destination = bootstrap.onboardingComplete && next ? next : fallback;

  return NextResponse.redirect(new URL(destination, origin));
}

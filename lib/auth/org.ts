import "server-only";
import type { User } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/server";

const PUBLIC_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "yahoo.com",
  "icloud.com",
  "me.com",
  "proton.me",
  "protonmail.com",
  "aol.com",
  "msn.com",
  "yandex.com",
  "duck.com",
]);

export type BootstrapResult = {
  orgId: string;
  onboardingComplete: boolean;
};

/**
 * Resolve the organization for a freshly-authenticated user.
 *
 * On first login the JWT has no org_id, so we attach one before any RLS-gated
 * read can run. Auto-join by email domain links coworkers of a company that
 * already onboarded; users on public email providers always get their own org
 * (otherwise the first Gmail user would silently absorb every other Gmail user
 * into their workspace). Uses the service-role client because the user has no
 * org_id yet — they would be invisible to the user-scoped client under RLS.
 */
export async function bootstrapOrgForUser(user: User): Promise<BootstrapResult> {
  const existingOrgId = user.user_metadata?.org_id as string | undefined;
  if (existingOrgId) {
    return {
      orgId: existingOrgId,
      onboardingComplete: Boolean(user.user_metadata?.onboarding_complete),
    };
  }

  if (!user.email) {
    throw new Error("Cannot bootstrap org for user without an email address");
  }

  const domain = user.email.split("@")[1]?.toLowerCase();
  if (!domain) {
    throw new Error(`Cannot parse domain from email: ${user.email}`);
  }

  const admin = createServiceClient();
  const isPublicDomain = PUBLIC_EMAIL_DOMAINS.has(domain);

  // Try to attach to an existing org for the same company domain.
  if (!isPublicDomain) {
    const { data: existing, error: lookupError } = await admin
      .from("organizations")
      .select("id")
      .eq("email_domain", domain)
      .maybeSingle();

    if (lookupError) {
      throw new Error(`Failed to look up organization: ${lookupError.message}`);
    }

    if (existing) {
      await persistOrgIdOnUser(user.id, existing.id, false);
      return { orgId: existing.id, onboardingComplete: false };
    }
  }

  // Fresh organization. Public-domain users get an empty email_domain so they
  // do not vacuum up coworkers of unrelated Gmail accounts.
  const { data: created, error: insertError } = await admin
    .from("organizations")
    .insert({
      name: domain,
      email_domain: isPublicDomain ? null : domain,
    })
    .select("id")
    .single();

  if (insertError || !created) {
    throw new Error(
      `Failed to create organization: ${insertError?.message ?? "no row returned"}`
    );
  }

  await persistOrgIdOnUser(user.id, created.id, false);
  return { orgId: created.id, onboardingComplete: false };
}

async function persistOrgIdOnUser(
  userId: string,
  orgId: string,
  onboardingComplete: boolean
): Promise<void> {
  const admin = createServiceClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: {
      org_id: orgId,
      onboarding_complete: onboardingComplete,
    },
  });
  if (error) {
    throw new Error(`Failed to persist org_id on user: ${error.message}`);
  }
}

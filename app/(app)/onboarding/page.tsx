import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingStepper } from "@/components/onboarding/OnboardingStepper";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ step?: string; error?: string }>;
};

export default async function OnboardingPage({ searchParams }: Props) {
  const params = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const orgId = (user.app_metadata?.org_id ?? user.user_metadata?.org_id) as string | undefined;
  if (!orgId) redirect("/login?error=no-org");

  if (user.user_metadata?.onboarding_complete) {
    redirect("/contacts");
  }

  const [{ data: org }, { data: connection }] = await Promise.all([
    supabase.from("organizations").select("name, industry").eq("id", orgId).maybeSingle(),
    supabase
      .from("hubspot_connections")
      .select("portal_id, portal_name, connected_at, needs_reconnect")
      .eq("org_id", orgId)
      .maybeSingle(),
  ]);

  const requestedStep = Number(params.step);
  const initialStep = Number.isFinite(requestedStep) && requestedStep >= 1 && requestedStep <= 5
    ? requestedStep
    : connection
      ? 4
      : 1;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
      <OnboardingStepper
        initialStep={initialStep}
        initialOrgName={org?.name ?? ""}
        initialIndustry={org?.industry ?? null}
        hubspotConnected={Boolean(connection) && !connection?.needs_reconnect}
        hubspotPortalName={connection?.portal_name ?? null}
        orgId={orgId}
        callbackError={params.error}
      />
    </main>
  );
}

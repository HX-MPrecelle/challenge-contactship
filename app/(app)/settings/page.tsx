import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n/server";
import { BackButton } from "@/components/layout/BackButton";
import { SyncHealthPanel } from "@/components/sync/SyncHealthPanel";
import { SettingsTabs } from "@/components/settings/SettingsTabs";
import { DENSITY_COOKIE, getDensityFromCookieValue } from "@/lib/preferences";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const density = getDensityFromCookieValue(cookieStore.get(DENSITY_COOKIE)?.value);

  const supabase = await createClient();
  const { t } = await getServerT();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const orgId = (user.app_metadata?.org_id ?? user.user_metadata?.org_id) as string | undefined;
  if (!orgId) redirect("/login?error=no-org");

  const [{ data: org }, { data: connection }, { count: contactCount }] =
    await Promise.all([
      supabase
        .from("organizations")
        .select("name, email_domain, industry")
        .eq("id", orgId)
        .maybeSingle(),
      supabase
        .from("hubspot_connections")
        .select("portal_id, portal_name, scopes, connected_at, last_synced_at, needs_reconnect")
        .eq("org_id", orgId)
        .maybeSingle(),
      supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId),
    ]);

  return (
    <main className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-8">
      <BackButton />
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text-primary">{t("settings.title")}</h1>
        <p className="mt-1 text-sm text-text-secondary">{t("settings.subtitle")}</p>
      </div>

      <SettingsTabs
        org={org ?? null}
        connection={connection ?? null}
        contactCount={contactCount ?? 0}
        userEmail={user.email}
        density={density}
        syncContent={<SyncHealthPanel orgId={orgId} />}
      />
    </main>
  );
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConflictsInbox } from "@/components/conflicts/ConflictsInbox";
import { BackButton } from "@/components/layout/BackButton";
import { getServerT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function ConflictsPage() {
  const supabase = await createClient();
  const { t } = await getServerT();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const orgId = (user.app_metadata?.org_id ?? user.user_metadata?.org_id) as string | undefined;
  if (!orgId) redirect("/login?error=no-org");

  const { data: contacts } = await supabase
    .from("contacts")
    .select(
      "id, first_name, last_name, email, company, job_title, local_updated_at"
    )
    .eq("org_id", orgId)
    .eq("sync_status", "conflict")
    .eq("is_archived", false)
    .order("local_updated_at", { ascending: false });

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <BackButton />
      <header className="pb-6">
        <h1 className="text-2xl font-semibold text-text-primary">{t("conflicts.title")}</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {t("conflicts.subtitle")}
        </p>
      </header>
      <ConflictsInbox
        initialContacts={contacts ?? []}
        orgId={orgId}
      />
    </main>
  );
}

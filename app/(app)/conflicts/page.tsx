import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConflictsInbox } from "@/components/conflicts/ConflictsInbox";
import { BackLink } from "@/components/layout/BackLink";

export const dynamic = "force-dynamic";

export default async function ConflictsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const orgId = user.user_metadata?.org_id as string | undefined;
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
      <BackLink />
      <header className="pb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Conflictos</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Contactos con datos divergentes entre ContactShip y HubSpot.
        </p>
      </header>
      <ConflictsInbox
        initialContacts={contacts ?? []}
        orgId={orgId}
      />
    </main>
  );
}

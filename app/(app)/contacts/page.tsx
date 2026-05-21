import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { ContactList } from "@/components/contacts/ContactList";
import { createClient } from "@/lib/supabase/server";
import { HubSpotSyncButton } from "./HubSpotSyncButton";
export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ status?: string }>;
};

const VALID_STATUSES = ["synced", "pending", "conflict", "error"] as const;
type SyncStatus = (typeof VALID_STATUSES)[number];

function parseStatus(input: string | undefined): SyncStatus | null {
  if (!input) return null;
  return (VALID_STATUSES as readonly string[]).includes(input)
    ? (input as SyncStatus)
    : null;
}

export default async function ContactsPage({ searchParams }: Props) {
  const { status } = await searchParams;
  const initialStatusFilter = parseStatus(status);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const orgId = user.user_metadata?.org_id as string | undefined;
  if (!orgId) redirect("/login?error=no-org");

  if (!user.user_metadata?.onboarding_complete) {
    redirect("/onboarding");
  }

  const { data: contacts, error } = await supabase
    .from("contacts")
    .select(
      "id, first_name, last_name, email, company, job_title, lifecycle_stage, country, sync_status, local_updated_at, is_archived, created_at, city, lead_status"
    )
    .eq("org_id", orgId)
    .eq("is_archived", false)
    .order("local_updated_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[contacts page]", error);
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <header className="flex items-center justify-between pb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-subtle text-brand">
            <Users size={18} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">
              Contactos
            </h1>
            <p className="text-sm text-text-secondary">
              Espejo en tiempo real de tu portal HubSpot.
            </p>
          </div>
        </div>
        <HubSpotSyncButton />
      </header>

      <ContactList
        initialContacts={contacts ?? []}
        orgId={orgId}
        initialStatusFilter={initialStatusFilter}
      />
    </main>
  );
}

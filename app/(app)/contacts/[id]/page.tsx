import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ConflictBanner } from "@/components/contacts/ConflictBanner";
import { ContactForm } from "@/components/contacts/ContactForm";
import { ContactTimeline } from "@/components/contacts/ContactTimeline";
import { SyncStatusBadge } from "@/components/contacts/SyncStatusBadge";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ContactDetailPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const orgId = user.user_metadata?.org_id as string | undefined;
  if (!orgId) redirect("/login?error=no-org");

  const { data: contact, error } = await supabase
    .from("contacts")
    .select(
      "id, hubspot_id, first_name, last_name, email, phone, company, job_title, lifecycle_stage, lead_status, website, city, country, sync_status, is_archived, hubspot_updated_at, local_updated_at, created_at"
    )
    .eq("id", id)
    .eq("org_id", orgId)
    .maybeSingle();

  if (error) {
    console.error("[contact detail]", error);
  }
  if (!contact) {
    notFound();
  }

  const { data: events } = await supabase
    .from("sync_events")
    .select("id, direction, event_type, created_at, error_message")
    .eq("org_id", orgId)
    .eq("contact_id", id)
    .order("created_at", { ascending: false })
    .limit(30);

  const fullName =
    [contact.first_name, contact.last_name].filter(Boolean).join(" ") ||
    "Sin nombre";

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <Link
        href="/contacts"
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft size={12} />
        Volver a contactos
      </Link>

      <header className="flex flex-col gap-4 pb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="font-heading text-3xl font-semibold text-text-primary">
              {fullName}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
              {contact.job_title && <span>{contact.job_title}</span>}
              {contact.job_title && contact.company && (
                <span className="text-text-muted">·</span>
              )}
              {contact.company && <span>{contact.company}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SyncStatusBadge status={contact.sync_status} />
            <span className="font-mono text-xs text-text-muted">
              HubSpot #{contact.hubspot_id}
            </span>
          </div>
        </div>

        {contact.is_archived && (
          <div className="rounded-lg border border-warning/40 bg-warning-subtle px-4 py-2.5 text-xs text-warning">
            Este contacto fue archivado desde HubSpot.
          </div>
        )}

        {contact.sync_status === "conflict" && (
          <ConflictBanner contactId={contact.id} />
        )}
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <section className="rounded-xl border border-border-default bg-bg-surface p-6">
            <h2 className="pb-4 font-heading text-lg font-semibold text-text-primary">
              Datos del contacto
            </h2>
            <ContactForm
              contactId={contact.id}
              initial={{
                firstName: contact.first_name,
                lastName: contact.last_name,
                email: contact.email,
                phone: contact.phone,
                company: contact.company,
                jobTitle: contact.job_title,
              }}
            />
          </section>

          <section className="rounded-xl border border-border-default bg-bg-surface p-6">
            <header className="flex items-baseline justify-between pb-4">
              <h2 className="font-heading text-lg font-semibold text-text-primary">
                Actividad
              </h2>
              <span className="font-mono text-xs text-text-muted">
                Último cambio:{" "}
                {new Date(contact.local_updated_at).toLocaleString("es-AR", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </span>
            </header>
            <ContactTimeline events={events ?? []} />
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          <section className="rounded-xl border border-border-default bg-bg-surface p-5">
            <h2 className="pb-3 font-heading text-sm font-semibold text-text-secondary uppercase tracking-wide">
              Metadata
            </h2>
            <dl className="flex flex-col gap-2 text-sm">
              <MetaRow label="Lifecycle stage" value={contact.lifecycle_stage} />
              <MetaRow label="Lead status" value={contact.lead_status} />
              <MetaRow label="País" value={contact.country} />
              <MetaRow label="Ciudad" value={contact.city} />
              <MetaRow label="Website" value={contact.website} mono />
            </dl>
          </section>

          {/* AI Insights panel lands in task 14 */}
        </aside>
      </div>
    </main>
  );
}

function MetaRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-xs text-text-muted">{label}</dt>
      <dd
        className={`text-right text-xs text-text-primary ${mono ? "font-mono" : ""}`}
      >
        {value ?? "—"}
      </dd>
    </div>
  );
}

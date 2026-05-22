import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AiInsightsPanel } from "@/components/contacts/AiInsightsPanel";
import { ConflictBanner } from "@/components/contacts/ConflictBanner";
import { ContactForm } from "@/components/contacts/ContactForm";
import { ContactTimeline } from "@/components/contacts/ContactTimeline";
import { SimilarContactsPanel } from "@/components/contacts/SimilarContactsPanel";
import { SyncStatusBadge } from "@/components/contacts/SyncStatusBadge";
import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ContactDetailPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const { t } = await getServerT();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const orgId = (user.app_metadata?.org_id ?? user.user_metadata?.org_id) as string | undefined;
  if (!orgId) redirect("/login?error=no-org");

  const { data: contact, error } = await supabase
    .from("contacts")
    .select(
      "id, hubspot_id, first_name, last_name, email, phone, company, job_title, lifecycle_stage, lead_status, website, city, country, sync_status, is_archived, hubspot_updated_at, local_updated_at, created_at, properties"
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
    t("misc.noName");

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      {/* Back navigation */}
      <Link
        href="/contacts"
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft size={12} />
        {t("contact.back")}
      </Link>

      {/* Hero — name + inline metadata strip */}
      <header className="flex flex-col gap-3 pb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-3xl font-semibold text-text-primary">{fullName}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
              {contact.job_title && <span>{contact.job_title}</span>}
              {contact.job_title && contact.company && <span className="text-text-muted">@</span>}
              {contact.company && <span className="font-medium text-text-primary">{contact.company}</span>}
            </div>
            {/* Metadata pills — moved from sidebar card + enriched from properties JSONB */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {contact.lifecycle_stage && (
                <span className="rounded-full bg-brand-subtle px-2 py-0.5 text-xs font-medium text-brand-on-subtle">
                  {contact.lifecycle_stage}
                </span>
              )}
              {contact.lead_status && (
                <span className="rounded-full border border-border-default bg-bg-subtle px-2 py-0.5 text-xs text-text-secondary">
                  {contact.lead_status}
                </span>
              )}
              {/* Industry and company size from properties JSONB */}
              {(contact.properties as Record<string, string | null> | null)?.industry && (
                <span className="rounded-full border border-border-default bg-bg-subtle px-2 py-0.5 text-xs text-text-secondary">
                  {(contact.properties as Record<string, string | null>).industry}
                </span>
              )}
              {(contact.properties as Record<string, string | null> | null)?.numemployees && (
                <span className="rounded-full border border-border-default bg-bg-subtle px-2 py-0.5 font-mono text-[10px] text-text-muted">
                  {(contact.properties as Record<string, string | null>).numemployees} {t("misc.employees")}
                </span>
              )}
              {contact.country && (
                <span className="rounded-full border border-border-default bg-bg-subtle px-2 py-0.5 text-xs text-text-secondary">
                  {contact.country}{contact.city ? ` · ${contact.city}` : ""}
                </span>
              )}
              {contact.website && (
                <a
                  href={contact.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-border-default bg-bg-subtle px-2 py-0.5 font-mono text-xs text-text-muted hover:text-brand"
                >
                  {contact.website.replace(/^https?:\/\//, "")}
                </a>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <SyncStatusBadge status={contact.sync_status} />
            <span className="font-mono text-[10px] text-text-muted">
              #{contact.hubspot_id}
            </span>
          </div>
        </div>

        {contact.is_archived && (
          <div className="rounded-lg border border-warning/40 bg-warning-subtle px-4 py-2.5 text-xs text-warning">
            {t("contacts.archived")}
          </div>
        )}
        {contact.sync_status === "conflict" && (
          <ConflictBanner contactId={contact.id} />
        )}
      </header>

      {/* Main grid: left = form + insights + similar | right = activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px] lg:items-start">
        {/* Left: the main content column */}
        <div className="flex flex-col gap-6">
          <section className="rounded-xl border border-border-default bg-bg-surface p-6">
            <h2 className="pb-4 text-lg font-semibold text-text-primary">
              {t("contact.section.data")}
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

          <AiInsightsPanel contactId={contact.id} />
          <SimilarContactsPanel contactId={contact.id} />
        </div>

        {/* Right: activity timeline — shorter when empty, doesn't inflate left */}
        <aside className="flex flex-col gap-6">
          <section className="rounded-xl border border-border-default bg-bg-surface p-6">
            <header className="flex items-baseline justify-between pb-4">
              <h2 className="text-base font-semibold text-text-primary">{t("contact.section.activity")}</h2>
              <span className="font-mono text-[10px] text-text-muted">
                {new Date(contact.local_updated_at).toLocaleString("es-AR", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </span>
            </header>
            <ContactTimeline events={events ?? []} />
          </section>
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

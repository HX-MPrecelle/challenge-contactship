"use client";

import { useState } from "react";
import { Activity, Bot, FileText, Users } from "lucide-react";
import { AiInsightsPanel } from "@/components/contacts/AiInsightsPanel";
import { SimilarContactsPanel } from "@/components/contacts/SimilarContactsPanel";
import { ContactNotes } from "@/components/contacts/ContactNotes";
import { ContactTimeline } from "@/components/contacts/ContactTimeline";
import { ContactProperties } from "@/components/contacts/ContactProperties";
import { ContactFormWrapper } from "@/components/contacts/ContactFormWrapper";

type SyncEvent = {
  id: string;
  direction: string;
  event_type: string;
  created_at: string;
  error_message: string | null;
};

type Props = {
  contactId: string;
  orgId: string;
  formKey: string;
  initial: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    company: string | null;
    jobTitle: string | null;
    message: string | null;
  };
  properties: Record<string, string | null> | null;
  events: SyncEvent[];
  userEmail: string | undefined;
  lastUpdatedAt: string;
};

type Tab = "datos" | "ia" | "notas" | "actividad";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "datos",     label: "Datos",      icon: <FileText size={14} /> },
  { id: "ia",        label: "IA",         icon: <Bot size={14} /> },
  { id: "notas",     label: "Notas",      icon: <Users size={14} /> },
  { id: "actividad", label: "Actividad",  icon: <Activity size={14} /> },
];

export function ContactDetailTabs({
  contactId, orgId, formKey, initial, properties, events, userEmail, lastUpdatedAt,
}: Props) {
  const [active, setActive] = useState<Tab>("datos");

  return (
    <div className="flex flex-col">
      {/* Tab bar */}
      <div className="flex border-b border-border-default mb-6">
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className={[
              "relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors",
              active === tab.id
                ? "text-text-primary after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-brand after:rounded-t-full"
                : "text-text-secondary hover:text-text-primary",
            ].join(" ")}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {active === "datos" && (
        <div className="flex flex-col gap-6">
          <section className="rounded-xl border border-border-default bg-bg-surface p-6">
            <h2 className="pb-4 text-base font-semibold text-text-primary">Datos del contacto</h2>
            <ContactFormWrapper
              contactId={contactId}
              orgId={orgId}
              formKey={formKey}
              initial={initial}
            />
          </section>
          <ContactProperties properties={properties} />
        </div>
      )}

      {active === "ia" && (
        <div className="flex flex-col gap-6">
          <AiInsightsPanel contactId={contactId} />
          <SimilarContactsPanel contactId={contactId} />
        </div>
      )}

      {active === "notas" && (
        <ContactNotes contactId={contactId} userEmail={userEmail} />
      )}

      {active === "actividad" && (
        <section className="rounded-xl border border-border-default bg-bg-surface p-6">
          <div className="flex items-baseline justify-between pb-4">
            <h2 className="text-base font-semibold text-text-primary">Actividad de sync</h2>
            <span className="font-mono text-[10px] text-text-muted" suppressHydrationWarning>
              {new Date(lastUpdatedAt).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}
            </span>
          </div>
          <ContactTimeline events={events} />
        </section>
      )}
    </div>
  );
}

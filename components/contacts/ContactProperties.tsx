"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { shouldIncludeProperty } from "@/lib/hubspot/properties";

// Common HubSpot field labels in Spanish. Custom fields not in this map
// fall back to a formatted version of the key name.
const FIELD_LABELS: Record<string, string> = {
  industry:              "Industria",
  numemployees:          "Empleados",
  annualrevenue:         "Facturación anual",
  hs_buying_role:        "Rol de compra",
  hs_analytics_source:   "Fuente de tráfico",
  hs_lead_status:        "Estado del lead",
  lifecyclestage:        "Etapa del ciclo",
  hs_email_optout:       "Email opt-out",
  hs_last_activity_type: "Última actividad",
  hs_sales_email_last_clicked: "Último click en email",
  hs_sales_email_last_opened:  "Último email abierto",
  hs_email_bounce:       "Email rebotado",
  recent_deal_amount:    "Monto deal reciente",
  recent_deal_close_date: "Cierre deal reciente",
  total_revenue:         "Facturación total",
  num_contacted_notes:   "Notas de contacto",
  hs_sequences_is_enrolled: "En secuencia",
  notes_last_contacted:  "Último contacto",
  notes_last_updated:    "Notas actualizadas",
  closedate:             "Fecha de cierre",
  became_a_lead_date:    "Fecha lead",
  became_an_opportunity_date: "Fecha oportunidad",
  became_a_customer_date:     "Fecha cliente",
  hs_content_membership_status: "Estado membresía",
};

// Fields already displayed in the main form — exclude from JSONB panel
const MAIN_FORM_KEYS = new Set([
  "firstname", "lastname", "email", "phone", "company", "jobtitle", "message",
  "website", "city", "country",
]);

function formatKey(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  return key.replace(/^hs_/, "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function formatValue(key: string, value: string): string {
  if (key === "annualrevenue" || key === "recent_deal_amount" || key === "total_revenue") {
    const n = parseFloat(value);
    if (!isNaN(n)) return `$${n.toLocaleString("es-AR")}`;
  }
  if (key === "numemployees") {
    const n = parseInt(value);
    if (!isNaN(n)) return n.toLocaleString("es-AR") + " empleados";
  }
  return value;
}

type Props = {
  properties: Record<string, string | null> | null;
};

export function ContactProperties({ properties }: Props) {
  const [open, setOpen] = useState(false);

  if (!properties) return null;

  const entries = Object.entries(properties)
    .filter(([k, v]) => !MAIN_FORM_KEYS.has(k) && shouldIncludeProperty(k, v))
    .map(([k, v]) => ({ key: k, label: formatKey(k), value: formatValue(k, v!) }))
    .sort((a, b) => {
      // Known labels first
      const aKnown = !!FIELD_LABELS[a.key];
      const bKnown = !!FIELD_LABELS[b.key];
      if (aKnown && !bKnown) return -1;
      if (!aKnown && bKnown) return 1;
      return a.label.localeCompare(b.label);
    });

  if (entries.length === 0) return null;

  return (
    <section className="rounded-xl border border-border-default bg-bg-surface overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-bg-subtle transition-colors"
      >
        <div>
          <h2 className="text-base font-semibold text-text-primary">Datos del portal HubSpot</h2>
          <p className="text-xs text-text-muted mt-0.5">{entries.length} campos sincronizados</p>
        </div>
        {open ? <ChevronUp size={16} className="text-text-muted" /> : <ChevronDown size={16} className="text-text-muted" />}
      </button>

      {open && (
        <div className="border-t border-border-default px-6 py-4">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            {entries.map(({ key, label, value }) => (
              <div key={key} className="flex flex-col gap-0.5">
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{label}</dt>
                <dd className="text-sm text-text-primary break-words">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </section>
  );
}

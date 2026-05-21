import "server-only";
import type { HubSpotClient } from "@/lib/hubspot/client";

// ─── Filters for embedding inclusion ─────────────────────────────────────────
// These patterns identify HubSpot system/operational properties that carry no
// semantic signal for AI embeddings (IDs, binary payloads, internal counters).
// Everything else — including all custom customer fields — gets included.

const SKIP_PREFIXES = [
  "hs_object_", "hs_pipeline", "hs_sequence", "hs_conversation_",
  "hs_calculated_", "hs_predictive", "hs_avatar_", "hs_ip_",
  "hs_time_between", "hs_v2_", "hs_content_", "hs_merged_", "hs_testpurge",
  "hs_created_by", "hs_updated_by", "hs_all_", "hs_latest_source",
  "hs_sa_first_", "hs_form_", "hs_social_", "hs_document_",
];

const SKIP_EXACT = new Set([
  "hs_object_id", "createdate", "lastmodifieddate", "hs_lastmodifieddate",
  "hs_timestamp", "hs_additional_emails", "hubspot_owner_id",
  "hubspot_owner_assigneddate", "hubspot_team_id", "hs_email_bad_address",
  "hs_is_unworked", "hs_full_name", "associatedcompanyid",
]);

/** Returns true if a property value is meaningful for AI embeddings. */
export function shouldIncludeProperty(key: string, value: string | null | undefined): boolean {
  if (!value || value.trim() === "" || value === "0" || value === "false") return false;
  if (SKIP_EXACT.has(key)) return false;
  for (const prefix of SKIP_PREFIXES) {
    if (key.startsWith(prefix)) return false;
  }
  // Skip pure ID/timestamp fields
  if (/_(id|ids|at|date|time)$/.test(key) && /^\d+$/.test(value)) return false;
  return true;
}

// ─── Portal property definitions ─────────────────────────────────────────────

export type PortalProperties = {
  /** All property names to request from HubSpot contacts API */
  names: string[];
  /** Field name → human-readable label for embedding text */
  labels: Map<string, string>;
};

type HubSpotPropertyDef = {
  name: string;
  label: string;
  hubspotDefined: boolean;
  hidden: boolean;
  calculated: boolean;
  fieldType: string;
  type: string;
};

/**
 * Fetch ALL contact property definitions for this HubSpot portal.
 * Includes both built-in HubSpot properties AND every custom field the
 * customer has created. Called once per sync session, not per contact.
 *
 * Falls back to a hardcoded list if the API call fails so syncs never break.
 */
export async function getPortalContactProperties(
  client: HubSpotClient
): Promise<PortalProperties> {
  try {
    const res = await client.fetch("/crm/v3/properties/contacts?archived=false&limit=500");
    if (!res.ok) {
      console.warn("[getPortalContactProperties] API returned", res.status, "— using fallback");
      return buildFallback();
    }

    const json = (await res.json()) as { results?: HubSpotPropertyDef[] };
    const names: string[] = [];
    const labels = new Map<string, string>();

    for (const prop of json.results ?? []) {
      if (prop.hidden) continue;
      // Skip read-only computed fields (they change constantly and add noise)
      if (prop.fieldType === "calculation_read_only") continue;
      // Skip file/HTML fields (binary content, not useful for text embeddings)
      if (prop.type === "string" && prop.fieldType === "file") continue;
      if (prop.fieldType === "richtext") continue;

      names.push(prop.name);
      if (prop.label) labels.set(prop.name, prop.label);
    }

    console.log(
      `[getPortalContactProperties] portal has ${names.length} contact properties ` +
      `(${names.filter(n => !SKIP_EXACT.has(n)).length} usable for embeddings)`
    );

    return { names, labels };
  } catch (err) {
    console.error("[getPortalContactProperties]", err);
    return buildFallback();
  }
}

// ─── Fallback ─────────────────────────────────────────────────────────────────

function buildFallback(): PortalProperties {
  return {
    names: FALLBACK_PROPERTY_NAMES,
    labels: FALLBACK_LABELS,
  };
}

// Core set used if the Properties API is unavailable
const FALLBACK_PROPERTY_NAMES = [
  "firstname", "lastname", "email", "phone", "company", "jobtitle",
  "lifecyclestage", "hs_lead_status", "website", "city", "country",
  "industry", "numemployees", "annualrevenue",
  "hs_last_contacted", "hs_sales_email_last_replied",
  "hs_email_open_count", "notes_last_updated",
  "message", "hs_analytics_source", "hs_buying_role",
  "hs_lastmodifieddate", "createdate",
];

const FALLBACK_LABELS = new Map<string, string>([
  ["firstname", "Nombre"],
  ["lastname", "Apellido"],
  ["email", "Email"],
  ["phone", "Teléfono"],
  ["company", "Empresa"],
  ["jobtitle", "Cargo"],
  ["lifecyclestage", "Etapa del ciclo"],
  ["hs_lead_status", "Estado del lead"],
  ["website", "Sitio web"],
  ["city", "Ciudad"],
  ["country", "País"],
  ["industry", "Industria"],
  ["numemployees", "Empleados"],
  ["annualrevenue", "Facturación anual"],
  ["hs_last_contacted", "Último contacto"],
  ["hs_sales_email_last_replied", "Última respuesta"],
  ["hs_email_open_count", "Emails abiertos"],
  ["message", "Notas"],
  ["hs_analytics_source", "Fuente de origen"],
  ["hs_buying_role", "Rol de compra"],
]);

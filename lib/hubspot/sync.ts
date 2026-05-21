import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import type { HubSpotContact } from "@/lib/hubspot/contacts";

const CONFLICT_WINDOW_MS = 5 * 60 * 1000;

type AdminClient = SupabaseClient<Database>;

export type NormalizedContact = {
  hubspotId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  company: string | null;
  jobTitle: string | null;
  lifecycleStage: string | null;
  leadStatus: string | null;
  website: string | null;
  city: string | null;
  country: string | null;
  properties: Record<string, string | null>;
  hubspotUpdatedAt: string | null;
};

export type SyncOutcome =
  | { type: "created"; contactId: string; orgContact: NormalizedContact }
  | { type: "updated"; contactId: string; orgContact: NormalizedContact }
  | { type: "skipped"; reason: "duplicate" | "out_of_order" }
  | { type: "conflict"; contactId: string };

/**
 * Translate a HubSpot contact payload into our column layout. Anything we
 * don't promote to a typed column lives under `properties` so custom fields
 * round-trip without schema migrations.
 */
export function normalizeHubSpotContact(
  contact: HubSpotContact
): NormalizedContact {
  const p = contact.properties ?? {};
  return {
    hubspotId: contact.id,
    email: p.email ?? null,
    firstName: p.firstname ?? null,
    lastName: p.lastname ?? null,
    phone: p.phone ?? null,
    company: p.company ?? null,
    jobTitle: p.jobtitle ?? null,
    lifecycleStage: p.lifecyclestage ?? null,
    leadStatus: p.hs_lead_status ?? null,
    website: p.website ?? null,
    city: p.city ?? null,
    country: p.country ?? null,
    properties: { ...p },
    hubspotUpdatedAt: p.hs_lastmodifieddate ?? contact.updatedAt ?? null,
  };
}

/**
 * Deterministic SHA-256 hash of a contact's normalized properties. Used to
 * detect duplicate webhook deliveries — HubSpot guarantees at-least-once,
 * not exactly-once, so the same payload commonly arrives twice. Sorting
 * keys is non-negotiable: the hash must be stable across the order HubSpot
 * happens to put properties in.
 */
export function calculateSyncHash(
  properties: Record<string, string | null>
): string {
  const sorted = Object.keys(properties)
    .sort()
    .reduce<Record<string, string | null>>((acc, key) => {
      acc[key] = properties[key] ?? null;
      return acc;
    }, {});
  const hash = createHash("sha256");
  hash.update(JSON.stringify(sorted));
  return hash.digest("hex");
}

/**
 * Build the embeddable text representation for a contact.
 * Reads both promoted typed columns AND the raw `properties` JSONB so that
 * rich HubSpot data (industry, notes, engagement signals) improves semantic
 * search quality without requiring schema migrations for each new field.
 */
export function buildContactText(contact: NormalizedContact): string {
  const p = contact.properties ?? {};

  // Format a date string into a human-readable label (e.g. "hace 45 días").
  function daysAgo(iso: string | null | undefined): string | null {
    if (!iso) return null;
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    if (d < 0) return null;
    if (d === 0) return "hoy";
    if (d === 1) return "ayer";
    return `hace ${d} días`;
  }

  const lastContacted = daysAgo(p.hs_last_contacted ?? p.notes_last_updated);
  const lastReplied = daysAgo(p.hs_sales_email_last_replied);

  return [
    [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "Contact",
    contact.jobTitle && `Cargo: ${contact.jobTitle}`,
    contact.company && `Empresa: ${contact.company}`,
    // Industry — most impactful for AI clustering
    p.industry && `Industria: ${p.industry}`,
    // Company size
    p.numemployees && `Tamaño empresa: ${p.numemployees} empleados`,
    // Revenue
    p.annualrevenue && Number(p.annualrevenue) > 0
      && `Facturación anual: $${Number(p.annualrevenue).toLocaleString("es-AR")}`,
    contact.lifecycleStage && `Etapa: ${contact.lifecycleStage}`,
    contact.leadStatus && `Estado del lead: ${contact.leadStatus}`,
    p.hs_buying_role && `Rol de compra: ${p.hs_buying_role}`,
    contact.country && `País: ${contact.country}`,
    contact.email && `Email: ${contact.email}`,
    // Engagement recency signals
    lastContacted && `Último contacto: ${lastContacted}`,
    lastReplied && `Última respuesta: ${lastReplied}`,
    p.hs_email_open_count && Number(p.hs_email_open_count) > 0
      && `Emails abiertos: ${p.hs_email_open_count}`,
    // Lead source
    p.hs_analytics_source && `Fuente: ${p.hs_analytics_source}`,
    // Free-text notes — highest value for semantic search
    p.message && p.message.trim() && `Notas: ${p.message.trim().slice(0, 400)}`,
  ]
    .filter(Boolean)
    .join(". ");
}

/**
 * Upsert one HubSpot contact into the local mirror with the master-plan
 * sync semantics:
 *
 *   - duplicate (same sync_hash) → skip
 *   - out-of-order (hubspot_updated_at older than what we already stored) → skip
 *   - genuine concurrent edit (local touched in the last 5 min AND ahead of
 *     this event's HubSpot timestamp) → flag conflict, leave row untouched
 *   - everything else → upsert
 *
 * Every outcome (except duplicate) writes a sync_events row so the timeline
 * UI can replay history. Callers handle the embedding side-band: pass it
 * in via `embedding`, or leave the column null and let the chat path
 * backfill on demand.
 */
export async function upsertContactFromHubSpot(
  admin: AdminClient,
  orgId: string,
  contact: HubSpotContact,
  options?: { embedding?: number[] | null; direction?: "hubspot_to_local" | "local_to_hubspot" }
): Promise<SyncOutcome> {
  const direction = options?.direction ?? "hubspot_to_local";
  const normalized = normalizeHubSpotContact(contact);
  const incomingHash = calculateSyncHash(normalized.properties);

  const { data: existing, error: lookupError } = await admin
    .from("contacts")
    .select(
      "id, sync_hash, hubspot_updated_at, local_updated_at"
    )
    .eq("org_id", orgId)
    .eq("hubspot_id", normalized.hubspotId)
    .maybeSingle();

  if (lookupError) {
    throw new Error(
      `Failed to look up contact ${normalized.hubspotId}: ${lookupError.message}`
    );
  }

  const now = Date.now();
  const incomingTs = normalized.hubspotUpdatedAt
    ? new Date(normalized.hubspotUpdatedAt).getTime()
    : now;

  if (existing) {
    if (existing.sync_hash === incomingHash) {
      return { type: "skipped", reason: "duplicate" };
    }

    const storedTs = existing.hubspot_updated_at
      ? new Date(existing.hubspot_updated_at).getTime()
      : 0;
    if (storedTs && incomingTs < storedTs) {
      await logSyncEvent(admin, {
        orgId,
        contactId: existing.id,
        hubspotId: normalized.hubspotId,
        direction,
        eventType: "skip",
        afterState: serializeContact(normalized),
      });
      return { type: "skipped", reason: "out_of_order" };
    }

    const localTs = new Date(existing.local_updated_at).getTime();
    if (localTs > incomingTs && now - localTs < CONFLICT_WINDOW_MS) {
      await admin
        .from("contacts")
        .update({ sync_status: "conflict" })
        .eq("id", existing.id);
      await logSyncEvent(admin, {
        orgId,
        contactId: existing.id,
        hubspotId: normalized.hubspotId,
        direction,
        eventType: "conflict",
        afterState: serializeContact(normalized),
      });
      return { type: "conflict", contactId: existing.id };
    }
  }

  const row = buildUpsertRow(orgId, normalized, incomingHash, options?.embedding ?? undefined);
  const { data: upserted, error: upsertError } = await admin
    .from("contacts")
    .upsert(row, { onConflict: "org_id,hubspot_id" })
    .select("id")
    .single();

  if (upsertError || !upserted) {
    throw new Error(
      `Failed to upsert contact ${normalized.hubspotId}: ${upsertError?.message ?? "no row"}`
    );
  }

  await logSyncEvent(admin, {
    orgId,
    contactId: upserted.id,
    hubspotId: normalized.hubspotId,
    direction,
    eventType: existing ? "update" : "create",
    afterState: serializeContact(normalized),
  });

  return existing
    ? { type: "updated", contactId: upserted.id, orgContact: normalized }
    : { type: "created", contactId: upserted.id, orgContact: normalized };
}

/**
 * Mark a contact as archived without erasing it. HubSpot deletion is the
 * trigger; we keep history (sync_events, AI insights) so the timeline and
 * audit log remain intact. The contacts list filters is_archived=false.
 */
export async function archiveContact(
  admin: AdminClient,
  orgId: string,
  hubspotId: string
): Promise<void> {
  const { data: existing } = await admin
    .from("contacts")
    .select("id")
    .eq("org_id", orgId)
    .eq("hubspot_id", hubspotId)
    .maybeSingle();

  if (!existing) return;

  await admin
    .from("contacts")
    .update({ is_archived: true })
    .eq("id", existing.id);

  await logSyncEvent(admin, {
    orgId,
    contactId: existing.id,
    hubspotId,
    direction: "hubspot_to_local",
    eventType: "delete",
  });
}

function buildUpsertRow(
  orgId: string,
  c: NormalizedContact,
  syncHash: string,
  embedding: number[] | undefined
): Database["public"]["Tables"]["contacts"]["Insert"] {
  const row: Database["public"]["Tables"]["contacts"]["Insert"] = {
    org_id: orgId,
    hubspot_id: c.hubspotId,
    email: c.email,
    first_name: c.firstName,
    last_name: c.lastName,
    phone: c.phone,
    company: c.company,
    job_title: c.jobTitle,
    lifecycle_stage: c.lifecycleStage,
    lead_status: c.leadStatus,
    website: c.website,
    city: c.city,
    country: c.country,
    properties: c.properties,
    hubspot_updated_at: c.hubspotUpdatedAt,
    local_updated_at: new Date().toISOString(),
    sync_hash: syncHash,
    sync_status: "synced",
    is_archived: false,
  };
  if (embedding) {
    // The Supabase typings expose pgvector as `string | null`. The client
    // serializes a number[] into the pgvector wire format automatically.
    (row as Record<string, unknown>).embedding = embedding;
  }
  return row;
}

async function logSyncEvent(
  admin: AdminClient,
  event: {
    orgId: string;
    contactId: string | null;
    hubspotId: string | null;
    direction: "hubspot_to_local" | "local_to_hubspot";
    eventType: "create" | "update" | "delete" | "conflict" | "skip";
    beforeState?: Json;
    afterState?: Json;
    errorMessage?: string;
  }
): Promise<void> {
  const { error } = await admin.from("sync_events").insert({
    org_id: event.orgId,
    contact_id: event.contactId,
    hubspot_id: event.hubspotId,
    direction: event.direction,
    event_type: event.eventType,
    before_state: event.beforeState ?? null,
    after_state: event.afterState ?? null,
    error_message: event.errorMessage ?? null,
  });
  if (error) {
    // sync_events is best-effort: a missed audit row should not block
    // the contact upsert. Log and move on.
    console.error("[logSyncEvent]", error);
  }
}

function serializeContact(c: NormalizedContact): Json {
  return {
    hubspot_id: c.hubspotId,
    email: c.email,
    first_name: c.firstName,
    last_name: c.lastName,
    phone: c.phone,
    company: c.company,
    job_title: c.jobTitle,
    lifecycle_stage: c.lifecycleStage,
    lead_status: c.leadStatus,
    website: c.website,
    city: c.city,
    country: c.country,
    hubspot_updated_at: c.hubspotUpdatedAt,
  };
}

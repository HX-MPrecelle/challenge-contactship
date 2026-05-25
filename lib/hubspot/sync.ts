import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import type { HubSpotContact } from "@/lib/hubspot/contacts";
import { shouldIncludeProperty } from "@/lib/hubspot/properties";

const CONFLICT_WINDOW_MS = 5 * 60 * 1000;

import {
  MERGE_FIELDS,
  type MergeField,
  type MergeState,
  getChangedFields,
  analyzeThreeWayMerge,
} from "@/lib/utils/3way-merge";

function toMergeState(c: NormalizedContact): MergeState {
  return {
    first_name: c.firstName,
    last_name:  c.lastName,
    email:      c.email,
    phone:      c.phone,
    company:    c.company,
    job_title:  c.jobTitle,
  };
}

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
 *
 * Fully dynamic: reads ALL fields from the `properties` JSONB (which stores
 * everything fetched from HubSpot, including custom portal fields) and filters
 * out system/operational properties that add noise. This means new HubSpot
 * custom fields automatically appear in embeddings without code changes.
 *
 * @param contact    Normalized contact record
 * @param labels     Optional field-name → human-readable label map from
 *                   getPortalContactProperties(). When present, makes the
 *                   embedding text much more readable for the AI model.
 */
export function buildContactText(
  contact: NormalizedContact,
  labels?: Map<string, string>
): string {
  const p = contact.properties ?? {};
  const parts: string[] = [];
  const used = new Set<string>();

  // ── 1. Name always leads ──────────────────────────────────────────────────
  const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "Contact";
  parts.push(name);
  used.add("firstname");
  used.add("lastname");

  // ── 2. All properties from JSONB — dynamic, covers custom fields ──────────
  // Sort so that "important" fields come first (shorter keys tend to be core).
  const entries = Object.entries(p).sort(([a], [b]) => a.length - b.length);

  for (const [key, value] of entries) {
    if (used.has(key)) continue;
    if (!shouldIncludeProperty(key, value)) continue;
    used.add(key);

    // Use human-readable label if available, otherwise format the key name
    const label = labels?.get(key) ?? key.replace(/_/g, " ");
    const val = String(value).trim();

    // Truncate very long free-text values to avoid bloating the embedding
    const truncated = val.length > 500 ? `${val.slice(0, 500)}…` : val;
    parts.push(`${label}: ${truncated}`);
  }

  return parts.join(". ");
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
      "id, sync_hash, hubspot_updated_at, local_updated_at, base_state, first_name, last_name, email, phone, company, job_title"
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

    const rawBase = existing.base_state as Record<string, string | null> | null;

    if (rawBase) {
      // ── 3-way merge ────────────────────────────────────────────────────────
      // We have a common ancestor (base_state). Compute what each side changed.
      const base: MergeState = {
        first_name: rawBase.first_name ?? null,
        last_name:  rawBase.last_name  ?? null,
        email:      rawBase.email      ?? null,
        phone:      rawBase.phone      ?? null,
        company:    rawBase.company    ?? null,
        job_title:  rawBase.job_title  ?? null,
      };

      const localState: MergeState = {
        first_name: (existing as Record<string, string | null>).first_name ?? null,
        last_name:  (existing as Record<string, string | null>).last_name  ?? null,
        email:      (existing as Record<string, string | null>).email      ?? null,
        phone:      (existing as Record<string, string | null>).phone      ?? null,
        company:    (existing as Record<string, string | null>).company    ?? null,
        job_title:  (existing as Record<string, string | null>).job_title  ?? null,
      };

      const hubspotState = toMergeState(normalized);
      const { trueConflicts, autoFromHubspot, hasConflict } =
        analyzeThreeWayMerge(base, localState, hubspotState);

      if (hasConflict) {
        // Flag the contact and store rich conflict metadata so the diff UI
        // can show base → local change AND base → HubSpot change per field.
        const conflictAfterState = Object.assign(
          {},
          serializeContact(normalized) as Record<string, unknown>,
          {
            base_state:         rawBase,
            conflict_fields:    [...trueConflicts],
            auto_merged_fields: [...autoFromHubspot],
          }
        );
        await admin.from("contacts").update({ sync_status: "conflict" }).eq("id", existing.id);
        await logSyncEvent(admin, {
          orgId, contactId: existing.id, hubspotId: normalized.hubspotId,
          direction, eventType: "conflict", afterState: conflictAfterState as Json,
        });
        return { type: "conflict", contactId: existing.id };
      }

      // No true conflicts — auto-merge: apply HubSpot's changes while
      // preserving any local edits to fields HubSpot didn't touch.
      const mergeRow = buildUpsertRow(orgId, normalized, incomingHash, options?.embedding ?? undefined);
      const { autoFromLocal } = analyzeThreeWayMerge(base, localState, hubspotState);
      for (const f of autoFromLocal) {
        // Keep local value — local edited this, HubSpot didn't
        (mergeRow as Record<string, unknown>)[f] = localState[f];
      }
      // Advance base_state to the new HubSpot values (merged state is now the new base)
      (mergeRow as Record<string, unknown>).base_state = hubspotState as unknown as Json;

      const { data: merged, error: mergeError } = await admin
        .from("contacts")
        .upsert(mergeRow, { onConflict: "org_id,hubspot_id" })
        .select("id")
        .single();
      if (mergeError || !merged) throw new Error(`auto-merge failed: ${mergeError?.message ?? "no row"}`);
      await logSyncEvent(admin, {
        orgId, contactId: merged.id, hubspotId: normalized.hubspotId,
        direction, eventType: "update", afterState: serializeContact(normalized),
      });
      return { type: "updated", contactId: merged.id, orgContact: normalized };
    }

    // ── Fallback: no base_state yet (contact predates this feature) ──────────
    // Use the original timestamp-based heuristic.
    const localTs = new Date(existing.local_updated_at).getTime();
    if (localTs > incomingTs && now - localTs < CONFLICT_WINDOW_MS) {
      await admin.from("contacts").update({ sync_status: "conflict" }).eq("id", existing.id);
      await logSyncEvent(admin, {
        orgId, contactId: existing.id, hubspotId: normalized.hubspotId,
        direction, eventType: "conflict", afterState: serializeContact(normalized),
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
    // Advance base_state on every successful sync so future 3-way diffs
    // have an accurate common ancestor.
    base_state: {
      first_name: c.firstName,
      last_name:  c.lastName,
      email:      c.email,
      phone:      c.phone,
      company:    c.company,
      job_title:  c.jobTitle,
    } as unknown as Json,
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

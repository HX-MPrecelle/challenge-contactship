"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getHubSpotClient } from "@/lib/hubspot/client";
import { getContact, updateContact as updateHubSpotContact } from "@/lib/hubspot/contacts";
import {
  buildContactText,
  normalizeHubSpotContact,
  upsertContactFromHubSpot,
} from "@/lib/hubspot/sync";
import { embedContacts } from "@/lib/ai/embeddings";
import { HubSpotAuthError, HubSpotRateLimitError } from "@/lib/errors";
import { after } from "next/server";
import { getPortalContactProperties } from "@/lib/hubspot/properties";

const UpdateContactSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string().max(120).optional().nullable(),
  lastName: z.string().max(120).optional().nullable(),
  email: z.string().email().max(254).optional().nullable(),
  phone: z.string().max(60).optional().nullable(),
  company: z.string().max(200).optional().nullable(),
  jobTitle: z.string().max(200).optional().nullable(),
  message: z.string().max(5000).optional().nullable(),
});

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

export async function updateContact(
  input: z.infer<typeof UpdateContactSchema>
): Promise<ActionResult<{ id: string }>> {
  const parsed = UpdateContactSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos inválidos", code: "VALIDATION_ERROR" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };

  const orgId = user.app_metadata?.org_id as string | undefined;
  if (!orgId) return { success: false, error: "Sin organización", code: "NO_ORG" };

  const { data: contactRow, error: lookupError } = await supabase
    .from("contacts")
    .select("hubspot_id")
    .eq("id", parsed.data.id)
    .eq("org_id", orgId)
    .maybeSingle();

  if (lookupError || !contactRow) {
    return { success: false, error: "Contacto no encontrado", code: "NOT_FOUND" };
  }

  const hubspotProps: Record<string, string> = {};
  if (parsed.data.firstName !== undefined) hubspotProps.firstname = parsed.data.firstName ?? "";
  if (parsed.data.lastName !== undefined) hubspotProps.lastname = parsed.data.lastName ?? "";
  if (parsed.data.email !== undefined) hubspotProps.email = parsed.data.email ?? "";
  if (parsed.data.phone !== undefined) hubspotProps.phone = parsed.data.phone ?? "";
  if (parsed.data.company !== undefined) hubspotProps.company = parsed.data.company ?? "";
  if (parsed.data.jobTitle !== undefined) hubspotProps.jobtitle = parsed.data.jobTitle ?? "";
  if (parsed.data.message !== undefined) hubspotProps.message = parsed.data.message ?? "";

  try {
    const client = await getHubSpotClient(orgId);
    await updateHubSpotContact(client, contactRow.hubspot_id, hubspotProps);

    // Pull the fresh state back so the local mirror reflects whatever HubSpot
    // canonicalized (e.g. normalized phone formatting).
    const fresh = await getContact(client, contactRow.hubspot_id);
    if (!fresh) {
      return { success: false, error: "HubSpot devolvió 404 tras actualizar", code: "HS_GONE" };
    }

    const admin = createServiceClient();
    const normalized = normalizeHubSpotContact(fresh);
    // Fetch portal properties to get labels for richer embedding text
    const portalProps = await getPortalContactProperties(client).catch(() => null);
    const text = buildContactText(normalized, portalProps?.labels);

    // Upsert immediately without embedding so the UI reflects the new data now.
    await upsertContactFromHubSpot(admin, orgId, fresh, {
      embedding: null,
      direction: "local_to_hubspot",
    });

    // Mark cached insights as stale so the next page visit regenerates them
    // with the contact's updated data rather than serving the 24h-old version.
    await admin
      .from("ai_insights")
      .update({ is_stale: true })
      .eq("contact_id", parsed.data.id)
      .eq("org_id", orgId);

    revalidatePath(`/contacts/${parsed.data.id}`);
    revalidatePath("/contacts");

    // Regenerate embedding in background — doesn't block the save response.
    after(async () => {
      const embeddings = await embedContacts([{ key: fresh.id, text }]);
      if (embeddings?.[0]) {
        await admin
          .from("contacts")
          .update({ embedding: embeddings[0].embedding as unknown as string })
          .eq("id", parsed.data.id)
          .eq("org_id", orgId);
      }
    });

    return { success: true, data: { id: parsed.data.id } };
  } catch (err) {
    if (err instanceof HubSpotRateLimitError) {
      return {
        success: false,
        error: "HubSpot rate limit. Intentá en unos segundos.",
        code: "RATE_LIMIT",
      };
    }
    if (err instanceof HubSpotAuthError) {
      return {
        success: false,
        error: "La conexión con HubSpot expiró. Reconectá tu cuenta.",
        code: "HS_AUTH_ERROR",
      };
    }
    console.error("[updateContact]", err);
    return {
      success: false,
      error: "Error inesperado al actualizar el contacto",
      code: "INTERNAL_ERROR",
    };
  }
}

const CONFLICT_FIELDS = [
  "first_name",
  "last_name",
  "email",
  "phone",
  "company",
  "job_title",
] as const;
export type ConflictField = (typeof CONFLICT_FIELDS)[number];

const HUBSPOT_PROP_MAP: Record<ConflictField, string> = {
  first_name: "firstname",
  last_name: "lastname",
  email: "email",
  phone: "phone",
  company: "company",
  job_title: "jobtitle",
};

export type ConflictDiffField = {
  field: ConflictField;
  label: string;
  base: string | null;        // common ancestor (last agreed state)
  local: string | null;       // current local value
  hubspot: string | null;     // rejected HubSpot value
  localChanged: boolean;      // local diverged from base
  hubspotChanged: boolean;    // hubspot diverged from base
  isConflict: boolean;        // true conflict: both sides changed this field
  differs: boolean;           // kept for backward compat
};

export type ConflictDiff = {
  contactId: string;
  hubspotId: string;
  detectedAt: string | null;
  fields: ConflictDiffField[];
  autoMergedFields: string[];  // fields that can be auto-merged (only one side changed)
  hasBaseState: boolean;       // whether 3-way diff is available
};

const FIELD_LABEL: Record<ConflictField, string> = {
  first_name: "Nombre",
  last_name: "Apellido",
  email: "Email",
  phone: "Teléfono",
  company: "Empresa",
  job_title: "Cargo",
};

const GetConflictDiffSchema = z.object({
  id: z.string().uuid(),
});

/**
 * Build the side-by-side diff payload for the conflict resolution UI.
 *
 * "Local" comes from the contacts row as it currently sits in our DB.
 * "HubSpot" comes from the most recent sync_events row of type 'conflict'
 * for this contact — that captures HubSpot's incoming state at the moment
 * we rejected the merge. We deliberately don't re-fetch from HubSpot here:
 * the user is resolving the specific conflict that was flagged, not
 * whatever might be in HubSpot right now.
 */
export async function getConflictDiff(
  input: z.infer<typeof GetConflictDiffSchema>
): Promise<ActionResult<ConflictDiff>> {
  const parsed = GetConflictDiffSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos inválidos", code: "VALIDATION_ERROR" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };

  const orgId = user.app_metadata?.org_id as string | undefined;
  if (!orgId) return { success: false, error: "Sin organización", code: "NO_ORG" };

  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .select("id, hubspot_id, first_name, last_name, email, phone, company, job_title")
    .eq("id", parsed.data.id)
    .eq("org_id", orgId)
    .maybeSingle();

  if (contactError || !contact) {
    return { success: false, error: "Contacto no encontrado", code: "NOT_FOUND" };
  }

  const { data: conflictEvent } = await supabase
    .from("sync_events")
    .select("after_state, created_at")
    .eq("org_id", orgId)
    .eq("contact_id", contact.id)
    .eq("event_type", "conflict")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const afterState = (conflictEvent?.after_state ?? {}) as Record<string, unknown>;
  const hubspotState = afterState as Record<string, string | null | undefined>;

  // Extract 3-way merge metadata stored by the enhanced conflict detection
  const rawBase = afterState.base_state as Record<string, string | null> | null ?? null;
  const autoMergedFields = (afterState.auto_merged_fields as string[] | undefined) ?? [];
  const hasBaseState = rawBase !== null;

  const fields: ConflictDiffField[] = CONFLICT_FIELDS.map((field) => {
    const base    = hasBaseState ? (rawBase[field] ?? null) : null;
    const local   = (contact[field] ?? null) as string | null;
    const hubspot = (hubspotState[field] ?? null) as string | null;
    const localChanged   = hasBaseState && (base ?? "") !== (local ?? "");
    const hubspotChanged = hasBaseState && (base ?? "") !== (hubspot ?? "");
    return {
      field,
      label: FIELD_LABEL[field],
      base,
      local,
      hubspot,
      localChanged,
      hubspotChanged,
      isConflict: localChanged && hubspotChanged,
      differs: (local ?? "") !== (hubspot ?? ""),
    };
  });

  return {
    success: true,
    data: {
      contactId: contact.id,
      hubspotId: contact.hubspot_id,
      detectedAt: conflictEvent?.created_at ?? null,
      fields,
      autoMergedFields,
      hasBaseState,
    },
  };
}

const FieldChoiceSchema = z.object({
  field: z.enum(CONFLICT_FIELDS),
  source: z.enum(["local", "hubspot"]),
});

const ResolveConflictMergeSchema = z.object({
  id: z.string().uuid(),
  choices: z.array(FieldChoiceSchema).min(1).max(CONFLICT_FIELDS.length),
});

/**
 * Cherry-pick which side wins for each field, push the merged record to
 * HubSpot, then pull it back to canonicalize. Net effect: sync_status flips
 * back to 'synced' with whatever the merged values were.
 *
 * The diff payload (from getConflictDiff) is the source of truth for the
 * HubSpot side; we don't re-read it here to keep the resolution stable —
 * if HubSpot has moved on since the diff was rendered, the next inbound
 * sync will produce a fresh conflict and the user resolves that one.
 */
export async function resolveConflictMerge(
  input: z.infer<typeof ResolveConflictMergeSchema>
): Promise<ActionResult<{ id: string }>> {
  const parsed = ResolveConflictMergeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos inválidos", code: "VALIDATION_ERROR" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };

  const orgId = user.app_metadata?.org_id as string | undefined;
  if (!orgId) return { success: false, error: "Sin organización", code: "NO_ORG" };

  const { data: row, error: lookupError } = await supabase
    .from("contacts")
    .select("id, hubspot_id, first_name, last_name, email, phone, company, job_title")
    .eq("id", parsed.data.id)
    .eq("org_id", orgId)
    .maybeSingle();

  if (lookupError || !row) {
    return { success: false, error: "Contacto no encontrado", code: "NOT_FOUND" };
  }

  const adminEarly = createServiceClient();
  const { data: conflictEvent } = await adminEarly
    .from("sync_events")
    .select("after_state")
    .eq("org_id", orgId)
    .eq("contact_id", row.id)
    .eq("event_type", "conflict")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const hubspotState = (conflictEvent?.after_state ?? {}) as Record<
    string,
    string | null | undefined
  >;

  const choicesByField = new Map(
    parsed.data.choices.map((c) => [c.field, c.source])
  );

  const mergedProps: Record<string, string> = {};
  for (const field of CONFLICT_FIELDS) {
    const source = choicesByField.get(field) ?? "local";
    const value =
      source === "hubspot"
        ? (hubspotState[field] ?? null)
        : (row[field] ?? null);
    mergedProps[HUBSPOT_PROP_MAP[field]] = value ?? "";
  }

  try {
    const client = await getHubSpotClient(orgId);
    await updateHubSpotContact(client, row.hubspot_id, mergedProps);

    const fresh = await getContact(client, row.hubspot_id);
    if (!fresh) {
      return { success: false, error: "HubSpot devolvió 404", code: "HS_GONE" };
    }

    const admin = createServiceClient();
    const normalized = normalizeHubSpotContact(fresh);
    const text = buildContactText(normalized);
    const embeddings = await embedContacts([{ key: fresh.id, text }]);
    await upsertContactFromHubSpot(admin, orgId, fresh, {
      embedding: embeddings?.[0]?.embedding,
      direction: "local_to_hubspot",
    });
    // Advance base_state to the resolved merged values so the next diff
    // has the correct common ancestor.
    await admin.from("contacts").update({
      base_state: {
        first_name: normalized.firstName,
        last_name:  normalized.lastName,
        email:      normalized.email,
        phone:      normalized.phone,
        company:    normalized.company,
        job_title:  normalized.jobTitle,
      },
    }).eq("id", row.id);

    await admin
      .from("contacts")
      .update({ sync_status: "synced" })
      .eq("id", row.id);

    revalidatePath(`/contacts/${row.id}`);
    revalidatePath("/contacts");

    return { success: true, data: { id: row.id } };
  } catch (err) {
    console.error("[resolveConflictMerge]", err);
    return {
      success: false,
      error: "No pudimos guardar el merge",
      code: "INTERNAL_ERROR",
    };
  }
}

const ResolveConflictSchema = z.object({
  id: z.string().uuid(),
  resolution: z.enum(["keep_local", "use_hubspot"]),
});

/**
 * Either push the local state back to HubSpot (keep_local) or pull HubSpot
 * over the local row (use_hubspot). Either way the resulting sync_status
 * goes back to 'synced'.
 */
export async function resolveConflict(
  input: z.infer<typeof ResolveConflictSchema>
): Promise<ActionResult<{ id: string }>> {
  const parsed = ResolveConflictSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos inválidos", code: "VALIDATION_ERROR" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };

  const orgId = user.app_metadata?.org_id as string | undefined;
  if (!orgId) return { success: false, error: "Sin organización", code: "NO_ORG" };

  const { data: row, error: lookupError } = await supabase
    .from("contacts")
    .select("id, hubspot_id, first_name, last_name, email, phone, company, job_title")
    .eq("id", parsed.data.id)
    .eq("org_id", orgId)
    .maybeSingle();

  if (lookupError || !row) {
    return { success: false, error: "Contacto no encontrado", code: "NOT_FOUND" };
  }

  try {
    const client = await getHubSpotClient(orgId);

    if (parsed.data.resolution === "keep_local") {
      const props: Record<string, string> = {
        firstname: row.first_name ?? "",
        lastname: row.last_name ?? "",
        email: row.email ?? "",
        phone: row.phone ?? "",
        company: row.company ?? "",
        jobtitle: row.job_title ?? "",
      };
      await updateHubSpotContact(client, row.hubspot_id, props);
    }

    const fresh = await getContact(client, row.hubspot_id);
    if (!fresh) {
      return { success: false, error: "HubSpot devolvió 404", code: "HS_GONE" };
    }

    const admin = createServiceClient();
    const text = buildContactText(normalizeHubSpotContact(fresh));
    const embeddings = await embedContacts([{ key: fresh.id, text }]);
    await upsertContactFromHubSpot(admin, orgId, fresh, {
      embedding: embeddings?.[0]?.embedding,
      direction:
        parsed.data.resolution === "keep_local" ? "local_to_hubspot" : "hubspot_to_local",
    });

    await admin
      .from("contacts")
      .update({ sync_status: "synced" })
      .eq("id", row.id);

    revalidatePath(`/contacts/${row.id}`);
    revalidatePath("/contacts");

    return { success: true, data: { id: row.id } };
  } catch (err) {
    console.error("[resolveConflict]", err);
    return {
      success: false,
      error: "No pudimos resolver el conflicto",
      code: "INTERNAL_ERROR",
    };
  }
}

const MergeContactsSchema = z.object({
  primaryId:   z.string().uuid(),
  secondaryId: z.string().uuid(),
});

/**
 * Merge two contacts: enriches the primary with any non-null fields from the
 * secondary, then archives the secondary. This is a local-only operation —
 * HubSpot has its own merge endpoint which would need a separate integration.
 */
export async function mergeContacts(
  input: z.infer<typeof MergeContactsSchema>
): Promise<ActionResult<{ id: string }>> {
  const parsed = MergeContactsSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Datos inválidos", code: "VALIDATION_ERROR" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };

  const orgId = user.app_metadata?.org_id as string | undefined;
  if (!orgId) return { success: false, error: "Sin organización", code: "NO_ORG" };

  const admin = createServiceClient();

  const [{ data: primary }, { data: secondary }] = await Promise.all([
    admin.from("contacts").select("*").eq("id", parsed.data.primaryId).eq("org_id", orgId).maybeSingle(),
    admin.from("contacts").select("*").eq("id", parsed.data.secondaryId).eq("org_id", orgId).maybeSingle(),
  ]);

  if (!primary || !secondary) {
    return { success: false, error: "Uno o ambos contactos no encontrados", code: "NOT_FOUND" };
  }

  // Enrich primary with non-null fields from secondary that are null in primary
  type ContactUpdate = {
    first_name?: string | null; last_name?: string | null; phone?: string | null;
    company?: string | null; job_title?: string | null; website?: string | null;
    city?: string | null; country?: string | null; properties?: import("@/types/database").Json;
  };
  const enrichedFields: ContactUpdate = {};
  const MERGEABLE = ["first_name", "last_name", "phone", "company", "job_title", "website", "city", "country"] as const;
  for (const field of MERGEABLE) {
    if (!primary[field] && secondary[field]) {
      (enrichedFields as Record<string, unknown>)[field] = secondary[field];
    }
  }

  // Merge properties JSONB: secondary fields that don't exist in primary
  const primaryProps = (primary.properties ?? {}) as Record<string, unknown>;
  const secondaryProps = (secondary.properties ?? {}) as Record<string, unknown>;
  enrichedFields.properties = { ...secondaryProps, ...primaryProps } as import("@/types/database").Json;

  await Promise.all([
    admin.from("contacts").update(enrichedFields).eq("id", parsed.data.primaryId),
    admin.from("contacts").update({ is_archived: true }).eq("id", parsed.data.secondaryId),
  ]);

  revalidatePath("/contacts");
  revalidatePath(`/contacts/${parsed.data.primaryId}`);
  return { success: true, data: { id: parsed.data.primaryId } };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRE-FLIGHT CONFLICT CHECK
// ═══════════════════════════════════════════════════════════════════════════════

export type PreflightField = {
  field: string;
  label: string;
  base: string | null;
  local: string | null;    // what the user is about to submit
  hubspot: string | null;  // what HubSpot has RIGHT NOW
  localChanged: boolean;
  hubspotChanged: boolean;
  isConflict: boolean;
};

export type PreflightResult = {
  hasChanges: boolean;           // any HubSpot-side changes detected
  trueConflicts: PreflightField[];   // same field changed on both sides
  hubspotOnly: PreflightField[];     // HubSpot changed, user didn't touch
  userOnly: PreflightField[];        // user changed, HubSpot didn't touch
};

const PREFLIGHT_FIELD_MAP: Record<string, string> = {
  first_name: "Nombre",   last_name: "Apellido",
  email:      "Email",    phone:     "Teléfono",
  company:    "Empresa",  job_title: "Cargo",
  message:    "Notas del CRM",
};
const PREFLIGHT_KEYS = Object.keys(PREFLIGHT_FIELD_MAP) as (keyof typeof PREFLIGHT_FIELD_MAP)[];

const CheckConflictSchema = z.object({
  contactId: z.string().uuid(),
  userValues: z.record(z.string(), z.union([z.string(), z.null()])),
});

/**
 * Fetch current HubSpot state before saving and compute a full 3-way diff
 * (base_state → local edit, base_state → HubSpot current) so the UI can
 * show the user exactly what changed on each side before committing.
 */
export async function checkConflictBeforeSave(
  input: z.infer<typeof CheckConflictSchema>
): Promise<ActionResult<PreflightResult>> {
  const parsed = CheckConflictSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Datos inválidos", code: "VALIDATION_ERROR" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };

  const orgId = user.app_metadata?.org_id as string | undefined;
  if (!orgId) return { success: false, error: "Sin organización", code: "NO_ORG" };

  // Fetch our stored base_state
  const admin = createServiceClient();
  const { data: contact } = await admin
    .from("contacts")
    .select("hubspot_id, base_state, first_name, last_name, email, phone, company, job_title, properties")
    .eq("id", parsed.data.contactId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (!contact) return { success: false, error: "Contacto no encontrado", code: "NOT_FOUND" };

  // Fetch live HubSpot state
  let hubspotContact;
  try {
    const client = await getHubSpotClient(orgId);
    hubspotContact = await getContact(client, contact.hubspot_id);
  } catch {
    // If HubSpot is unreachable, skip pre-flight and let the save proceed
    return { success: true, data: { hasChanges: false, trueConflicts: [], hubspotOnly: [], userOnly: [] } };
  }
  if (!hubspotContact) return { success: true, data: { hasChanges: false, trueConflicts: [], hubspotOnly: [], userOnly: [] } };

  const hsProps = hubspotContact.properties ?? {};
  const rawBase = contact.base_state as Record<string, string | null> | null;
  const localProps = contact.properties as Record<string, string | null> | null ?? {};

  const trueConflicts: PreflightField[] = [];
  const hubspotOnly: PreflightField[] = [];
  const userOnly: PreflightField[] = [];

  for (const f of PREFLIGHT_KEYS) {
    // Map to HubSpot property name
    const hsKey = f === "first_name" ? "firstname"
      : f === "last_name" ? "lastname"
      : f === "job_title" ? "jobtitle"
      : f;

    const base: string | null = rawBase ? (rawBase[f] ?? null) : (
      f === "message" ? (localProps.message ?? null) : ((contact as Record<string, string | null>)[f] ?? null)
    );
    const userVal: string | null = (parsed.data.userValues[f] as string | null | undefined) ?? null;
    const hsVal = (hsProps[hsKey] ?? null) as string | null;

    const localChanged = (base ?? "") !== (userVal ?? "");
    const hubspotChanged = (base ?? "") !== (hsVal ?? "");

    if (!localChanged && !hubspotChanged) continue; // no change on either side

    const item: PreflightField = {
      field: f,
      label: PREFLIGHT_FIELD_MAP[f] ?? f,
      base,
      local: userVal,
      hubspot: hsVal,
      localChanged,
      hubspotChanged,
      isConflict: localChanged && hubspotChanged,
    };

    if (item.isConflict) trueConflicts.push(item);
    else if (hubspotChanged) hubspotOnly.push(item);
    else userOnly.push(item);
  }

  return {
    success: true,
    data: {
      hasChanges: trueConflicts.length > 0 || hubspotOnly.length > 0,
      trueConflicts,
      hubspotOnly,
      userOnly,
    },
  };
}

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

const UpdateContactSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string().max(120).optional().nullable(),
  lastName: z.string().max(120).optional().nullable(),
  email: z.string().email().max(254).optional().nullable(),
  phone: z.string().max(60).optional().nullable(),
  company: z.string().max(200).optional().nullable(),
  jobTitle: z.string().max(200).optional().nullable(),
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

  const orgId = user.user_metadata?.org_id as string | undefined;
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
    const text = buildContactText(normalizeHubSpotContact(fresh));
    const embeddings = await embedContacts([{ key: fresh.id, text }]);
    await upsertContactFromHubSpot(admin, orgId, fresh, {
      embedding: embeddings?.[0]?.embedding,
      direction: "local_to_hubspot",
    });

    revalidatePath(`/contacts/${parsed.data.id}`);
    revalidatePath("/contacts");

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

  const orgId = user.user_metadata?.org_id as string | undefined;
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

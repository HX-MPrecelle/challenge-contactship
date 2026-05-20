"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getHubSpotClient } from "@/lib/hubspot/client";
import { countContacts, listContactsPage } from "@/lib/hubspot/contacts";
import {
  buildContactText,
  normalizeHubSpotContact,
  upsertContactFromHubSpot,
} from "@/lib/hubspot/sync";
import { embedContacts } from "@/lib/ai/embeddings";
import { HubSpotAuthError } from "@/lib/errors";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

const UpdateOrgNameSchema = z.object({
  name: z.string().min(1, "El nombre no puede estar vacío").max(120),
});

export async function updateOrganizationName(
  input: z.infer<typeof UpdateOrgNameSchema>
): Promise<ActionResult<{ name: string }>> {
  const parsed = UpdateOrgNameSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Nombre inválido",
      code: "VALIDATION_ERROR",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
  }

  const orgId = user.user_metadata?.org_id as string | undefined;
  if (!orgId) {
    return { success: false, error: "Sin organización", code: "NO_ORG" };
  }

  const { error } = await supabase
    .from("organizations")
    .update({ name: parsed.data.name })
    .eq("id", orgId);

  if (error) {
    console.error("[updateOrganizationName]", error);
    return {
      success: false,
      error: "No pudimos guardar el nombre",
      code: "INTERNAL_ERROR",
    };
  }

  revalidatePath("/onboarding");
  return { success: true, data: { name: parsed.data.name } };
}

const PreviewContactCountSchema = z.object({
  lifecycleStage: z.string().min(1).max(60).optional(),
});

export async function previewContactCount(
  input: z.infer<typeof PreviewContactCountSchema>
): Promise<ActionResult<{ total: number }>> {
  const parsed = PreviewContactCountSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Parámetros inválidos",
      code: "VALIDATION_ERROR",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
  }

  const orgId = user.user_metadata?.org_id as string | undefined;
  if (!orgId) {
    return { success: false, error: "Sin organización", code: "NO_ORG" };
  }

  try {
    const client = await getHubSpotClient(orgId);
    const total = await countContacts(client, {
      lifecycleStage: parsed.data.lifecycleStage,
    });
    return { success: true, data: { total } };
  } catch (error) {
    if (error instanceof HubSpotAuthError) {
      return {
        success: false,
        error: "La conexión con HubSpot expiró. Reconectá tu cuenta.",
        code: "HS_AUTH_ERROR",
      };
    }
    console.error("[previewContactCount]", error);
    return {
      success: false,
      error: "No pudimos consultar HubSpot",
      code: "INTERNAL_ERROR",
    };
  }
}

const ImportSelectionSchema = z.object({
  lifecycleStage: z.string().min(1).max(60).optional(),
});

export async function importContacts(
  input: z.infer<typeof ImportSelectionSchema>
): Promise<ActionResult<{ imported: number; conflicts: number }>> {
  const parsed = ImportSelectionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Filtro de import inválido",
      code: "VALIDATION_ERROR",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
  }

  const orgId = user.user_metadata?.org_id as string | undefined;
  if (!orgId) {
    return { success: false, error: "Sin organización", code: "NO_ORG" };
  }

  const admin = createServiceClient();
  const client = await getHubSpotClient(orgId).catch((err) => {
    console.error("[importContacts] HubSpot client unavailable", err);
    return null;
  });
  if (!client) {
    return {
      success: false,
      error: "La conexión con HubSpot expiró. Reconectá tu cuenta.",
      code: "HS_AUTH_ERROR",
    };
  }

  const channel = admin.channel(`sync:${orgId}`);
  await new Promise<void>((resolve, reject) => {
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") resolve();
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        reject(new Error(`Realtime channel ${status}`));
      }
    });
  }).catch((err) => {
    console.warn("[importContacts] could not open broadcast channel", err);
  });

  function broadcast(processed: number, total: number, status: "syncing" | "done" | "error") {
    channel.send({
      type: "broadcast",
      event: "progress",
      payload: { processed, total, status },
    });
  }

  try {
    const total = await countContacts(client, {
      lifecycleStage: parsed.data.lifecycleStage,
    });

    broadcast(0, total, "syncing");

    let processed = 0;
    let conflicts = 0;
    let cursor: string | undefined;

    do {
      const page = await listContactsPage(client, {
        after: cursor,
        limit: 100,
        lifecycleStage: parsed.data.lifecycleStage,
      });

      // Generate embeddings for the whole page in one OpenAI call. Returns
      // null if OPENAI_API_KEY isn't set, in which case the column stays
      // null and chat backfills lazily on first read.
      const embedInputs = page.results.map((c) => {
        const normalized = normalizeHubSpotContact(c);
        return { key: c.id, text: buildContactText(normalized) };
      });
      const embeddings = await embedContacts(embedInputs);
      const byKey = new Map<string, number[]>();
      if (embeddings) {
        for (const r of embeddings) byKey.set(r.key, r.embedding);
      }

      for (const contact of page.results) {
        try {
          const outcome = await upsertContactFromHubSpot(admin, orgId, contact, {
            embedding: byKey.get(contact.id) ?? null,
          });
          if (outcome.type === "conflict") conflicts++;
        } catch (err) {
          console.error(`[importContacts] upsert ${contact.id} failed`, err);
        }
        processed++;
      }

      broadcast(processed, total, "syncing");

      cursor = page.paging?.next?.after;
    } while (cursor);

    await admin
      .from("hubspot_connections")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("org_id", orgId);

    broadcast(processed, total, "done");
    await admin.removeChannel(channel);

    revalidatePath("/contacts");

    return { success: true, data: { imported: processed, conflicts } };
  } catch (err) {
    if (err instanceof HubSpotAuthError) {
      broadcast(0, 0, "error");
      await admin.removeChannel(channel);
      return {
        success: false,
        error: "La conexión con HubSpot expiró. Reconectá tu cuenta.",
        code: "HS_AUTH_ERROR",
      };
    }
    console.error("[importContacts]", err);
    broadcast(0, 0, "error");
    await admin.removeChannel(channel);
    return {
      success: false,
      error: "Falló la importación. Reintentá en unos segundos.",
      code: "INTERNAL_ERROR",
    };
  }
}

export async function markOnboardingComplete(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
  }

  const admin = createServiceClient();
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...user.user_metadata,
      onboarding_complete: true,
    },
  });

  if (error) {
    console.error("[markOnboardingComplete]", error);
    return {
      success: false,
      error: "No pudimos completar el onboarding",
      code: "INTERNAL_ERROR",
    };
  }

  return { success: true, data: undefined };
}

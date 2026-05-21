"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";

import { getHubSpotClient } from "@/lib/hubspot/client";
import { countContacts, listContactsPage } from "@/lib/hubspot/contacts";
import { upsertContactFromHubSpot } from "@/lib/hubspot/sync";
import { getPortalContactProperties } from "@/lib/hubspot/properties";
import { backfillMissingEmbeddings } from "@/lib/ai/embeddings";
import { HubSpotAuthError } from "@/lib/errors";
import { after } from "next/server";

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

  // Use service client — RLS may block user-scoped updates on the
  // organizations table if the policy wasn't set up with an UPDATE clause.
  const admin = createServiceClient();
  const { error } = await admin
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
  revalidatePath("/dashboard");
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

  // Realtime broadcast for progress is best-effort. If the WebSocket can't
  // open (most common cause of the action hanging), we still want the sync
  // itself to run — the user just won't see incremental progress until the
  // action resolves at the end. Hard cap at 5 seconds.
  const channel = admin.channel(`sync:${orgId}`);
  let channelOpen = false;
  await Promise.race([
    new Promise<void>((resolve, reject) => {
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channelOpen = true;
          resolve();
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          reject(new Error(`Realtime channel ${status}`));
        }
      });
    }),
    new Promise<void>((_, reject) =>
      setTimeout(
        () => reject(new Error("subscribe timeout (5s)")),
        5000
      )
    ),
  ]).catch((err) => {
    console.warn("[importContacts] broadcast disabled —", (err as Error).message);
  });

  function broadcast(processed: number, total: number, status: "syncing" | "done" | "error") {
    if (!channelOpen) return;
    channel.send({
      type: "broadcast",
      event: "progress",
      payload: { processed, total, status },
    });
  }

  try {
    console.log(`[importContacts] start orgId=${orgId}`);

    // Fetch all portal property definitions once before the import loop
    const portalProps = await getPortalContactProperties(client);
    console.log(`[importContacts] portal has ${portalProps.names.length} contact properties`);

    const total = await countContacts(client, {
      lifecycleStage: parsed.data.lifecycleStage,
    });
    console.log(`[importContacts] total=${total}`);

    broadcast(0, total, "syncing");

    let processed = 0;
    let conflicts = 0;
    let cursor: string | undefined;
    let pageIdx = 0;

    do {
      console.log(`[importContacts] fetching page ${++pageIdx} (cursor=${cursor ?? "—"})`);
      const page = await listContactsPage(client, {
        after: cursor,
        limit: 100,
        lifecycleStage: parsed.data.lifecycleStage,
        propertyNames: portalProps.names,
      });
      console.log(`[importContacts] page ${pageIdx} got ${page.results.length} contacts`);

      const upsertStart = Date.now();
      for (const contact of page.results) {
        try {
          // Upsert without embedding — embeddings generated in background
          // after the import completes so they don't block the sync loop.
          const outcome = await upsertContactFromHubSpot(admin, orgId, contact, {
            embedding: null,
          });
          if (outcome.type === "conflict") conflicts++;
        } catch (err) {
          console.error(`[importContacts] upsert ${contact.id} failed`, err);
        }
        processed++;
      }
      console.log(
        `[importContacts] upserted page ${pageIdx} in ${Date.now() - upsertStart}ms (processed=${processed})`
      );

      broadcast(processed, total, "syncing");

      cursor = page.paging?.next?.after;
    } while (cursor);

    await admin
      .from("hubspot_connections")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("org_id", orgId);

    broadcast(processed, total, "done");
    if (channelOpen) await admin.removeChannel(channel);

    revalidatePath("/contacts");

    // Generate embeddings in background after the response is sent.
    // This keeps the import fast (no OpenAI calls blocking the sync loop).
    after(async () => {
      const { filled } = await backfillMissingEmbeddings(admin, orgId);
      if (filled > 0) {
        console.log(`[importContacts:after] embedded ${filled} contacts`);
      }
    });

    console.log(`[importContacts] done — processed=${processed} conflicts=${conflicts}`);
    return { success: true, data: { imported: processed, conflicts } };
  } catch (err) {
    if (err instanceof HubSpotAuthError) {
      broadcast(0, 0, "error");
      if (channelOpen) await admin.removeChannel(channel);
      return {
        success: false,
        error: "La conexión con HubSpot expiró. Reconectá tu cuenta.",
        code: "HS_AUTH_ERROR",
      };
    }
    console.error("[importContacts]", err);
    broadcast(0, 0, "error");
    if (channelOpen) await admin.removeChannel(channel);
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

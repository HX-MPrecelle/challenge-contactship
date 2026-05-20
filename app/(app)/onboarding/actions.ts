"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getHubSpotClient } from "@/lib/hubspot/client";
import { countContacts } from "@/lib/hubspot/contacts";
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

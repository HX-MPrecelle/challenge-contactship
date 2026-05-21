"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateOrgName(
  name: string
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const orgId = user.user_metadata?.org_id as string | undefined;
  if (!orgId) return { success: false, error: "Sin organización" };

  const trimmed = name.trim();
  if (!trimmed) return { success: false, error: "El nombre no puede estar vacío" };

  const { error } = await supabase
    .from("organizations")
    .update({ name: trimmed })
    .eq("id", orgId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/settings");
  return { success: true };
}

export async function disconnectHubSpot(): Promise<
  { success: true } | { success: false; error: string }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const orgId = user.user_metadata?.org_id as string | undefined;
  if (!orgId) return { success: false, error: "Sin organización" };

  const { error } = await supabase
    .from("hubspot_connections")
    .delete()
    .eq("org_id", orgId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/settings");
  redirect("/settings?section=hubspot");
}

export async function triggerResync(): Promise<
  { success: true; message: string } | { success: false; error: string }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const orgId = user.user_metadata?.org_id as string | undefined;
  if (!orgId) return { success: false, error: "Sin organización" };

  // Kick off a full re-sync by touching the last_synced_at so the cron picks it up,
  // and mark as pending. The actual sync runs in the next cron tick.
  const { error } = await supabase
    .from("hubspot_connections")
    .update({ last_synced_at: null })
    .eq("org_id", orgId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/settings");
  return { success: true, message: "Re-sync solicitado. El cron lo ejecutará en breve." };
}

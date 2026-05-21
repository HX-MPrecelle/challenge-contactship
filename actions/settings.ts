"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

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

  // Use service client to bypass RLS on organizations (same fix as onboarding)
  const admin = createServiceClient();
  const { error } = await admin
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

  // Clear last_synced_at so the cron fetches all contacts again.
  const admin = createServiceClient();
  const { error } = await admin
    .from("hubspot_connections")
    .update({ last_synced_at: null })
    .eq("org_id", orgId);

  if (error) return { success: false, error: error.message };

  // Use after() to call the cron after the response is sent — guaranteed
  // to complete (unlike void fetch which may be killed before finishing).
  after(async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const cronSecret = process.env.CRON_SECRET;
      if (cronSecret) {
        await fetch(`${baseUrl}/api/cron/sync`, {
          method: "GET",
          headers: { Authorization: `Bearer ${cronSecret}` },
        });
        console.log("[triggerResync:after] cron sync completed");
      }
    } catch (err) {
      console.warn("[triggerResync:after] cron call failed", err);
    }
  });

  revalidatePath("/sync");
  revalidatePath("/contacts");
  return { success: true, message: "Sync iniciado. Los contactos se actualizarán en tiempo real." };
}

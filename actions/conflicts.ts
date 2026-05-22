"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { resolveConflictMerge, resolveConflict as resolveContactConflict } from "@/actions/contacts";

export async function resolveConflictField(input: {
  contactId: string;
  choices: { field: string; source: "local" | "hubspot" }[];
}): Promise<{ success: true } | { success: false; error: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await resolveConflictMerge({ id: input.contactId, choices: input.choices as any });
  if (!result.success) return result;
  revalidatePath("/conflicts");
  revalidatePath(`/contacts/${input.contactId}`);
  return { success: true };
}

export async function skipConflict(contactId: string): Promise<
  { success: true } | { success: false; error: string }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };
  const orgId = user.app_metadata?.org_id as string | undefined;
  if (!orgId) return { success: false, error: "Sin organización" };

  // Mark conflict as "snoozed" by setting sync_status back to synced temporarily.
  // The next webhook event will re-flag it if still diverged.
  const { error } = await supabase
    .from("contacts")
    .update({ sync_status: "synced" })
    .eq("id", contactId)
    .eq("org_id", orgId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/conflicts");
  return { success: true };
}

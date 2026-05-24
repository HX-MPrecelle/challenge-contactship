"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export type ContactNote = {
  id: string;
  content: string;
  created_at: string;
  user_email: string | null;
};

export async function getContactNotes(
  contactId: string
): Promise<ActionResult<ContactNote[]>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autorizado" };

  const orgId = user.app_metadata?.org_id as string | undefined;
  if (!orgId) return { success: false, error: "Sin organización" };

  const admin = createServiceClient();
  const { data, error } = await admin
    .from("contact_notes")
    .select("id, content, created_at, user_id")
    .eq("contact_id", contactId)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) return { success: false, error: error.message };

  // Resolve user emails for display
  const notes: ContactNote[] = await Promise.all(
    (data ?? []).map(async (n) => {
      let user_email: string | null = null;
      if (n.user_id) {
        const { data: u } = await admin.auth.admin.getUserById(n.user_id);
        user_email = u.user?.email ?? null;
      }
      return { id: n.id, content: n.content, created_at: n.created_at, user_email };
    })
  );

  return { success: true, data: notes };
}

const CreateNoteSchema = z.object({
  contactId: z.string().uuid(),
  content: z.string().min(1).max(5000),
});

export async function createContactNote(
  input: z.infer<typeof CreateNoteSchema>
): Promise<ActionResult<ContactNote>> {
  const parsed = CreateNoteSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Datos inválidos" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autorizado" };

  const orgId = user.app_metadata?.org_id as string | undefined;
  if (!orgId) return { success: false, error: "Sin organización" };

  const admin = createServiceClient();
  const { data, error } = await admin
    .from("contact_notes")
    .insert({
      org_id: orgId,
      contact_id: parsed.data.contactId,
      user_id: user.id,
      content: parsed.data.content.trim(),
    })
    .select("id, content, created_at")
    .single();

  if (error || !data) return { success: false, error: error?.message ?? "Error al crear nota" };

  revalidatePath(`/contacts/${parsed.data.contactId}`);
  return {
    success: true,
    data: { id: data.id, content: data.content, created_at: data.created_at, user_email: user.email ?? null },
  };
}

export async function deleteContactNote(
  input: { id: string; contactId: string }
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autorizado" };

  const orgId = user.app_metadata?.org_id as string | undefined;
  if (!orgId) return { success: false, error: "Sin organización" };

  const admin = createServiceClient();
  const { error } = await admin
    .from("contact_notes")
    .delete()
    .eq("id", input.id)
    .eq("org_id", orgId);

  if (error) return { success: false, error: error.message };
  revalidatePath(`/contacts/${input.contactId}`);
  return { success: true, data: undefined };
}

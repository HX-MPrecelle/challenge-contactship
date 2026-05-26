"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function updateDisplayName(
  name: string
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const trimmed = name.trim();
  if (!trimmed) return { success: false, error: "El nombre no puede estar vacío" };

  const admin = createServiceClient();
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    user_metadata: { ...user.user_metadata, full_name: trimmed },
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/profile");
  return { success: true };
}

export async function changePassword(
  newPassword: string
): Promise<{ success: true } | { success: false; error: string }> {
  if (!newPassword || newPassword.length < 8) {
    return { success: false, error: "La contraseña debe tener al menos 8 caracteres" };
  }
  if (newPassword.length > 72) {
    return { success: false, error: "La contraseña es demasiado larga" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) return { success: false, error: error.message };

  return { success: true };
}

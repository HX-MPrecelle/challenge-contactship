"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const EmailSchema = z.object({
  email: z.string().email("Ingresá un email válido").max(254),
});

export type SendMagicLinkResult =
  | { success: true }
  | { success: false; error: string };

export async function sendMagicLink(formData: FormData): Promise<SendMagicLinkResult> {
  const parsed = EmailSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Email inválido",
    };
  }

  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${appUrl}/auth/callback`,
      // shouldCreateUser defaults to true: signup and login share the same flow.
    },
  });

  if (error) {
    console.error("[sendMagicLink]", error);
    return {
      success: false,
      error: "No pudimos enviar el link. Revisá el email e intentá de nuevo.",
    };
  }

  return { success: true };
}

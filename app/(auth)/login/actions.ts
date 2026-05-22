"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { bootstrapOrgForUser } from "@/lib/auth/org";

const CredentialsSchema = z.object({
  email: z.string().email("Email inválido").max(254),
  password: z.string().min(8, "Mínimo 8 caracteres").max(72),
});

export type AuthResult =
  | { success: true; redirectTo: string }
  | { success: false; error: string; field?: "email" | "password" };

export async function signIn(formData: FormData): Promise<AuthResult> {
  const parsed = CredentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      success: false,
      error: issue?.message ?? "Datos inválidos",
      field: issue?.path[0] as "email" | "password" | undefined,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return {
      success: false,
      error: "Email o contraseña incorrectos",
    };
  }

  // Defensive: if a legacy account is missing org_id (shouldn't happen for
  // new signups, but it's cheap to verify), bootstrap it now so the
  // protected routes don't redirect into a broken state.
  let onboardingComplete = Boolean(data.user.user_metadata?.onboarding_complete);
  if (!data.user.app_metadata?.org_id) {
    try {
      const bootstrap = await bootstrapOrgForUser(data.user);
      onboardingComplete = bootstrap.onboardingComplete;
      // Force a token rotation so the new JWT carries app_metadata.org_id
      // — RLS reads from the JWT, not from the auth.users row, so the
      // session needs to be re-issued for /contacts and /settings reads
      // to return any rows.
      await supabase.auth.refreshSession();
    } catch (err) {
      console.error("[signIn] bootstrap failed", err);
      return {
        success: false,
        error: "Tu cuenta necesita una organización. Volvé a intentar.",
      };
    }
  }

  return {
    success: true,
    redirectTo: onboardingComplete ? "/dashboard" : "/onboarding",
  };
}

export async function signUp(formData: FormData): Promise<AuthResult> {
  const parsed = CredentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      success: false,
      error: issue?.message ?? "Datos inválidos",
      field: issue?.path[0] as "email" | "password" | undefined,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Supabase returns "User already registered" with various codes; surface
    // the most useful default for both that and other validation errors.
    const message = error.message.toLowerCase().includes("already")
      ? "Ya existe una cuenta con ese email. Iniciá sesión."
      : "No pudimos crear la cuenta. Revisá los datos e intentá de nuevo.";
    return { success: false, error: message };
  }

  if (!data.user) {
    return {
      success: false,
      error: "No pudimos crear la cuenta",
    };
  }

  // With email confirmation disabled in Supabase Auth settings, signUp
  // returns a confirmed user and an active session in one shot. We bootstrap
  // their organization (auto-join by email domain, or fresh org) and send
  // them straight into the onboarding stepper.
  try {
    await bootstrapOrgForUser(data.user);
    // The session JWT was issued before bootstrap ran, so it has no
    // app_metadata.org_id yet. RLS policies on every table key off
    // `(auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid`, so without
    // this refresh /contacts and /settings would return empty even
    // though the data is sitting there under the service role.
    await supabase.auth.refreshSession();
  } catch (err) {
    console.error("[signUp] bootstrap failed", err);
    return {
      success: false,
      error: "Tu cuenta se creó pero no pudimos asignarle una organización.",
    };
  }

  return { success: true, redirectTo: "/onboarding" };
}

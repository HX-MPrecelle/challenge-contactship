"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { runFollowUpAgent } from "@/lib/ai/agent";
import type { Database } from "@/types/database";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

type AgentActionRow = Database["public"]["Tables"]["agent_actions"]["Row"] & {
  contact?: { first_name: string | null; last_name: string | null; email: string | null; company: string | null } | null;
};

export type { AgentActionRow };

export async function runAgentAction(input: {
  locale?: string;
}): Promise<ActionResult<{ actionsGenerated: number }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };

  const orgId = user.user_metadata?.org_id as string | undefined;
  if (!orgId) return { success: false, error: "Sin organización", code: "NO_ORG" };
  if (!process.env.OPENAI_API_KEY) return { success: false, error: "OPENAI_API_KEY no configurada", code: "AI_ERROR" };

  try {
    const admin = createServiceClient();
    const result = await runFollowUpAgent(admin, orgId, input.locale ?? "es");
    revalidatePath("/agent");
    return { success: true, data: { actionsGenerated: result.actionsGenerated } };
  } catch (err) {
    console.error("[runAgentAction]", err);
    return { success: false, error: "El agente no pudo ejecutarse.", code: "AI_ERROR" };
  }
}

const StatusInputSchema = z.object({ id: z.string().uuid() });

export async function dismissAgentAction(
  input: z.infer<typeof StatusInputSchema>
): Promise<ActionResult> {
  const parsed = StatusInputSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Datos inválidos" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autorizado" };

  const orgId = user.user_metadata?.org_id as string | undefined;
  if (!orgId) return { success: false, error: "Sin organización" };

  const admin = createServiceClient();
  const { error } = await admin
    .from("agent_actions")
    .update({ status: "dismissed" })
    .eq("id", parsed.data.id)
    .eq("org_id", orgId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/agent");
  return { success: true, data: undefined };
}

export async function approveAgentAction(
  input: z.infer<typeof StatusInputSchema>
): Promise<ActionResult> {
  const parsed = StatusInputSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Datos inválidos" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autorizado" };

  const orgId = user.user_metadata?.org_id as string | undefined;
  if (!orgId) return { success: false, error: "Sin organización" };

  const admin = createServiceClient();
  const { error } = await admin
    .from("agent_actions")
    .update({ status: "approved", acted_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("org_id", orgId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/agent");
  return { success: true, data: undefined };
}

export async function getPendingAgentActions(): Promise<ActionResult<AgentActionRow[]>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autorizado" };

  const orgId = user.user_metadata?.org_id as string | undefined;
  if (!orgId) return { success: false, error: "Sin organización" };

  const admin = createServiceClient();
  const { data, error } = await admin
    .from("agent_actions")
    .select("*, contact:contacts(first_name, last_name, email, company)")
    .eq("org_id", orgId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as AgentActionRow[] };
}

export async function getPendingAgentCount(orgId: string): Promise<number> {
  const admin = createServiceClient();
  const { count } = await admin
    .from("agent_actions")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("status", "pending");
  return count ?? 0;
}

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

const RunAgentSchema = z.object({
  locale: z.enum(["es", "en"]).optional(),
  thresholdDays: z.number().int().min(0).max(365).default(30),
});

export async function runAgentAction(
  input: z.infer<typeof RunAgentSchema>
): Promise<ActionResult<{ actionsGenerated: number }>> {
  const parsed = RunAgentSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Datos inválidos", code: "VALIDATION_ERROR" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };

  const orgId = user.app_metadata?.org_id as string | undefined;
  if (!orgId) return { success: false, error: "Sin organización", code: "NO_ORG" };
  if (!process.env.OPENAI_API_KEY) return { success: false, error: "OPENAI_API_KEY no configurada", code: "AI_ERROR" };

  try {
    const admin = createServiceClient();
    // Load personalization preferences before running so the agent can adapt
    const preferences = await getAgentPreferences(orgId);
    const result = await runFollowUpAgent(
      admin,
      orgId,
      parsed.data.locale ?? "es",
      parsed.data.thresholdDays,
      preferences
    );
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

  const orgId = user.app_metadata?.org_id as string | undefined;
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

  const orgId = user.app_metadata?.org_id as string | undefined;
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

  const orgId = user.app_metadata?.org_id as string | undefined;
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

// ── History ──────────────────────────────────────────────────────────────────

type HistoryStatus = "approved" | "dismissed" | "acted";

export async function getAgentHistory(
  status: HistoryStatus
): Promise<ActionResult<AgentActionRow[]>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autorizado" };

  const orgId = user.app_metadata?.org_id as string | undefined;
  if (!orgId) return { success: false, error: "Sin organización" };

  const admin = createServiceClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  const { data, error } = await admin
    .from("agent_actions")
    .select("*, contact:contacts(first_name, last_name, email, company)")
    .eq("org_id", orgId)
    .eq("status", status)
    .gte("created_at", thirtyDaysAgo)
    .order("acted_at", { ascending: false, nullsFirst: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as AgentActionRow[] };
}

// ── Stats (for dashboard widget + inbox header) ───────────────────────────────

export type AgentStats = {
  pending: number;
  approved: number;
  dismissed: number;
  acted: number;
  total: number;
  approvalRate: number;
};

export async function getAgentStats(): Promise<ActionResult<AgentStats>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autorizado" };

  const orgId = user.app_metadata?.org_id as string | undefined;
  if (!orgId) return { success: false, error: "Sin organización" };

  const admin = createServiceClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  const { data } = await admin
    .from("agent_actions")
    .select("status")
    .eq("org_id", orgId)
    .gte("created_at", thirtyDaysAgo);

  const rows = data ?? [];
  const pending   = rows.filter(r => r.status === "pending").length;
  const approved  = rows.filter(r => r.status === "approved").length;
  const dismissed = rows.filter(r => r.status === "dismissed").length;
  const acted     = rows.filter(r => r.status === "acted").length;
  const decided   = approved + dismissed + acted;
  const approvalRate = decided > 0 ? Math.round(((approved + acted) / decided) * 100) : 0;

  return {
    success: true,
    data: { pending, approved, dismissed, acted, total: rows.length, approvalRate },
  };
}

// ── Mark as acted (email link clicked) ───────────────────────────────────────

export async function markAgentActionActed(
  input: z.infer<typeof StatusInputSchema>
): Promise<ActionResult> {
  const parsed = StatusInputSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Datos inválidos" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autorizado" };

  const orgId = user.app_metadata?.org_id as string | undefined;
  if (!orgId) return { success: false, error: "Sin organización" };

  const admin = createServiceClient();
  await admin
    .from("agent_actions")
    .update({ status: "acted", acted_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("org_id", orgId);

  revalidatePath("/agent");
  return { success: true, data: undefined };
}

// ── Personalization: learn from approve/dismiss patterns ──────────────────────

export type AgentPreferences = {
  dismissedPatterns: Array<{ action_type: string; lifecycle_stage: string | null; count: number }>;
  preferredPatterns: Array<{ action_type: string; lifecycle_stage: string | null; count: number }>;
};

export async function getAgentPreferences(orgId: string): Promise<AgentPreferences> {
  const admin = createServiceClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  const { data } = await admin
    .from("agent_actions")
    .select("action_type, status, contact:contacts(lifecycle_stage)")
    .eq("org_id", orgId)
    .in("status", ["approved", "dismissed", "acted"])
    .gte("created_at", thirtyDaysAgo);

  if (!data || data.length === 0) {
    return { dismissedPatterns: [], preferredPatterns: [] };
  }

  type PatternKey = `${string}|${string}`;
  const dismissed = new Map<PatternKey, number>();
  const approved  = new Map<PatternKey, number>();

  for (const row of data) {
    const contact = row.contact as { lifecycle_stage?: string | null } | null;
    const stage = contact?.lifecycle_stage ?? null;
    const key: PatternKey = `${row.action_type}|${stage ?? "unknown"}`;
    if (row.status === "dismissed") {
      dismissed.set(key, (dismissed.get(key) ?? 0) + 1);
    } else {
      approved.set(key, (approved.get(key) ?? 0) + 1);
    }
  }

  const dismissedPatterns = Array.from(dismissed.entries())
    .filter(([key, dCount]) => dCount >= 2 && (approved.get(key) ?? 0) < dCount)
    .map(([key, count]) => {
      const [action_type, lifecycle_stage] = key.split("|") as [string, string];
      return { action_type, lifecycle_stage: lifecycle_stage === "unknown" ? null : lifecycle_stage, count };
    })
    .sort((a, b) => b.count - a.count);

  const preferredPatterns = Array.from(approved.entries())
    .filter(([, aCount]) => aCount >= 2)
    .map(([key, count]) => {
      const [action_type, lifecycle_stage] = key.split("|") as [string, string];
      return { action_type, lifecycle_stage: lifecycle_stage === "unknown" ? null : lifecycle_stage, count };
    })
    .sort((a, b) => b.count - a.count);

  return { dismissedPatterns, preferredPatterns };
}

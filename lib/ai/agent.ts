import "server-only";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { AI_MODEL_ID } from "@/lib/ai/config";

type AdminClient = SupabaseClient<Database>;

export type AgentActionType = "follow_up_email" | "re_engagement" | "risk_alert" | "opportunity";

export type AgentAction = {
  contactId: string | null;
  contactName: string;
  actionType: AgentActionType;
  title: string;
  reasoning: string;
  draftSubject: string | null;
  draftBody: string | null;
};

export type AgentRunResult = {
  runId: string;
  actionsGenerated: number;
  errors: number;
};

const AgentActionSchema = z.object({
  action_type: z.enum(["follow_up_email", "re_engagement", "risk_alert", "opportunity"]),
  title: z.string().max(100).describe("Título breve de la acción."),
  reasoning: z.string().max(300).describe("Por qué este contacto necesita atención ahora."),
  draft_subject: z.string().max(120).nullable().describe("Asunto del email. Null si la acción no es un email."),
  draft_body: z.string().max(1500).nullable().describe("Cuerpo del email en texto plano. Null si la acción no es un email."),
});

type ContactCandidate = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  company: string | null;
  job_title: string | null;
  lifecycle_stage: string | null;
  lead_status: string | null;
  local_updated_at: string;
  riskReason: string;
};

/**
 * Daily autonomous agent. Scans at-risk contacts, generates personalized
 * action recommendations (including email drafts), and persists them to
 * agent_actions so the user can review from the Agent Inbox.
 *
 * At-risk criteria:
 * - customer + no activity > 60 days → churn risk
 * - SQL + no activity > 14 days      → stalling
 * - opportunity + no activity > 30 days → deal going cold
 * - NEW lead + no activity > 7 days   → unworked lead
 *
 * Capped at MAX_CONTACTS_PER_RUN to control API cost.
 */
export async function runFollowUpAgent(
  admin: AdminClient,
  orgId: string,
  locale = "es"
): Promise<AgentRunResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const now = new Date();
  const ago = (days: number) => new Date(now.getTime() - days * 86400000).toISOString();
  const MAX_CONTACTS_PER_RUN = 10;

  // Dismiss previously pending actions before creating new ones
  await admin
    .from("agent_actions")
    .update({ status: "dismissed" })
    .eq("org_id", orgId)
    .eq("status", "pending");

  // Collect at-risk contacts across all criteria
  const [
    { data: atRiskCustomers },
    { data: stallingSQL },
    { data: coldOpps },
    { data: unworkedLeads },
  ] = await Promise.all([
    admin.from("contacts").select("id, first_name, last_name, email, company, job_title, lifecycle_stage, lead_status, local_updated_at")
      .eq("org_id", orgId).eq("is_archived", false)
      .eq("lifecycle_stage", "customer").lt("local_updated_at", ago(60)).limit(4),
    admin.from("contacts").select("id, first_name, last_name, email, company, job_title, lifecycle_stage, lead_status, local_updated_at")
      .eq("org_id", orgId).eq("is_archived", false)
      .eq("lifecycle_stage", "salesqualifiedlead").lt("local_updated_at", ago(14)).limit(3),
    admin.from("contacts").select("id, first_name, last_name, email, company, job_title, lifecycle_stage, lead_status, local_updated_at")
      .eq("org_id", orgId).eq("is_archived", false)
      .eq("lifecycle_stage", "opportunity").lt("local_updated_at", ago(30)).limit(3),
    admin.from("contacts").select("id, first_name, last_name, email, company, job_title, lifecycle_stage, lead_status, local_updated_at")
      .eq("org_id", orgId).eq("is_archived", false)
      .eq("lead_status", "NEW").lt("local_updated_at", ago(7)).limit(3),
  ]);

  const candidates: ContactCandidate[] = [
    ...(atRiskCustomers ?? []).map((c) => ({ ...c, riskReason: "Cliente sin contacto en más de 60 días — riesgo de churn" })),
    ...(stallingSQL ?? []).map((c) => ({ ...c, riskReason: "SQL sin actividad en más de 14 días — conversación se enfrió" })),
    ...(coldOpps ?? []).map((c) => ({ ...c, riskReason: "Oportunidad sin actividad en más de 30 días — deal en riesgo" })),
    ...(unworkedLeads ?? []).map((c) => ({ ...c, riskReason: "Lead nuevo sin trabajar en más de 7 días" })),
  ];

  // Deduplicate by id and cap at MAX_CONTACTS_PER_RUN
  const seen = new Set<string>();
  const unique = candidates.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  }).slice(0, MAX_CONTACTS_PER_RUN);

  if (unique.length === 0) {
    return { runId: crypto.randomUUID(), actionsGenerated: 0, errors: 0 };
  }

  const runId = crypto.randomUUID();
  const langInstr = locale === "en"
    ? "Respond in English."
    : "Respondé en español rioplatense.";

  let actionsGenerated = 0;
  let errors = 0;

  const inserts: Database["public"]["Tables"]["agent_actions"]["Insert"][] = [];

  for (const contact of unique) {
    const name = [contact.first_name, contact.last_name].filter(Boolean).join(" ") || contact.email || "Sin nombre";
    const contactCtx = [
      `Nombre: ${name}`,
      contact.job_title && `Cargo: ${contact.job_title}`,
      contact.company && `Empresa: ${contact.company}`,
      `Etapa: ${contact.lifecycle_stage ?? "—"}`,
      `Lead status: ${contact.lead_status ?? "—"}`,
      `Riesgo detectado: ${contact.riskReason}`,
      `Último contacto: ${new Date(contact.local_updated_at).toLocaleDateString("es-AR")}`,
    ].filter(Boolean).join("\n");

    try {
      const { object } = await generateObject({
        model: openai(AI_MODEL_ID),
        schema: AgentActionSchema,
        system: `Sos un agente de ventas B2B autónomo. Revisás contactos en riesgo y generás recomendaciones de acción específicas. ${langInstr}

Para emails: sé conciso, personalizado y orientado a reapertura de la conversación. Máximo 150 palabras en el cuerpo.
Para alertas: sé directo con la señal de riesgo y la acción recomendada.`,
        prompt: `Generá una acción para este contacto:\n\n${contactCtx}`,
      });

      inserts.push({
        org_id: orgId,
        contact_id: contact.id,
        run_id: runId,
        action_type: object.action_type,
        title: object.title,
        reasoning: object.reasoning,
        draft_subject: object.draft_subject ?? null,
        draft_body: object.draft_body ?? null,
        status: "pending",
      });

      actionsGenerated++;
    } catch (err) {
      console.error(`[agent] failed for contact ${contact.id}`, err);
      errors++;
    }
  }

  if (inserts.length > 0) {
    await admin.from("agent_actions").insert(inserts);
  }

  return { runId, actionsGenerated, errors };
}

import "server-only";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { AI_MODEL_ID } from "@/lib/ai/config";
import type { AgentPreferences } from "@/actions/agent";

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
 * Autonomous agent. Scans at-risk contacts based on a configurable
 * inactivity threshold and generates personalized action recommendations.
 *
 * thresholdDays controls what "inactive" means:
 *   - 0  → no date filter, analyze the most relevant contacts regardless of date (demo/force mode)
 *   - >0 → contacts not updated in the last N days
 *
 * The threshold applies uniformly across all lifecycle stages so the user
 * has a single intuitive knob ("inactive for more than X days").
 */
export async function runFollowUpAgent(
  admin: AdminClient,
  orgId: string,
  locale = "es",
  thresholdDays = 30,
  preferences?: AgentPreferences
): Promise<AgentRunResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const now = new Date();
  const cutoff = thresholdDays > 0
    ? new Date(now.getTime() - thresholdDays * 86400000).toISOString()
    : null;
  const MAX_CONTACTS_PER_RUN = 10;

  // Dismiss previously pending actions before creating new ones
  await admin
    .from("agent_actions")
    .update({ status: "dismissed" })
    .eq("org_id", orgId)
    .eq("status", "pending");

  // Build queries — cutoff filter is optional (null = no date restriction)
  function addCutoff(q: ReturnType<AdminClient["from"]>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return cutoff ? (q as any).lt("local_updated_at", cutoff) : q;
  }

  const BASE = "id, first_name, last_name, email, company, job_title, lifecycle_stage, lead_status, local_updated_at";
  const base = (stage?: string, status?: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = admin.from("contacts").select(BASE)
      .eq("org_id", orgId).eq("is_archived", false);
    if (stage)  q = q.eq("lifecycle_stage", stage);
    if (status) q = q.eq("lead_status", status);
    return q;
  };

  const [
    { data: atRiskCustomers },
    { data: stallingSQL },
    { data: coldOpps },
    { data: unworkedLeads },
  ] = await Promise.all([
    addCutoff(base("customer")).limit(4),
    addCutoff(base("salesqualifiedlead")).limit(3),
    addCutoff(base("opportunity")).limit(3),
    addCutoff(base(undefined, "NEW")).limit(3),
  ]);

  const sinceLabel = cutoff
    ? `en más de ${thresholdDays} día${thresholdDays === 1 ? "" : "s"}`
    : "seleccionado para análisis";

  type RawRow = Omit<ContactCandidate, "riskReason">;
  const candidates: ContactCandidate[] = [
    ...(atRiskCustomers ?? []).map((c: RawRow) => ({ ...c, riskReason: `Cliente sin actividad ${sinceLabel} — riesgo de churn` })),
    ...(stallingSQL    ?? []).map((c: RawRow) => ({ ...c, riskReason: `SQL sin actividad ${sinceLabel} — conversación se enfrió` })),
    ...(coldOpps       ?? []).map((c: RawRow) => ({ ...c, riskReason: `Oportunidad sin actividad ${sinceLabel} — deal en riesgo` })),
    ...(unworkedLeads  ?? []).map((c: RawRow) => ({ ...c, riskReason: `Lead nuevo sin trabajar ${sinceLabel}` })),
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

  // Build personalization context from user's approve/dismiss history
  let personalizationCtx = "";
  if (preferences && (preferences.dismissedPatterns.length > 0 || preferences.preferredPatterns.length > 0)) {
    const dismissed = preferences.dismissedPatterns
      .map(p => `${p.action_type} para ${p.lifecycle_stage ?? "any stage"} (descartado ${p.count} veces)`)
      .join(", ");
    const preferred = preferences.preferredPatterns
      .slice(0, 3)
      .map(p => `${p.action_type} para ${p.lifecycle_stage ?? "any stage"} (aprobado ${p.count} veces)`)
      .join(", ");
    if (dismissed) personalizationCtx += `\nPatrones que el usuario RECHAZA consistentemente: ${dismissed}. NO generes estas combinaciones.`;
    if (preferred) personalizationCtx += `\nPatrones que el usuario APRUEBA consistentemente: ${preferred}. Priorizá estos.`;
  }

  let actionsGenerated = 0;
  let errors = 0;

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
Para alertas: sé directo con la señal de riesgo y la acción recomendada.${personalizationCtx}`,
        prompt: `Generá una acción para este contacto:\n\n${contactCtx}`,
      });

      // Insert each action immediately so the UI receives it via Supabase
      // Realtime as it's generated — not batched at the end.
      await admin.from("agent_actions").insert({
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

  return { runId, actionsGenerated, errors };
}

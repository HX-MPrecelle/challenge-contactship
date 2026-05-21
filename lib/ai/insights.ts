import "server-only";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const INSIGHTS_TTL_MS = 24 * 60 * 60 * 1000;
const MODEL = openai("gpt-4o-mini");

type AdminClient = SupabaseClient<Database>;

export type ContactInsights = {
  summary: string;
  nextAction: string;
  riskSignal: string | null;
  leadScore: number;
};

export type CachedInsights = {
  insights: ContactInsights;
  generatedAt: string;
  fromCache: boolean;
};

const InsightsSchema = z.object({
  summary: z
    .string()
    .min(1)
    .max(800)
    .describe("Resumen contextual del contacto en 2-3 oraciones."),
  next_action: z
    .string()
    .min(1)
    .max(400)
    .describe(
      "Una acción concreta y específica para avanzar con este contacto."
    ),
  risk_signal: z
    .string()
    .max(400)
    .nullable()
    .describe(
      "Descripción breve del riesgo si existe (lead frío, sin datos, sin actividad). Null si no hay riesgo."
    ),
  lead_score: z
    .number()
    .int()
    .min(0)
    .max(100)
    .describe(
      "Puntuación 0-100. 80-100: datos completos + etapa avanzada + actividad reciente. 0-19: casi vacío + sin actividad."
    ),
});

const SYSTEM_PROMPT = `Sos un asistente de ventas B2B. Vas a recibir información de un contacto del CRM y tenés que devolver un análisis breve y accionable.

Criterios del lead_score:
- 80-100: datos completos + etapa avanzada (negotiation/closedwon) + actividad reciente
- 50-79: datos parciales + etapa media + algo de actividad
- 20-49: datos mínimos + etapa temprana + poca actividad
- 0-19: datos casi vacíos + sin actividad + señales de abandono

Sé específico, accionable y conciso. Hablá siempre en español rioplatense.`;

/**
 * Build (or reuse) AI insights for a contact. Reads the four-row cache from
 * ai_insights and returns it if all rows are unexpired and not stale; on a
 * miss, calls GPT-4o-mini once and persists the response back to the cache.
 *
 * The 24-hour TTL is the freshness boundary; `is_stale=true` is the manual
 * invalidation flag (set when a contact is updated). Either condition
 * triggers a regeneration.
 */
export async function getOrGenerateInsights(
  admin: AdminClient,
  orgId: string,
  contactId: string,
  contactText: string
): Promise<CachedInsights | { error: string }> {
  if (!process.env.OPENAI_API_KEY) {
    return { error: "OPENAI_API_KEY no está configurada en el entorno." };
  }

  const { data: existing, error: lookupError } = await admin
    .from("ai_insights")
    .select("insight_type, content, generated_at, expires_at, is_stale")
    .eq("contact_id", contactId)
    .eq("org_id", orgId);

  if (lookupError) {
    console.error("[insights] cache lookup", lookupError);
  }

  type InsightRow = {
    insight_type: string;
    content: string;
    generated_at: string;
    expires_at: string;
    is_stale: boolean;
  };
  const now = Date.now();
  const byType = new Map<string, InsightRow>();
  for (const row of existing ?? []) {
    byType.set(row.insight_type, row);
  }
  const allFresh = ["summary", "next_action", "risk_signal", "lead_score"].every(
    (t) => {
      const row = byType.get(t);
      if (!row) return false;
      if (row.is_stale) return false;
      if (new Date(row.expires_at).getTime() <= now) return false;
      return true;
    }
  );

  if (allFresh) {
    return {
      insights: {
        summary: byType.get("summary")!.content,
        nextAction: byType.get("next_action")!.content,
        riskSignal: nullableContent(byType.get("risk_signal")?.content),
        leadScore: Number(byType.get("lead_score")!.content),
      },
      generatedAt: byType.get("summary")!.generated_at,
      fromCache: true,
    };
  }

  let object;
  try {
    const result = await generateObject({
      model: MODEL,
      system: SYSTEM_PROMPT,
      schema: InsightsSchema,
      prompt: `Contacto:\n${contactText}\n\nDevolvé el análisis.`,
    });
    object = result.object;
  } catch (err) {
    console.error("[insights] generation failed", err);
    return { error: "GPT no pudo generar los insights. Intentá de nuevo." };
  }

  const expiresAt = new Date(now + INSIGHTS_TTL_MS).toISOString();

  // Replace any existing rows for this contact so the cache only holds the
  // freshest response. The upsert key is implicit: we don't have a unique
  // constraint on (contact_id, insight_type), so delete-then-insert keeps
  // the table clean.
  await admin
    .from("ai_insights")
    .delete()
    .eq("org_id", orgId)
    .eq("contact_id", contactId);

  await admin.from("ai_insights").insert([
    {
      org_id: orgId,
      contact_id: contactId,
      insight_type: "summary",
      content: object.summary,
      expires_at: expiresAt,
    },
    {
      org_id: orgId,
      contact_id: contactId,
      insight_type: "next_action",
      content: object.next_action,
      expires_at: expiresAt,
    },
    {
      org_id: orgId,
      contact_id: contactId,
      insight_type: "risk_signal",
      content: object.risk_signal ?? "",
      expires_at: expiresAt,
    },
    {
      org_id: orgId,
      contact_id: contactId,
      insight_type: "lead_score",
      content: String(object.lead_score),
      expires_at: expiresAt,
    },
  ]);

  return {
    insights: {
      summary: object.summary,
      nextAction: object.next_action,
      riskSignal: object.risk_signal,
      leadScore: object.lead_score,
    },
    generatedAt: new Date(now).toISOString(),
    fromCache: false,
  };
}

function nullableContent(content: string | undefined): string | null {
  if (!content || content.trim() === "") return null;
  // The model occasionally returns the literal string "null" instead of JSON null.
  if (content.trim().toLowerCase() === "null") return null;
  return content;
}

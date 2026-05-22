"use server";

import { z } from "zod";
import { generateObject, generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getOrGenerateInsights, type CachedInsights } from "@/lib/ai/insights";
import { parseSearchQuery, type ParsedSearch } from "@/lib/ai/search";
import { backfillMissingEmbeddings } from "@/lib/ai/embeddings";
import {
  generateEmailDraft,
  type EmailDraft,
  type EmailTone,
} from "@/lib/ai/email";
import {
  buildContactText,
  normalizeHubSpotContact,
} from "@/lib/hubspot/sync";
import type { HubSpotContact } from "@/lib/hubspot/contacts";
import { AI_MODEL_ID } from "@/lib/ai/config";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

async function getOrgIndustry(
  admin: ReturnType<typeof createServiceClient>,
  orgId: string
): Promise<string | null> {
  const { data } = await admin
    .from("organizations")
    .select("industry")
    .eq("id", orgId)
    .maybeSingle();
  return (data as { industry?: string | null } | null)?.industry ?? null;
}

function industryCtx(industry: string | null): string {
  if (!industry) return "";
  return ` This company operates in the ${industry} industry — tailor your analysis to this vertical's typical sales dynamics, deal cycles, buyer profiles, and competitive landscape.`;
}

export type SimilarContact = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  jobTitle: string | null;
  lifecycleStage: string | null;
  country: string | null;
  similarity: number;
};

export type DashboardPriority = {
  contactId: string;
  name: string;
  reason: string;
};

const PRIORITIES_TTL_MS = 30 * 60 * 1000;
const PRIORITIES_CACHE_KEY = "top_priorities";

const InsightsInputSchema = z.object({
  contactId: z.string().uuid(),
  forceRefresh: z.boolean().optional(),
  locale: z.enum(["es", "en"]).optional(),
});

export async function generateInsightsAction(
  input: z.infer<typeof InsightsInputSchema>
): Promise<ActionResult<CachedInsights>> {
  const parsed = InsightsInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos inválidos", code: "VALIDATION_ERROR" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };

  const orgId = user.user_metadata?.org_id as string | undefined;
  if (!orgId) return { success: false, error: "Sin organización", code: "NO_ORG" };

  const { data: contact, error: lookupError } = await supabase
    .from("contacts")
    .select(
      "id, hubspot_id, first_name, last_name, email, phone, company, job_title, lifecycle_stage, lead_status, country, city, website, properties"
    )
    .eq("id", parsed.data.contactId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (lookupError || !contact) {
    return { success: false, error: "Contacto no encontrado", code: "NOT_FOUND" };
  }

  const admin = createServiceClient();

  if (parsed.data.forceRefresh) {
    await admin
      .from("ai_insights")
      .delete()
      .eq("org_id", orgId)
      .eq("contact_id", contact.id);
  }

  // Merge the stored properties JSONB (which has industry, notes, engagement
  // signals, etc.) with the typed columns, so the AI has the full picture.
  const storedProps = (contact.properties ?? {}) as Record<string, string | null>;
  const fakeHubSpot: HubSpotContact = {
    id: contact.hubspot_id,
    properties: {
      ...storedProps,
      // Typed columns take precedence — they're the source of truth.
      firstname: contact.first_name,
      lastname: contact.last_name,
      email: contact.email,
      phone: contact.phone,
      company: contact.company,
      jobtitle: contact.job_title,
      lifecyclestage: contact.lifecycle_stage,
      hs_lead_status: contact.lead_status,
      country: contact.country,
      city: contact.city,
      website: contact.website,
    },
    createdAt: "",
    updatedAt: "",
    archived: false,
  };
  const text = buildContactText(normalizeHubSpotContact(fakeHubSpot));

  const result = await getOrGenerateInsights(admin, orgId, contact.id, text, parsed.data.locale ?? "es");
  if ("error" in result) {
    return { success: false, error: result.error, code: "AI_ERROR" };
  }

  return { success: true, data: result };
}

const TopPrioritiesInputSchema = z.object({
  forceRefresh: z.boolean().optional(),
});

const TopPrioritiesAiSchema = z.object({
  priorities: z
    .array(
      z.object({
        contactId: z.string().describe("UUID exacto del contacto, copiado del input."),
        reason: z
          .string()
          .min(10)
          .max(160)
          .describe("Una oración explicando por qué este contacto es prioritario."),
      })
    )
    .length(3),
});

/**
 * Compute the top 3 contacts the user should engage with this week. We pull
 * the 30 most-recently-updated contacts to bound the prompt, send the model
 * a structured request, and cache the result for 30 minutes per org.
 *
 * The model picks based on stage + completeness + recency. The structured
 * output ensures we get back contactIds we can link to; we cross-check
 * against the candidate set so a hallucinated id can't slip into the UI.
 */
export async function getTopPriorities(
  input: z.infer<typeof TopPrioritiesInputSchema>
): Promise<ActionResult<{ priorities: DashboardPriority[]; generatedAt: string; fromCache: boolean }>> {
  const parsed = TopPrioritiesInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos inválidos", code: "VALIDATION_ERROR" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };

  const orgId = user.user_metadata?.org_id as string | undefined;
  if (!orgId) return { success: false, error: "Sin organización", code: "NO_ORG" };

  const now = Date.now();
  const admin0 = createServiceClient();

  if (!parsed.data.forceRefresh) {
    const { data: cached } = await admin0
      .from("org_ai_cache")
      .select("content, generated_at, expires_at")
      .eq("org_id", orgId)
      .eq("cache_key", PRIORITIES_CACHE_KEY)
      .maybeSingle();

    if (cached && new Date(cached.expires_at).getTime() > now) {
      const content = cached.content as { priorities: DashboardPriority[] };
      return {
        success: true,
        data: {
          priorities: content.priorities,
          generatedAt: cached.generated_at,
          fromCache: true,
        },
      };
    }
  }

  const { data: candidates, error } = await supabase
    .from("contacts")
    .select(
      "id, first_name, last_name, email, company, job_title, lifecycle_stage, lead_status, country, local_updated_at"
    )
    .eq("org_id", orgId)
    .eq("is_archived", false)
    .order("local_updated_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error("[getTopPriorities] query", error);
    return {
      success: false,
      error: "No pudimos leer tus contactos",
      code: "INTERNAL_ERROR",
    };
  }

  if (!candidates || candidates.length === 0) {
    return {
      success: true,
      data: {
        priorities: [],
        generatedAt: new Date(now).toISOString(),
        fromCache: false,
      },
    };
  }

  if (!process.env.OPENAI_API_KEY) {
    return {
      success: false,
      error: "OPENAI_API_KEY no está configurada en el entorno.",
      code: "AI_ERROR",
    };
  }

  const candidateList = candidates
    .map((c, i) => {
      const name =
        [c.first_name, c.last_name].filter(Boolean).join(" ") || "Sin nombre";
      return `${i + 1}. id=${c.id} | ${name} | ${c.job_title ?? "—"} | ${c.company ?? "—"} | etapa=${c.lifecycle_stage ?? "—"} | lead=${c.lead_status ?? "—"} | país=${c.country ?? "—"}`;
    })
    .join("\n");

  const industry = await getOrgIndustry(admin0, orgId);
  const industryInstr = industry
    ? ` El cliente opera en la industria ${industry} — considerá el ciclo de ventas y perfiles compradores típicos de ese vertical.`
    : "";

  try {
    const { object } = await generateObject({
      model: openai(AI_MODEL_ID),
      schema: TopPrioritiesAiSchema,
      system: `Sos un asistente de ventas B2B. De un set de contactos del CRM, tenés que elegir los 3 que el usuario debería priorizar esta semana. Criterios: cercanía al cierre (lifecycle stage avanzado), datos completos, recencia de actividad, y oportunidad clara.${industryInstr}

Reglas:
- Hablá siempre en español rioplatense.
- Una oración por razón, máximo 25 palabras.
- Sé específico: mencioná el dato concreto que justifica la prioridad (etapa, cargo, empresa).`,
      prompt: `Elegí los 3 contactos prioritarios de esta lista. Copiá los ids exactamente.

${candidateList}`,
    });

    // Defense-in-depth: drop anything the model didn't pick from our candidates.
    const candidateIds = new Set(candidates.map((c) => c.id));
    const byId = new Map(candidates.map((c) => [c.id, c]));
    const priorities: DashboardPriority[] = object.priorities
      .filter((p) => candidateIds.has(p.contactId))
      .map((p) => {
        const c = byId.get(p.contactId)!;
        return {
          contactId: p.contactId,
          name:
            [c.first_name, c.last_name].filter(Boolean).join(" ") ||
            c.email ||
            "Sin nombre",
          reason: p.reason,
        };
      });

    const expiresAt = new Date(now + PRIORITIES_TTL_MS).toISOString();
    await admin0
      .from("org_ai_cache")
      .upsert(
        {
          org_id: orgId,
          cache_key: PRIORITIES_CACHE_KEY,
          content: { priorities } as unknown as import("@/types/database").Json,
          generated_at: new Date(now).toISOString(),
          expires_at: expiresAt,
        },
        { onConflict: "org_id,cache_key" }
      );

    return {
      success: true,
      data: {
        priorities,
        generatedAt: new Date(now).toISOString(),
        fromCache: false,
      },
    };
  } catch (err) {
    console.error("[getTopPriorities] generation", err);
    return {
      success: false,
      error: "GPT no pudo elegir prioridades. Intentá de nuevo.",
      code: "AI_ERROR",
    };
  }
}

const SimilarContactsInputSchema = z.object({
  contactId: z.string().uuid(),
  limit: z.number().int().min(1).max(20).optional(),
});

/**
 * Surface the N contacts whose embedding is closest to the target contact's.
 * The match_contacts RPC already filters by org_id + non-archived + non-null
 * embedding; we tack on a self-exclusion in JS because the RPC doesn't take
 * an exclude_id parameter. The fan-out call to backfillMissingEmbeddings is
 * the same lazy guarantee the chat path has — if the target itself doesn't
 * have an embedding yet (legacy import), we generate it before searching.
 */
export async function findSimilarContacts(
  input: z.infer<typeof SimilarContactsInputSchema>
): Promise<ActionResult<{ contacts: SimilarContact[] }>> {
  const parsed = SimilarContactsInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos inválidos", code: "VALIDATION_ERROR" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };

  const orgId = user.user_metadata?.org_id as string | undefined;
  if (!orgId) return { success: false, error: "Sin organización", code: "NO_ORG" };

  const admin = createServiceClient();

  // Make sure this org has embeddings on its contacts (covers legacy imports
  // that ran before the AI side was wired up). No-op on subsequent calls.
  await backfillMissingEmbeddings(admin, orgId);

  const limit = parsed.data.limit ?? 5;

  const { data: target, error: lookupError } = await admin
    .from("contacts")
    .select("id, embedding")
    .eq("org_id", orgId)
    .eq("id", parsed.data.contactId)
    .maybeSingle();

  if (lookupError || !target) {
    return { success: false, error: "Contacto no encontrado", code: "NOT_FOUND" };
  }
  if (!target.embedding) {
    return { success: true, data: { contacts: [] } };
  }

  // Ask for limit + 1 because the target itself comes back at similarity 1.
  // Drop it client-side and trim to the requested limit.
  const { data, error } = await admin.rpc("match_contacts", {
    query_embedding: target.embedding as unknown as string,
    match_org_id: orgId,
    match_threshold: 0.5,
    match_count: limit + 1,
  });

  if (error) {
    console.error("[findSimilarContacts]", error);
    return {
      success: false,
      error: "No pudimos buscar contactos similares",
      code: "INTERNAL_ERROR",
    };
  }

  const contacts: SimilarContact[] = (data ?? [])
    .filter((row) => row.id !== parsed.data.contactId)
    .slice(0, limit)
    .map((row) => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      company: row.company,
      jobTitle: row.job_title,
      lifecycleStage: row.lifecycle_stage,
      country: row.country,
      similarity: row.similarity,
    }));

  return { success: true, data: { contacts } };
}

const EmailDraftInputSchema = z.object({
  contactId: z.string().uuid(),
  goal: z.string().min(1).max(400),
  tone: z.enum(["warm", "concise", "direct"]).default("warm"),
});

/**
 * Compose a personalized email draft for a contact. We assemble the prompt
 * from the contact's CRM record plus its cached AI insights (summary +
 * nextAction + riskSignal) when available — the insights give the model the
 * "what should I do with this person?" intuition it doesn't get from raw
 * properties alone. If insights aren't cached we proceed without them
 * instead of waiting on generation; the email is still useful.
 */
export async function generateEmailDraftAction(
  input: z.infer<typeof EmailDraftInputSchema>
): Promise<ActionResult<EmailDraft & { to: string | null }>> {
  const parsed = EmailDraftInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos inválidos", code: "VALIDATION_ERROR" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };

  const orgId = user.user_metadata?.org_id as string | undefined;
  if (!orgId) return { success: false, error: "Sin organización", code: "NO_ORG" };

  const { data: contact, error: lookupError } = await supabase
    .from("contacts")
    .select(
      "id, first_name, last_name, email, company, job_title, lifecycle_stage, lead_status, country, city, website"
    )
    .eq("id", parsed.data.contactId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (lookupError || !contact) {
    return { success: false, error: "Contacto no encontrado", code: "NOT_FOUND" };
  }

  // Pull whatever insights are already cached. We deliberately don't trigger
  // a fresh generation here — the email draft path should be snappy, and a
  // missing insight is just less context, not a failure.
  const admin = createServiceClient();
  const { data: insightRows } = await admin
    .from("ai_insights")
    .select("insight_type, content, is_stale")
    .eq("contact_id", contact.id)
    .eq("org_id", orgId);

  const insightsByType = new Map<string, string>();
  for (const row of insightRows ?? []) {
    if (row.is_stale) continue;
    insightsByType.set(row.insight_type, row.content);
  }

  const contactSummary = [
    `Nombre: ${[contact.first_name, contact.last_name].filter(Boolean).join(" ") || "Sin nombre"}`,
    contact.job_title && `Cargo: ${contact.job_title}`,
    contact.company && `Empresa: ${contact.company}`,
    contact.lifecycle_stage && `Etapa del ciclo: ${contact.lifecycle_stage}`,
    contact.lead_status && `Estado del lead: ${contact.lead_status}`,
    contact.country && `País: ${contact.country}`,
    contact.city && `Ciudad: ${contact.city}`,
    contact.website && `Sitio: ${contact.website}`,
    insightsByType.get("summary") &&
      `\nResumen previo: ${insightsByType.get("summary")}`,
    insightsByType.get("next_action") &&
      `\nPróxima acción sugerida: ${insightsByType.get("next_action")}`,
    insightsByType.get("risk_signal") &&
      `\nRiesgo detectado: ${insightsByType.get("risk_signal")}`,
  ]
    .filter(Boolean)
    .join("\n");

  const result = await generateEmailDraft({
    contactSummary,
    goal: parsed.data.goal,
    tone: parsed.data.tone as EmailTone,
  });
  if ("error" in result) {
    return { success: false, error: result.error, code: "AI_ERROR" };
  }

  return {
    success: true,
    data: { ...result, to: contact.email },
  };
}

const SearchInputSchema = z.object({
  query: z.string().min(1).max(400),
});

export async function naturalLanguageSearch(
  input: z.infer<typeof SearchInputSchema>
): Promise<ActionResult<ParsedSearch & { resultCount: number }>> {
  const parsed = SearchInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Consulta vacía", code: "VALIDATION_ERROR" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };

  const orgId = user.user_metadata?.org_id as string | undefined;
  if (!orgId) return { success: false, error: "Sin organización", code: "NO_ORG" };

  const parsedSearch = await parseSearchQuery(parsed.data.query);
  if ("error" in parsedSearch) {
    return { success: false, error: parsedSearch.error, code: "AI_ERROR" };
  }

  // Apply filters to a head request just to count rows — the actual contact
  // list rerenders client-side with the filters via URL state.
  let query = supabase
    .from("contacts")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("is_archived", false);

  for (const filter of parsedSearch.filters) {
    // PostgREST exposes ilike/eq/lt/gt/lte/gte directly. We whitelisted the
    // operator set in the schema; cast keeps the dynamic dispatch happy.
    query = (query as unknown as {
      filter: (col: string, op: string, val: string) => typeof query;
    }).filter(filter.field, filter.operator, filter.value);
  }

  const { count, error } = await query;
  if (error) {
    console.error("[naturalLanguageSearch] count failed", error);
    return {
      success: false,
      error: "Falló la búsqueda. Intentá reformularla.",
      code: "INTERNAL_ERROR",
    };
  }

  return {
    success: true,
    data: { ...parsedSearch, resultCount: count ?? 0 },
  };
}

const FilterShape = z.object({
  field: z.string().min(1).max(60),
  operator: z.enum(["eq", "ilike", "lt", "gt", "lte", "gte"]),
  value: z.string().max(400),
});

const SummarizeFilteredSchema = z.object({
  query: z.string().min(1).max(400),
  filters: z.array(FilterShape).max(6),
});

const SUMMARY_LIMIT = 50;
// Whitelist matches the FILTER_FIELDS in lib/ai/search.ts plus a few common
// columns. We re-validate here so a malicious client can't filter on
// non-contact columns by hand-rolling the action payload.
const ALLOWED_FILTER_FIELDS = new Set([
  "first_name",
  "last_name",
  "email",
  "company",
  "job_title",
  "lifecycle_stage",
  "lead_status",
  "country",
  "city",
  "local_updated_at",
  "created_at",
]);

/**
 * Aggregate analysis over the set of contacts matching the natural-language
 * filter. We pull up to SUMMARY_LIMIT rows in the same shape the chat path
 * uses, then ask the model for patterns, gaps, and concrete next steps.
 *
 * Returns plain markdown — UI renders it as `whitespace-pre-wrap` for the
 * MVP. Cap of SUMMARY_LIMIT keeps the prompt under the model's comfortable
 * context window even on bigger orgs; we tell the model when the sample is
 * truncated so it doesn't overclaim coverage.
 */
export async function summarizeFilteredContacts(
  input: z.infer<typeof SummarizeFilteredSchema>
): Promise<ActionResult<{ summary: string; analyzed: number; total: number }>> {
  const parsed = SummarizeFilteredSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos inválidos", code: "VALIDATION_ERROR" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };

  const orgId = user.user_metadata?.org_id as string | undefined;
  if (!orgId) return { success: false, error: "Sin organización", code: "NO_ORG" };

  for (const f of parsed.data.filters) {
    if (!ALLOWED_FILTER_FIELDS.has(f.field)) {
      return {
        success: false,
        error: `Filtro no permitido: ${f.field}`,
        code: "VALIDATION_ERROR",
      };
    }
  }

  let countQuery = supabase
    .from("contacts")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("is_archived", false);

  let rowQuery = supabase
    .from("contacts")
    .select(
      "first_name, last_name, email, company, job_title, lifecycle_stage, lead_status, country, city, local_updated_at"
    )
    .eq("org_id", orgId)
    .eq("is_archived", false)
    .order("local_updated_at", { ascending: false })
    .limit(SUMMARY_LIMIT);

  for (const f of parsed.data.filters) {
    countQuery = (countQuery as unknown as {
      filter: (c: string, o: string, v: string) => typeof countQuery;
    }).filter(f.field, f.operator, f.value);
    rowQuery = (rowQuery as unknown as {
      filter: (c: string, o: string, v: string) => typeof rowQuery;
    }).filter(f.field, f.operator, f.value);
  }

  const [{ count }, { data: rows, error: rowsError }] = await Promise.all([
    countQuery,
    rowQuery,
  ]);

  if (rowsError) {
    console.error("[summarizeFilteredContacts]", rowsError);
    return {
      success: false,
      error: "Falló la consulta. Intentá reformular el filtro.",
      code: "INTERNAL_ERROR",
    };
  }

  const total = count ?? 0;
  const analyzed = rows?.length ?? 0;

  if (analyzed === 0) {
    return {
      success: false,
      error: "Ningún contacto coincide con el filtro.",
      code: "EMPTY",
    };
  }

  if (!process.env.OPENAI_API_KEY) {
    return {
      success: false,
      error: "OPENAI_API_KEY no está configurada en el entorno.",
      code: "AI_ERROR",
    };
  }

  const contactList = (rows ?? [])
    .map((c, i) => {
      const name =
        [c.first_name, c.last_name].filter(Boolean).join(" ") || "Sin nombre";
      return `${i + 1}. ${name} | ${c.job_title ?? "—"} | ${c.company ?? "—"} | ${c.lifecycle_stage ?? "—"} | ${c.lead_status ?? "—"} | ${c.country ?? "—"}`;
    })
    .join("\n");

  const truncationNote =
    total > analyzed
      ? `\n\nNota: el filtro completo contiene ${total} contactos, pero solo te estoy mandando los ${analyzed} más recientes.`
      : "";

  try {
    const { text } = await generateText({
      model: openai(AI_MODEL_ID),
      system: `Sos un asistente de ventas B2B. Vas a recibir un grupo de contactos del CRM que matchearon un filtro en lenguaje natural. Tu tarea es:

1. Identificar patrones comunes (industria/cargo/país/etapa concentrados).
2. Detectar gaps en la data (campos vacíos importantes, falta de actividad).
3. Recomendar 2-3 acciones concretas y específicas que el usuario puede tomar sobre este grupo.

Reglas:
- Hablá siempre en español rioplatense.
- Sé conciso. Usá secciones cortas con bullets. Máximo 250 palabras totales.
- No menciones contactos por nombre salvo que sea para ilustrar un patrón puntual.
- No inventes datos. Si la muestra es chica, decilo.`,
      prompt: `Filtro original del usuario: "${parsed.data.query}"
Filtros aplicados: ${JSON.stringify(parsed.data.filters)}
Contactos analizados: ${analyzed} de ${total}.

Lista:
${contactList}${truncationNote}

Generá el análisis.`,
    });

    return {
      success: true,
      data: { summary: text, analyzed, total },
    };
  } catch (err) {
    console.error("[summarizeFilteredContacts] generation", err);
    return {
      success: false,
      error: "GPT no pudo generar el análisis. Intentá de nuevo.",
      code: "AI_ERROR",
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE HEALTH ALERTS
// ═══════════════════════════════════════════════════════════════════════════════

const PipelineAlertSchema = z.object({
  alerts: z
    .array(
      z.object({
        severity: z.enum(["critical", "warning", "info", "success"]),
        emoji: z.string().max(4),
        title: z.string().max(80),
        description: z.string().max(220),
        count: z.number().int().min(0),
        cta: z.string().max(60),
        filterPath: z.string().max(100).nullable(),
      })
    )
    .min(1)
    .max(6),
  overallHealth: z.enum(["critical", "warning", "good", "excellent"]),
  summary: z.string().max(200),
});

export type PipelineAlerts = z.infer<typeof PipelineAlertSchema>;

export async function generatePipelineAlerts(input: {
  locale?: string;
}): Promise<{ success: true; data: PipelineAlerts } | { success: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autorizado" };
  const orgId = user.user_metadata?.org_id as string | undefined;
  if (!orgId) return { success: false, error: "Sin organización" };
  if (!process.env.OPENAI_API_KEY) return { success: false, error: "OPENAI_API_KEY no configurada" };

  const locale = input.locale ?? "es";
  const now = new Date();
  const ago = (days: number) => new Date(now.getTime() - days * 86400000).toISOString();
  const admin = createServiceClient();

  const [
    { count: stalledOpps },
    { count: atRiskCustomers },
    { count: newUnworked },
    { count: openDeals },
    { count: attemptedNoReply },
    { count: totalContacts },
    { count: sqlNoActivity },
  ] = await Promise.all([
    admin.from("contacts").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("is_archived", false).eq("lifecycle_stage", "opportunity").lt("local_updated_at", ago(30)),
    admin.from("contacts").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("is_archived", false).eq("lifecycle_stage", "customer").lt("local_updated_at", ago(60)),
    admin.from("contacts").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("is_archived", false).eq("lead_status", "NEW").lt("local_updated_at", ago(7)),
    admin.from("contacts").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("is_archived", false).eq("lead_status", "OPEN_DEAL"),
    admin.from("contacts").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("is_archived", false).eq("lead_status", "ATTEMPTED_TO_CONTACT"),
    admin.from("contacts").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("is_archived", false),
    admin.from("contacts").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("is_archived", false).eq("lifecycle_stage", "salesqualifiedlead").lt("local_updated_at", ago(14)),
  ]);

  const langInstr = locale === "en"
    ? "Respond in English."
    : "Respondé en español rioplatense.";

  const industry = await getOrgIndustry(admin, orgId);

  try {
    const { object } = await generateObject({
      model: openai(AI_MODEL_ID),
      schema: PipelineAlertSchema,
      system: `You are a B2B sales pipeline analyst. Generate actionable pipeline health alerts based on CRM metrics.${industryCtx(industry)} ${langInstr} Be specific with numbers. Use appropriate emojis (⚠️ warning, 🔥 critical, ✅ good, 💡 opportunity).`,
      prompt: `Pipeline stats:
- Total contacts: ${totalContacts}
- Stalled opportunities (>30 days no update): ${stalledOpps}
- At-risk customers (>60 days no contact): ${atRiskCustomers}
- New leads unworked (>7 days): ${newUnworked}
- Active open deals: ${openDeals}
- Contacts not replying (ATTEMPTED_TO_CONTACT): ${attemptedNoReply}
- SQL with no activity >14 days: ${sqlNoActivity}

Generate 3-5 prioritized alerts. Include a filterPath like "/contacts?status=conflict" when relevant.
For stalled opps use "/contacts" as filterPath.`,
    });
    return { success: true, data: object };
  } catch (err) {
    console.error("[generatePipelineAlerts]", err);
    return { success: false, error: "No se pudo analizar el pipeline." };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// WIN / LOSS PATTERN ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

const WinLossSchema = z.object({
  winProfile: z.object({
    patterns: z.array(z.object({
      pattern: z.string().max(90),
      detail: z.string().max(180),
    })).max(5),
    idealCustomer: z.string().max(280),
    keySignals: z.array(z.string().max(80)).max(5),
  }),
  lossSignals: z.array(z.object({
    signal: z.string().max(80),
    description: z.string().max(160),
  })).max(5),
  recommendations: z.array(z.object({
    action: z.string().max(100),
    reasoning: z.string().max(200),
    priority: z.enum(["high", "medium", "low"]),
  })).max(4),
});

export type WinLossAnalysis = z.infer<typeof WinLossSchema>;

export async function analyzeWinLoss(input: {
  locale?: string;
}): Promise<{ success: true; data: WinLossAnalysis; winsCount: number; lossesCount: number } | { success: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autorizado" };
  const orgId = user.user_metadata?.org_id as string | undefined;
  if (!orgId) return { success: false, error: "Sin organización" };
  if (!process.env.OPENAI_API_KEY) return { success: false, error: "OPENAI_API_KEY no configurada" };

  const locale = input.locale ?? "es";
  const admin = createServiceClient();

  const [{ data: wins }, { data: losses }] = await Promise.all([
    admin.from("contacts").select("first_name, last_name, company, job_title, lifecycle_stage, lead_status, country, properties")
      .eq("org_id", orgId).eq("is_archived", false).eq("lifecycle_stage", "customer").order("local_updated_at", { ascending: false }).limit(40),
    admin.from("contacts").select("first_name, last_name, company, job_title, lifecycle_stage, lead_status, country, properties")
      .eq("org_id", orgId).eq("is_archived", false).in("lead_status", ["UNQUALIFIED", "BAD_TIMING"]).order("local_updated_at", { ascending: false }).limit(25),
  ]);

  if (!wins || wins.length === 0) return { success: false, error: "No hay deals cerrados para analizar." };

  const fmt = (c: Record<string, unknown>) => {
    const p = (c.properties ?? {}) as Record<string, string | null>;
    return [
      `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || "—",
      c.company, c.job_title,
      p.industry,
      p.numemployees ? `${p.numemployees} emp.` : null,
      c.country,
      p.message ? `Notes: "${p.message.slice(0, 250)}"` : null,
    ].filter(Boolean).join(" | ");
  };

  const winsText = (wins ?? []).map(fmt as (c: unknown) => string).join("\n");
  const lossesText = (losses ?? []).map(fmt as (c: unknown) => string).join("\n");

  const langInstr = locale === "en" ? "Respond in English." : "Respondé en español rioplatense.";
  const industry = await getOrgIndustry(admin, orgId);

  try {
    const { object } = await generateObject({
      model: openai(AI_MODEL_ID),
      schema: WinLossSchema,
      system: `You are a B2B sales strategist. Analyze won and lost deals and extract strategic patterns.${industryCtx(industry)} ${langInstr} Be specific, actionable, and data-driven. Reference industries, roles, company sizes from the data.`,
      prompt: `WON customers (${wins?.length ?? 0} contacts):
${winsText}

LOST/unqualified contacts (${losses?.length ?? 0}):
${lossesText}

Analyze patterns. The 'Notes' fields contain CRM notes with deal context — use them for deeper insights.`,
    });
    return { success: true, data: object, winsCount: wins?.length ?? 0, lossesCount: losses?.length ?? 0 };
  } catch (err) {
    console.error("[analyzeWinLoss]", err);
    return { success: false, error: "No se pudo generar el análisis." };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPETITIVE INTELLIGENCE
// ═══════════════════════════════════════════════════════════════════════════════

const CompetitiveSchema = z.object({
  competitors: z.array(z.object({
    name: z.string().max(60),
    mentions: z.number().int().min(1),
    wonAgainst: z.number().int().min(0),
    lostAgainst: z.number().int().min(0),
    activeDeals: z.number().int().min(0),
    differentiators: z.array(z.string().max(120)).max(3),
    quote: z.string().max(220).nullable(),
  })).max(10),
  summary: z.string().max(300),
  noCompetitorsFound: z.boolean().nullable(),
});

export type CompetitiveAnalysis = z.infer<typeof CompetitiveSchema>;

export async function extractCompetitorMentions(input: {
  locale?: string;
}): Promise<{ success: true; data: CompetitiveAnalysis; notesCount: number } | { success: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autorizado" };
  const orgId = user.user_metadata?.org_id as string | undefined;
  if (!orgId) return { success: false, error: "Sin organización" };
  if (!process.env.OPENAI_API_KEY) return { success: false, error: "OPENAI_API_KEY no configurada" };

  const locale = input.locale ?? "es";
  const admin = createServiceClient();

  // Fetch contacts with properties — filter client-side for non-empty message
  const { data: allContacts } = await admin.from("contacts")
    .select("first_name, last_name, company, lifecycle_stage, lead_status, properties")
    .eq("org_id", orgId).eq("is_archived", false).limit(300);

  const withNotes = (allContacts ?? []).filter((c) => {
    const p = (c.properties ?? {}) as Record<string, string | null>;
    return p.message && p.message.trim().length > 30;
  });

  if (withNotes.length === 0) return { success: false, error: "No hay notas suficientes en el CRM." };

  const notesText = withNotes.map((c) => {
    const p = (c.properties ?? {}) as Record<string, string | null>;
    const dealStatus = c.lifecycle_stage === "customer" ? "WON"
      : c.lead_status === "UNQUALIFIED" ? "LOST"
      : "ACTIVE";
    return `[${dealStatus}] ${c.company ?? "—"}: "${p.message!.slice(0, 300)}"`;
  }).join("\n\n");

  const langInstr = locale === "en" ? "Respond in English." : "Respondé en español rioplatense.";
  const industry = await getOrgIndustry(admin, orgId);

  try {
    const { object } = await generateObject({
      model: openai(AI_MODEL_ID),
      schema: CompetitiveSchema,
      system: `You are a competitive intelligence analyst. Extract competitor mentions from CRM notes and analyze win/loss context.${industryCtx(industry)} ${langInstr} Be precise: only include competitors explicitly mentioned by name. WON = we won, LOST = we lost, ACTIVE = deal in progress.`,
      prompt: `CRM notes from ${withNotes.length} contacts:\n\n${notesText}\n\nExtract all competitor mentions with win/loss context and key differentiators our team uses against them.`,
    });
    return { success: true, data: object, notesCount: withNotes.length };
  } catch (err) {
    console.error("[extractCompetitorMentions]", err);
    return { success: false, error: "No se pudo analizar la inteligencia competitiva." };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DUPLICATE DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

export type DuplicateContact = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  company: string | null;
  jobTitle: string | null;
  lifecycleStage: string | null;
};

export type DuplicateGroup = {
  primary: DuplicateContact;
  duplicate: DuplicateContact;
  similarity: number;
};

/**
 * Find semantically duplicate contacts using pgvector cosine similarity.
 * Uses a high threshold (0.88) to only surface strong matches.
 * Returns at most 20 groups to keep the UI manageable.
 */
export async function detectDuplicates(): Promise<
  ActionResult<{ groups: DuplicateGroup[] }>
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };

  const orgId = user.user_metadata?.org_id as string | undefined;
  if (!orgId) return { success: false, error: "Sin organización", code: "NO_ORG" };

  const admin = createServiceClient();

  // Ensure all contacts have embeddings before searching
  await backfillMissingEmbeddings(admin, orgId);

  const { data: contacts, error } = await admin
    .from("contacts")
    .select("id, first_name, last_name, email, company, job_title, lifecycle_stage, embedding")
    .eq("org_id", orgId)
    .eq("is_archived", false)
    .not("embedding", "is", null)
    .limit(300);

  if (error || !contacts) {
    return { success: false, error: "No se pudo acceder a los contactos", code: "INTERNAL_ERROR" };
  }

  const seen = new Set<string>();
  const groups: DuplicateGroup[] = [];

  for (const contact of contacts) {
    if (groups.length >= 20) break;

    const { data: matches } = await admin.rpc("match_contacts", {
      query_embedding: contact.embedding as unknown as string,
      match_org_id: orgId,
      match_threshold: 0.88,
      match_count: 3,
    });

    for (const match of matches ?? []) {
      if (match.id === contact.id) continue;

      const pairKey = [contact.id, match.id].sort().join("|");
      if (seen.has(pairKey)) continue;
      seen.add(pairKey);

      groups.push({
        primary: {
          id: contact.id,
          firstName: contact.first_name,
          lastName: contact.last_name,
          email: contact.email,
          company: contact.company,
          jobTitle: contact.job_title,
          lifecycleStage: contact.lifecycle_stage,
        },
        duplicate: {
          id: match.id,
          firstName: match.first_name,
          lastName: match.last_name,
          email: match.email,
          company: match.company,
          jobTitle: match.job_title,
          lifecycleStage: match.lifecycle_stage,
        },
        similarity: match.similarity,
      });
    }
  }

  return { success: true, data: { groups } };
}

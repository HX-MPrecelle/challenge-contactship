import "server-only";
import { generateObject } from "ai";
import { z } from "zod";

const MODEL = "openai/gpt-4o-mini";

const FILTER_FIELDS = [
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
] as const;

const FilterSchema = z.object({
  field: z.enum(FILTER_FIELDS).describe("Columna del contacto a filtrar."),
  operator: z
    .enum(["eq", "ilike", "lt", "gt", "lte", "gte"])
    .describe(
      "Operador SQL. ilike permite wildcards %; eq es match exacto; lt/gt/lte/gte para fechas."
    ),
  value: z
    .string()
    .describe(
      "Valor a comparar. Para fechas usar formato ISO 8601 (ej. 2026-05-01). Para ilike incluir % como wildcards (ej. %argentina%)."
    ),
});

const SearchSchema = z.object({
  filters: z
    .array(FilterSchema)
    .max(6)
    .describe("Lista de filtros AND a aplicar sobre la tabla contacts."),
  explanation: z
    .string()
    .max(200)
    .describe("Explicación breve de la búsqueda para mostrar al usuario."),
});

export type ParsedSearch = z.infer<typeof SearchSchema>;

const SYSTEM_PROMPT = `Sos un asistente que traduce búsquedas en lenguaje natural a filtros SQL sobre una tabla de contactos.

La tabla tiene las columnas: ${FILTER_FIELDS.join(", ")}.

Reglas:
- Para texto libre (nombre, email, empresa, país, ciudad) usá ilike con % como wildcards.
- Para etapas y status usá eq con el valor exacto en lowercase (lifecycle_stage, lead_status).
- Para fechas (local_updated_at, created_at), si el usuario dice "hace 2 semanas" o "últimos 7 días", calculá la fecha relativa al día de hoy y devolvé un ISO 8601.
- Hoy es ${new Date().toISOString().slice(0, 10)}.
- Si la búsqueda no tiene sentido o no podés traducirla, devolvé un array vacío de filtros.

Sé conservador: preferí menos filtros bien formados antes que muchos filtros dudosos.`;

/**
 * Translate a natural-language query into a list of typed Supabase filters.
 * GPT-4o-mini outputs a JSON conforming to SearchSchema; if it can't, the
 * promise rejects and the caller returns a graceful "couldn't parse" error.
 */
export async function parseSearchQuery(
  query: string
): Promise<ParsedSearch | { error: string }> {
  if (!process.env.OPENAI_API_KEY) {
    return { error: "OPENAI_API_KEY no está configurada en el entorno." };
  }

  try {
    const { object } = await generateObject({
      model: MODEL,
      system: SYSTEM_PROMPT,
      schema: SearchSchema,
      prompt: `Consulta del usuario: "${query}"`,
    });
    return object;
  } catch (err) {
    console.error("[parseSearchQuery]", err);
    return {
      error: "No pude entender la búsqueda. Intentá reformularla.",
    };
  }
}

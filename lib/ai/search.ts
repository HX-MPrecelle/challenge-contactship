import "server-only";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const MODEL = openai("gpt-4o-mini");

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

const SYSTEM_PROMPT = `Sos un asistente que traduce búsquedas en lenguaje natural a filtros SQL sobre una tabla de contactos de un CRM B2B (HubSpot).

La tabla tiene las columnas: ${FILTER_FIELDS.join(", ")}.

═══ VALORES VÁLIDOS PARA lifecycle_stage (HubSpot) ═══
subscriber      → suscriptor, se suscribió
lead            → lead, interesado
marketingqualifiedlead → MQL, lead calificado de marketing
salesqualifiedlead     → SQL, lead calificado de ventas, calificado para ventas
opportunity     → opportunity, oportunidad, cerca del cierre, en negociación, avanzado
customer        → customer, cliente, ya compró, cerrado
evangelist      → evangelista

═══ VALORES VÁLIDOS PARA lead_status (HubSpot) ═══
NEW                    → nuevo, recién entró
OPEN                   → abierto, sin asignar
IN_PROGRESS            → en proceso, en seguimiento, activo
OPEN_DEAL              → tiene deal abierto
UNQUALIFIED            → no calificado, descartado
ATTEMPTED_TO_CONTACT   → intento de contacto, sin respuesta
CONNECTED              → conectado, respondió
BAD_TIMING             → mal timing, volver más adelante

═══ REGLAS ═══
- Para texto libre (nombre, email, empresa, país, ciudad, cargo) usá ilike con % como wildcards.
- Para lifecycle_stage y lead_status usá eq con el valor exacto en el formato de arriba.
- Para fechas (local_updated_at, created_at), calculá la fecha relativa al día de hoy (${new Date().toISOString().slice(0, 10)}) y devolvé ISO 8601.
- Sé conservador: preferí menos filtros bien formados antes que muchos dudosos.
- Si la búsqueda implica ORDENAMIENTO (más antiguos, mayor score, más recientes por algo) y no hay forma de convertirlo en un filtro razonable, devolvé un array vacío.
- Si la búsqueda no tiene sentido o no podés traducirla, devolvé un array vacío.

═══ EJEMPLOS ═══
"cerca del cierre"               → lifecycle_stage eq opportunity
"clientes"                       → lifecycle_stage eq customer
"leads de Argentina"             → lifecycle_stage eq lead + country ilike %Argentina%
"SQL sin respuesta"              → lifecyclestage eq salesqualifiedlead + lead_status eq ATTEMPTED_TO_CONTACT
"contactos de Brasil en fintech" → country ilike %Brazil% + company ilike %fin%
"deals abiertos"                 → lead_status eq OPEN_DEAL
"contactos de la última semana"  → created_at gte 2026-05-14 (calculado desde hoy)
"más antiguos", "mayor cargo"    → [] (no es filtrable, es orden)`;

/**
 * Translate a natural-language query into a list of typed Supabase filters.
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

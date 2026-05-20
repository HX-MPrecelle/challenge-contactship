import "server-only";
import { embed } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const EMBEDDING_MODEL = "openai/text-embedding-3-small";
const MATCH_THRESHOLD = 0.5;
const MATCH_COUNT = 20;

export type RelevantContact = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  company: string | null;
  job_title: string | null;
  lifecycle_stage: string | null;
  lead_status: string | null;
  country: string | null;
  similarity: number;
};

/**
 * Embed the user question with text-embedding-3-small and pull the top 20
 * semantically closest contacts via the match_contacts RPC. Returns an
 * empty array when no embeddings exist for the org yet — the chat path
 * then proceeds without RAG context, which still yields a useful general
 * answer instead of an error wall.
 */
export async function retrieveRelevantContacts(
  admin: SupabaseClient<Database>,
  orgId: string,
  question: string
): Promise<RelevantContact[]> {
  const { embedding } = await embed({
    model: EMBEDDING_MODEL,
    value: question,
  });

  const { data, error } = await admin.rpc("match_contacts", {
    query_embedding: embedding as unknown as string,
    match_org_id: orgId,
    match_threshold: MATCH_THRESHOLD,
    match_count: MATCH_COUNT,
  });

  if (error) {
    console.error("[retrieveRelevantContacts]", error);
    return [];
  }
  return (data ?? []) as RelevantContact[];
}

/**
 * Format the retrieved contacts as a compact, model-friendly context block.
 * One contact per line, pipe-delimited so GPT can scan it cheaply.
 */
export function formatContactsContext(contacts: RelevantContact[]): string {
  if (contacts.length === 0) {
    return "No hay contactos relevantes en la base.";
  }
  return contacts
    .map((c) => {
      const name = [c.first_name, c.last_name].filter(Boolean).join(" ") || "—";
      return [
        `- ${name}`,
        c.company,
        c.job_title,
        c.lifecycle_stage,
        c.lead_status,
        c.country,
        c.email,
      ]
        .filter(Boolean)
        .join(" | ");
    })
    .join("\n");
}

export const CHAT_SYSTEM_PROMPT = `Sos un asistente de ventas B2B. Tenés acceso a un subconjunto del CRM del usuario — los contactos más relevantes semánticamente para su pregunta.

Reglas:
- Respondé en base a los contactos que recibís en el contexto. Si la pregunta no puede responderse con esos datos, decilo claramente y sugerí qué información faltaría.
- Sé específico, accionable y conciso. Usá listas cuando suma claridad.
- Mencioná contactos por nombre cuando los referenciás.
- Hablá siempre en español rioplatense.`;

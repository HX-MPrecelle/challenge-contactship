import "server-only";
import { embed } from "ai";
import { openai } from "@ai-sdk/openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const EMBEDDING_MODEL = openai.textEmbeddingModel("text-embedding-3-small");
// Lowered from 0.5 so queries like "leads cerrados" still retrieve customer-stage
// contacts even when the semantic distance is moderate.
const MATCH_THRESHOLD = 0.35;
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

export function formatContactsContext(contacts: RelevantContact[]): string {
  if (contacts.length === 0) {
    return "No relevant contacts found via semantic search.";
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

export const CHAT_SYSTEM_PROMPT = `You are a B2B sales assistant with access to a subset of the user's CRM contacts — the most semantically relevant ones for the question, plus a recent sample.

Rules:
- ALWAYS respond in the same language the user writes in. If they write in Spanish, answer in Spanish. If they write in English, answer in English.
- Base your answer on the contacts provided. If you can't fully answer with the available data, say so and tell the user what information is missing or how to refine the question.
- Be specific, actionable and concise. Use bullet points when it adds clarity.
- Mention contacts by name when you reference them.
- If asked about "closed deals", "customers", or similar, look for contacts with lifecycle_stage=customer or lead_status=OPEN_DEAL in the data provided.
- The recent sample may not cover all contacts — for aggregate questions, note if the sample is partial.`;

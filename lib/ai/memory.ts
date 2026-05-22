import "server-only";
import { embed } from "ai";
import { openai } from "@ai-sdk/openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const EMBEDDING_MODEL = openai.textEmbeddingModel("text-embedding-3-small");

type AdminClient = SupabaseClient<Database>;

export type MemoryMessage = {
  id: string;
  role: string;
  content: string;
  conversation_id: string;
  created_at: string;
  similarity: number;
};

/**
 * Embed a single text string. Returns null when OPENAI_API_KEY is missing
 * or on provider error — callers treat null as "skip embedding" gracefully.
 */
export async function embedText(text: string): Promise<number[] | null> {
  if (!process.env.OPENAI_API_KEY) return null;
  try {
    const { embedding } = await embed({ model: EMBEDDING_MODEL, value: text });
    return embedding;
  } catch (err) {
    console.error("[memory] embed failed", err);
    return null;
  }
}

/**
 * Find past chat messages semantically similar to the current query.
 * Called before generating a response so the model has memory context.
 */
export async function retrieveRelatedMessages(
  admin: AdminClient,
  orgId: string,
  userId: string,
  queryEmbedding: number[],
  limit = 4
): Promise<MemoryMessage[]> {
  const { data, error } = await admin.rpc("match_messages", {
    query_embedding: queryEmbedding as unknown as string,
    match_user_id: userId,
    match_org_id: orgId,
    match_threshold: 0.6,
    match_count: limit,
  });

  if (error) {
    console.error("[memory] match_messages", error);
    return [];
  }
  return (data ?? []) as MemoryMessage[];
}

/**
 * Format retrieved memory messages as a system prompt section.
 * Only includes user messages (not assistant responses) to keep context tight.
 */
export function formatMemoryContext(messages: MemoryMessage[]): string {
  const userMessages = messages.filter((m) => m.role === "user");
  if (userMessages.length === 0) return "";

  const items = userMessages
    .map((m) => {
      const date = new Date(m.created_at).toLocaleDateString("es-AR", {
        day: "numeric",
        month: "short",
      });
      return `- [${date}] "${m.content.slice(0, 200)}"`;
    })
    .join("\n");

  return `\n\n## Contexto de conversaciones previas (relacionado con esta pregunta):\n${items}`;
}

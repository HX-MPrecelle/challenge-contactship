import "server-only";
import { embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Use the OpenAI provider explicitly. The bare-string form ("openai/...")
// routes through the Vercel AI Gateway in AI SDK v6, which needs its own
// auth — we want direct OpenAI calls with OPENAI_API_KEY.
const EMBEDDING_MODEL = openai.textEmbeddingModel("text-embedding-3-small");

export type EmbeddingInput = {
  /** Stable identifier the caller wants paired with the returned vector. */
  key: string;
  text: string;
};

export type EmbeddingResult = {
  key: string;
  embedding: number[];
};

/**
 * Embed many contacts in one OpenAI call. Returns null when OPENAI_API_KEY
 * isn't configured so the sync engine can keep working without AI — the
 * embedding column is nullable and chat backfills lazily on first read.
 *
 * On any provider error we log and return null instead of throwing: a sync
 * shouldn't fail because OpenAI hiccuped, and the rest of the pipeline
 * (HubSpot fetch + Supabase upsert) is more critical for the demo.
 */
export async function embedContacts(
  inputs: EmbeddingInput[]
): Promise<EmbeddingResult[] | null> {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }
  if (inputs.length === 0) {
    return [];
  }

  try {
    const { embeddings } = await embedMany({
      model: EMBEDDING_MODEL,
      values: inputs.map((i) => i.text),
      maxRetries: 2,
    });

    return inputs.map((input, idx) => ({
      key: input.key,
      embedding: embeddings[idx]!,
    }));
  } catch (err) {
    console.error("[embedContacts]", err);
    return null;
  }
}

/**
 * Generate embeddings for every contact in the org that doesn't have one yet.
 * Covers the legacy case where the initial import ran before AI was wired up
 * — the chat path calls this once on first access and is a no-op after that.
 *
 * Returns how many rows were filled in this pass. We cap at 500 contacts per
 * call so a corrupted backfill can't OOM the request; for larger orgs the
 * next chat request continues where this one left off.
 */
export async function backfillMissingEmbeddings(
  admin: SupabaseClient<Database>,
  orgId: string
): Promise<{ filled: number; skipped: boolean }> {
  if (!process.env.OPENAI_API_KEY) {
    return { filled: 0, skipped: true };
  }

  const { data: missing, error } = await admin
    .from("contacts")
    .select(
      "id, first_name, last_name, email, company, job_title, lifecycle_stage, lead_status, country"
    )
    .eq("org_id", orgId)
    .eq("is_archived", false)
    .is("embedding", null)
    .limit(500);

  if (error) {
    console.error("[backfillMissingEmbeddings] lookup", error);
    return { filled: 0, skipped: true };
  }
  if (!missing || missing.length === 0) {
    return { filled: 0, skipped: false };
  }

  console.log(`[backfillMissingEmbeddings] generating ${missing.length} embeddings`);

  const inputs = missing.map((c) => ({
    key: c.id,
    text: [
      [c.first_name, c.last_name].filter(Boolean).join(" ") || "Contact",
      c.job_title && `Cargo: ${c.job_title}`,
      c.company && `Empresa: ${c.company}`,
      c.lifecycle_stage && `Etapa: ${c.lifecycle_stage}`,
      c.lead_status && `Estado: ${c.lead_status}`,
      c.country && `País: ${c.country}`,
      c.email && `Email: ${c.email}`,
    ]
      .filter(Boolean)
      .join(". "),
  }));

  const embeddings = await embedContacts(inputs);
  if (!embeddings) {
    return { filled: 0, skipped: true };
  }

  await Promise.all(
    embeddings.map((r) =>
      admin
        .from("contacts")
        .update({ embedding: r.embedding as unknown as string })
        .eq("id", r.key)
    )
  );

  console.log(`[backfillMissingEmbeddings] filled ${embeddings.length}`);
  return { filled: embeddings.length, skipped: false };
}

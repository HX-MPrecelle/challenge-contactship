import "server-only";
import { embedMany } from "ai";

const EMBEDDING_MODEL = "openai/text-embedding-3-small";

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

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const INSIGHTS_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

type AdminClient = SupabaseClient<Database>;

export type CachedResult<T> = { data: T; generatedAt: string; fromCache: boolean };

/**
 * Read-through cache backed by the org_ai_cache table.
 * Returns cached data when fresh, otherwise calls generator and stores the result.
 */
export async function withInsightsCache<T>(
  admin: AdminClient,
  orgId: string,
  cacheKey: string,
  forceRefresh: boolean,
  generate: () => Promise<T>
): Promise<CachedResult<T>> {
  const now = Date.now();

  if (!forceRefresh) {
    const { data: cached } = await admin
      .from("org_ai_cache")
      .select("content, generated_at, expires_at")
      .eq("org_id", orgId)
      .eq("cache_key", cacheKey)
      .maybeSingle();

    if (cached && new Date(cached.expires_at).getTime() > now) {
      return {
        data: cached.content as T,
        generatedAt: cached.generated_at,
        fromCache: true,
      };
    }
  }

  const fresh = await generate();
  const generatedAt = new Date(now).toISOString();
  const expiresAt = new Date(now + INSIGHTS_TTL_MS).toISOString();

  await admin.from("org_ai_cache").upsert(
    {
      org_id: orgId,
      cache_key: cacheKey,
      content: fresh as unknown as import("@/types/database").Json,
      generated_at: generatedAt,
      expires_at: expiresAt,
    },
    { onConflict: "org_id,cache_key" }
  );

  return { data: fresh, generatedAt, fromCache: false };
}

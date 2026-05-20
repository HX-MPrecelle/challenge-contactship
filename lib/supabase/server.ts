import { createServerClient } from "@supabase/ssr";
import { createClient as createJsClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — Next forbids mutating cookies here.
            // Middleware refreshes the session on every request, so the user's
            // tokens stay current even when this branch swallows the error.
          }
        },
      },
    }
  );
}

/**
 * Service-role client. Bypasses Row Level Security. Only use in trusted server
 * code (webhook handlers, cron jobs) where the operation cannot be tied to a
 * user session — never in code paths reached by an authenticated request.
 */
export function createServiceClient() {
  return createJsClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type AdminClient = SupabaseClient<Database>;

export type NotificationType = "agent_run" | "conflict" | "duplicate" | "hubspot_update" | "sync_error";

export async function createNotification(
  admin: AdminClient,
  orgId: string,
  n: {
    type: NotificationType;
    title: string;
    body?: string;
    link?: string;
  }
): Promise<void> {
  const { error } = await admin.from("notifications").insert({
    org_id: orgId,
    type: n.type,
    title: n.title,
    body: n.body ?? null,
    link: n.link ?? null,
  });
  if (error) console.error("[createNotification]", error);
}

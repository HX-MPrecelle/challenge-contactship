"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";

export type AppNotification = {
  id: string;
  type: "agent_run" | "conflict" | "hubspot_update" | "sync_error";
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
};

export async function getNotifications(): Promise<AppNotification[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const orgId = user.app_metadata?.org_id as string | undefined;
  if (!orgId) return [];

  const { data } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, read, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(20);

  return (data ?? []) as AppNotification[];
}

export async function getUnreadCount(orgId: string): Promise<number> {
  const admin = createServiceClient();
  const { count } = await admin
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("read", false);
  return count ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const orgId = user.app_metadata?.org_id as string | undefined;
  if (!orgId) return;
  await supabase.from("notifications").update({ read: true }).eq("id", id).eq("org_id", orgId);
}

export async function markAllRead(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const orgId = user.app_metadata?.org_id as string | undefined;
  if (!orgId) return;
  await supabase.from("notifications").update({ read: true }).eq("org_id", orgId).eq("read", false);
}

export async function deleteNotification(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const orgId = user.app_metadata?.org_id as string | undefined;
  if (!orgId) return;
  await supabase.from("notifications").delete().eq("id", id).eq("org_id", orgId);
}

export async function clearAllRead(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const orgId = user.app_metadata?.org_id as string | undefined;
  if (!orgId) return;
  await supabase.from("notifications").delete().eq("org_id", orgId).eq("read", true);
}

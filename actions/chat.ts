"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { embedText } from "@/lib/ai/memory";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

type Conversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: unknown[];
  created_at: string;
};

export async function getConversations(): Promise<
  { success: true; data: Conversation[] } | { success: false; error: string }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const { data, error } = await (supabase as AnyClient)
    .from("chat_conversations")
    .select("id, title, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) return { success: false, error: error.message };
  return { success: true, data: data ?? [] };
}

export async function createConversation(
  firstMessage: string
): Promise<{ success: true; data: Conversation } | { success: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const orgId = user.user_metadata?.org_id as string | undefined;
  if (!orgId) return { success: false, error: "Sin organización" };

  // Use first 60 chars of user message as title
  const title = firstMessage.slice(0, 60) + (firstMessage.length > 60 ? "…" : "");

  const { data, error } = await (supabase as AnyClient)
    .from("chat_conversations")
    .insert({ org_id: orgId, user_id: user.id, title })
    .select("id, title, created_at, updated_at")
    .single();

  if (error || !data) return { success: false, error: error?.message ?? "Error al crear conversación" };
  return { success: true, data };
}

export async function getMessages(
  conversationId: string
): Promise<{ success: true; data: Message[] } | { success: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const { data, error } = await (supabase as AnyClient)
    .from("chat_messages")
    .select("id, role, content, citations, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as Message[] };
}

export async function saveMessage(input: {
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  citations?: unknown[];
}): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const { data: inserted, error } = await (supabase as AnyClient)
    .from("chat_messages")
    .insert({
      conversation_id: input.conversationId,
      role: input.role,
      content: input.content,
      citations: input.citations ?? [],
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  // Embed user messages in background so they're searchable as memory context
  // in future conversations. Assistant messages are skipped to save cost.
  if (input.role === "user" && inserted?.id) {
    const messageId = inserted.id as string;
    const content = input.content;
    after(async () => {
      const embedding = await embedText(content);
      if (!embedding) return;
      const admin = createServiceClient();
      await (admin as AnyClient)
        .from("chat_messages")
        .update({ embedding: embedding as unknown as string })
        .eq("id", messageId);
    });
  }

  return { success: true };
}

export async function deleteConversation(
  conversationId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const { error } = await (supabase as AnyClient)
    .from("chat_conversations")
    .delete()
    .eq("id", conversationId)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/chat");
  return { success: true };
}

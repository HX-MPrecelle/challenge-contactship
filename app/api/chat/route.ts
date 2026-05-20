import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  CHAT_SYSTEM_PROMPT,
  formatContactsContext,
  retrieveRelevantContacts,
} from "@/lib/ai/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY no está configurada en el entorno." },
      { status: 500 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const orgId = user.user_metadata?.org_id as string | undefined;
  if (!orgId) {
    return NextResponse.json({ error: "Sin organización" }, { status: 400 });
  }

  const { messages } = (await request.json()) as { messages: UIMessage[] };

  // RAG: embed the user's last message and pull the most relevant contacts.
  // We extract the question from the latest user message — useChat sends the
  // full conversation each turn so the model has history, but we only need
  // the new query for similarity search.
  const latestUserMessage = [...messages]
    .reverse()
    .find((m) => m.role === "user");
  const question = latestUserMessage
    ? latestUserMessage.parts
        .filter((p) => p.type === "text")
        .map((p) => (p as { text: string }).text)
        .join(" ")
    : "";

  const admin = createServiceClient();
  const relevantContacts = question
    ? await retrieveRelevantContacts(admin, orgId, question)
    : [];

  const context = formatContactsContext(relevantContacts);
  const system = `${CHAT_SYSTEM_PROMPT}\n\nContactos relevantes para esta pregunta:\n${context}`;

  const result = streamText({
    model: "openai/gpt-4o-mini",
    system,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}

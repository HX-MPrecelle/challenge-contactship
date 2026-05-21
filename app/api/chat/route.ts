import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type UIMessage,
} from "ai";
import { openai } from "@ai-sdk/openai";
import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { backfillMissingEmbeddings } from "@/lib/ai/embeddings";
import {
  CHAT_SYSTEM_PROMPT,
  formatContactsContext,
  retrieveRelevantContacts,
} from "@/lib/ai/chat";
import { getPersonaInstructions, type ChatPersona } from "@/lib/ai/persona";
import type { ChatUIMessage, ContactCitation } from "@/types/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const RECENT_SAMPLE_LIMIT = 30;

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

  const { messages, persona } = (await request.json()) as {
    messages: UIMessage[];
    persona?: ChatPersona;
  };

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

  // Lazy backfill: bring any contact without an embedding up to date so the
  // similarity search below has something to match. First call after an
  // initial sync done before AI was wired up; no-op thereafter.
  await backfillMissingEmbeddings(admin, orgId);

  // Semantic retrieval — best for "what do these contacts have in common"
  // style questions.
  const relevantContacts = question
    ? await retrieveRelevantContacts(admin, orgId, question)
    : [];

  // Recent sample — best for aggregate questions ("which country has the
  // most leads?") where similarity search would miss the long tail. We
  // include this regardless of how good the semantic match was; the model
  // gets both contexts and decides which to draw from.
  const [{ count: totalContacts }, { data: recentSample }] = await Promise.all([
    admin
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("is_archived", false),
    admin
      .from("contacts")
      .select(
        "first_name, last_name, email, company, job_title, lifecycle_stage, lead_status, country"
      )
      .eq("org_id", orgId)
      .eq("is_archived", false)
      .order("local_updated_at", { ascending: false })
      .limit(RECENT_SAMPLE_LIMIT),
  ]);

  const semanticContext = formatContactsContext(relevantContacts);
  const sampleContext = formatRecentSample(recentSample ?? []);
  const total = totalContacts ?? 0;
  const sampleNote =
    total > RECENT_SAMPLE_LIMIT
      ? `(muestra de ${recentSample?.length ?? 0} contactos más recientes — el total real es ${total})`
      : `(${total} contacto${total === 1 ? "" : "s"} en total)`;

  const system = `${CHAT_SYSTEM_PROMPT}

${getPersonaInstructions(persona)}

Total de contactos del usuario: ${total}.

Contactos más relevantes para esta pregunta (top 20 por similitud semántica):
${semanticContext}

Muestra de contactos recientes ${sampleNote}, útil para preguntas agregadas:
${sampleContext}

Para preguntas tipo "cuántos por país / industria / etapa", calculá la respuesta sobre la muestra que recibís y aclarale al usuario si esa muestra es parcial respecto al total. Para preguntas profundas sobre un patrón específico (qué tienen en común mis customers cerrados, qué señales de riesgo veo, etc.), priorizá los contactos del bloque de similitud semántica.`;

  const citations: ContactCitation[] = relevantContacts.map((c) => ({
    id: c.id,
    name:
      [c.first_name, c.last_name].filter(Boolean).join(" ") ||
      c.email ||
      "Sin nombre",
    company: c.company,
    similarity: c.similarity,
  }));

  // createUIMessageStream lets us interleave typed data parts (citations)
  // with the streamed text — the client useChat hook surfaces them as
  // additional `parts` on the assistant message.
  const modelMessages = await convertToModelMessages(messages);

  const stream = createUIMessageStream<ChatUIMessage>({
    execute: ({ writer }) => {
      if (citations.length > 0) {
        writer.write({
          type: "data-citations",
          id: `citations-${Date.now()}`,
          data: { contacts: citations },
        });
      }

      const result = streamText({
        model: openai("gpt-4o-mini"),
        system,
        messages: modelMessages,
      });

      writer.merge(result.toUIMessageStream());
    },
  });

  return createUIMessageStreamResponse({ stream });
}

function formatRecentSample(
  contacts: Array<{
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    company: string | null;
    job_title: string | null;
    lifecycle_stage: string | null;
    lead_status: string | null;
    country: string | null;
  }>
): string {
  if (contacts.length === 0) {
    return "No hay contactos cargados.";
  }
  return contacts
    .map((c) => {
      const name =
        [c.first_name, c.last_name].filter(Boolean).join(" ") || "—";
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

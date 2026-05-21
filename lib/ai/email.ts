import "server-only";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const MODEL = openai("gpt-4o-mini");

export type EmailTone = "warm" | "concise" | "direct";

const EmailDraftSchema = z.object({
  subject: z
    .string()
    .min(1)
    .max(120)
    .describe("Subject line corto y específico. Evitá clickbait."),
  body: z
    .string()
    .min(1)
    .max(1500)
    .describe(
      "Cuerpo del email en formato texto plano. Saludo, 2-3 párrafos breves, despedida. Usá saltos de línea."
    ),
  rationale: z
    .string()
    .max(300)
    .describe(
      "Una oración explicando por qué este enfoque funciona para este contacto."
    ),
});

export type EmailDraft = z.infer<typeof EmailDraftSchema>;

const TONE_INSTRUCTIONS: Record<EmailTone, string> = {
  warm: "Tono cálido y humano, sin ser empalagoso. Mostrá interés genuino.",
  concise: "Tono profesional y al grano. Cero relleno.",
  direct: "Tono directo y consultivo. Hacé una pregunta concreta o pedido específico.",
};

/**
 * Generate a personalized email draft for a contact. We feed the model the
 * contact's enriched context (basic CRM data + the cached AI insights if
 * available) and ask for subject/body/rationale as a typed object.
 *
 * The rationale field is for the UI — it explains in one line why this draft
 * fits this contact, so the user can decide quickly whether to send as-is or
 * regenerate.
 */
export async function generateEmailDraft(params: {
  contactSummary: string;
  goal: string;
  tone: EmailTone;
}): Promise<EmailDraft | { error: string }> {
  if (!process.env.OPENAI_API_KEY) {
    return { error: "OPENAI_API_KEY no está configurada en el entorno." };
  }

  try {
    const { object } = await generateObject({
      model: MODEL,
      system: `Sos un asistente de ventas B2B. Vas a redactar un email personalizado para un contacto del CRM.

Reglas:
- Hablá siempre en español rioplatense.
- Personalizá el email usando los datos del contacto (cargo, empresa, etapa, contexto).
- ${TONE_INSTRUCTIONS[params.tone]}
- No inventes hechos. Si no tenés información sobre algo, no lo menciones.
- Cerrá con una pregunta o llamado a la acción concreto.
- Terminá el email con la línea de firma: "Saludos, [Tu nombre]" — el placeholder [Tu nombre] lo reemplaza el usuario.`,
      schema: EmailDraftSchema,
      prompt: `Contacto:\n${params.contactSummary}\n\nObjetivo del email: ${params.goal}\n\nGenerá el borrador.`,
    });
    return object;
  } catch (err) {
    console.error("[generateEmailDraft]", err);
    return { error: "GPT no pudo generar el borrador. Intentá de nuevo." };
  }
}

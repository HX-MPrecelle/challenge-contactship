export const PERSONAS = ["concise", "coach", "honest"] as const;
export type ChatPersona = (typeof PERSONAS)[number];

export const PERSONA_LABEL: Record<ChatPersona, string> = {
  concise: "Conciso",
  coach: "Coach",
  honest: "Honesto",
};

export const PERSONA_HINT: Record<ChatPersona, string> = {
  concise: "Bullet points, sin relleno",
  coach: "Motivador y constructivo",
  honest: "Directo, te dice lo que no querés oír",
};

const PERSONA_INSTRUCTIONS: Record<ChatPersona, string> = {
  concise:
    "Modo CONCISO: respondé en bullets cortos. Cero relleno. Si una pregunta admite una sola línea, dala. Cuando recomiendes algo, una oración por recomendación.",
  coach:
    "Modo COACH: respondé como un mentor de ventas. Estructurá la respuesta en (1) lo que observás, (2) por qué importa, (3) qué harías. Tono motivador pero realista. Reforzá las decisiones bien tomadas que veas en la data.",
  honest:
    "Modo HONESTO: priorizá la verdad incómoda sobre la diplomacia. Si la base de contactos tiene gaps, datos incompletos, o señales malas, decilo primero. No suavices conclusiones con condicionales.",
};

export function getPersonaInstructions(persona: ChatPersona | undefined): string {
  const key: ChatPersona = persona && PERSONAS.includes(persona) ? persona : "concise";
  return PERSONA_INSTRUCTIONS[key];
}

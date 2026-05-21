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
    "CONCISE mode: respond in short bullet points. Zero filler. One sentence per recommendation. Match the user's language.",
  coach:
    "COACH mode: respond like a sales mentor. Structure: (1) what you observe, (2) why it matters, (3) what you'd do. Motivating but realistic tone. Reinforce good decisions you see in the data. Match the user's language.",
  honest:
    "HONEST mode: prioritize uncomfortable truths over diplomacy. If the contact base has gaps, incomplete data, or bad signals, say it first. Don't soften conclusions with conditionals. Match the user's language.",
};

export function getPersonaInstructions(persona: ChatPersona | undefined): string {
  const key: ChatPersona = persona && PERSONAS.includes(persona) ? persona : "concise";
  return PERSONA_INSTRUCTIONS[key];
}

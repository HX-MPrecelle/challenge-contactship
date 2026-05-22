/**
 * Central AI model configuration.
 * Override via OPENAI_MODEL env var to switch models without redeployment.
 * All AI functions import from here so a single change propagates everywhere.
 */
export const AI_MODEL_ID = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

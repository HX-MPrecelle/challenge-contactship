export const INDUSTRIES = [
  { value: "Marketing Agency", emoji: "📣", labelEs: "Agencia de marketing" },
  { value: "EdTech",           emoji: "🎓", labelEs: "EdTech / Educación" },
  { value: "FinTech",          emoji: "💰", labelEs: "FinTech / Finanzas" },
  { value: "SaaS",             emoji: "💻", labelEs: "SaaS / Software" },
  { value: "E-commerce",       emoji: "🛒", labelEs: "E-commerce / Retail" },
  { value: "Healthcare",       emoji: "🏥", labelEs: "Salud / MedTech" },
  { value: "Real Estate",      emoji: "🏢", labelEs: "Inmuebles" },
  { value: "HR Tech",          emoji: "👥", labelEs: "HR Tech" },
  { value: "Legal Tech",       emoji: "⚖️", labelEs: "Legal Tech" },
  { value: "Consulting",       emoji: "🧩", labelEs: "Consultoría" },
  { value: "Other",            emoji: "⚡", labelEs: "Otro" },
] as const;

export type IndustryValue = typeof INDUSTRIES[number]["value"];

export function getIndustryLabel(
  value: string | null | undefined,
  locale: "es" | "en" = "es"
): string {
  const found = INDUSTRIES.find((i) => i.value === value);
  if (!found) return value ?? "—";
  return locale === "es" ? found.labelEs : found.value;
}

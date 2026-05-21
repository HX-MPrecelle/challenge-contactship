import { es } from "./locales/es";
import { en } from "./locales/en";
import type { TranslationKey, Locale } from "./locales/es";

export type { Locale, TranslationKey };

export const SUPPORTED_LOCALES: Locale[] = ["es", "en"];
export const DEFAULT_LOCALE: Locale = "es";
export const LOCALE_COOKIE = "locale";

const dictionaries: Record<Locale, Record<string, string>> = { es, en };

/**
 * Translate a key with optional interpolation.
 * Usage: t("dashboard.greeting", { name: "Martín" }) → "Hola, Martín"
 */
export function createT(locale: Locale) {
  const dict = dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
  return function t(key: TranslationKey, vars?: Record<string, string | number>): string {
    let str = dict[key] ?? (dictionaries[DEFAULT_LOCALE][key] ?? key);
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      }
    }
    return str;
  };
}

/** Parse locale from Accept-Language header. */
export function parseAcceptLanguage(header: string | null): Locale {
  if (!header) return DEFAULT_LOCALE;
  const parts = header.split(",");
  for (const part of parts) {
    const lang = part.split(";")[0]?.trim().split("-")[0]?.toLowerCase();
    if (lang && SUPPORTED_LOCALES.includes(lang as Locale)) {
      return lang as Locale;
    }
  }
  return DEFAULT_LOCALE;
}

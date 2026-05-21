import "server-only";
import { cookies } from "next/headers";
import {
  createT,
  LOCALE_COOKIE,
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  type Locale,
} from "./index";

/**
 * Server-side helper: reads the locale cookie and returns { t, locale }.
 * Use in every async Server Component page/layout that needs translations.
 */
export async function getServerT() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined;
  const locale: Locale =
    raw && SUPPORTED_LOCALES.includes(raw) ? raw : DEFAULT_LOCALE;
  return { t: createT(locale), locale };
}

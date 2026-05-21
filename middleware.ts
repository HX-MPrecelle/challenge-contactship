import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse, type NextRequest } from "next/server";
import {
  LOCALE_COOKIE,
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  parseAcceptLanguage,
  type Locale,
} from "@/lib/i18n/index";

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);

  const existing = request.cookies.get(LOCALE_COOKIE)?.value as Locale | undefined;
  if (!existing || !SUPPORTED_LOCALES.includes(existing)) {
    const detected = parseAcceptLanguage(request.headers.get("accept-language"));
    const res = response ?? NextResponse.next();
    res.cookies.set(LOCALE_COOKIE, detected || DEFAULT_LOCALE, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return res;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\.svg|.*\.png|.*\.jpg|.*\.jpeg|.*\.gif|.*\.webp).*)",
  ],
};

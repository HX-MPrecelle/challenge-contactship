"use client";

import { ThemeProvider } from "next-themes";
import { I18nProvider } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/index";

export function Providers({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      storageKey="contactship.theme"
    >
      <I18nProvider locale={locale}>{children}</I18nProvider>
    </ThemeProvider>
  );
}

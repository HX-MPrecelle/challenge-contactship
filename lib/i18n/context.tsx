"use client";

import { createContext, useContext, type ReactNode } from "react";
import { createT, DEFAULT_LOCALE, type Locale, type TranslationKey } from "./index";

type I18nContextValue = {
  locale: Locale;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  t: createT(DEFAULT_LOCALE),
});

export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <I18nContext.Provider value={{ locale, t: createT(locale) }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

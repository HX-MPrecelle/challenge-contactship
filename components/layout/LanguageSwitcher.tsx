"use client";

import { useTransition } from "react";
import { useI18n } from "@/lib/i18n/context";
import { setLocale } from "@/actions/locale";
import type { Locale } from "@/lib/i18n/index";

const FLAGS: Record<Locale, string> = {
  es: "🇦🇷",
  en: "🇺🇸",
};

const LABELS: Record<Locale, string> = {
  es: "ES",
  en: "EN",
};

const OTHER: Record<Locale, Locale> = {
  es: "en",
  en: "es",
};

export function LanguageSwitcher() {
  const { locale, t } = useI18n();
  const [isPending, startTransition] = useTransition();
  const next = OTHER[locale];

  function handleSwitch() {
    startTransition(async () => {
      await setLocale(next);
    });
  }

  return (
    <button
      type="button"
      onClick={handleSwitch}
      disabled={isPending}
      title={t("language.label")}
      className="flex h-[34px] w-full items-center gap-2 rounded-md px-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-subtle hover:text-text-primary disabled:opacity-50"
    >
      <span className="text-base leading-none">{FLAGS[locale]}</span>
      <span className="font-mono text-xs">{LABELS[locale]}</span>
      <span className="text-[10px] text-text-muted">→ {LABELS[next]}</span>
    </button>
  );
}

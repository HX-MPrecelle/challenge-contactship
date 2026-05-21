"use client";

import { useTransition } from "react";
import { useI18n } from "@/lib/i18n/context";
import { setLocale } from "@/actions/locale";
import type { Locale } from "@/lib/i18n/index";

const LOCALES: { value: Locale; flag: string; nativeName: string }[] = [
  { value: "es", flag: "🇦🇷", nativeName: "Español" },
  { value: "en", flag: "🇺🇸", nativeName: "English" },
];

export function LanguageSelector() {
  const { locale } = useI18n();
  const [isPending, startTransition] = useTransition();

  function handleSelect(next: Locale) {
    if (next === locale) return;
    startTransition(async () => {
      await setLocale(next);
    });
  }

  return (
    <div className="inline-flex rounded-lg border border-border-default bg-bg-surface p-0.5">
      {LOCALES.map(({ value, flag, nativeName }) => {
        const active = locale === value;
        return (
          <button
            key={value}
            type="button"
            disabled={isPending}
            onClick={() => handleSelect(value)}
            className={[
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60",
              active
                ? "bg-brand text-white shadow-sm"
                : "text-text-secondary hover:bg-bg-subtle hover:text-text-primary",
            ].join(" ")}
          >
            <span className="text-sm leading-none">{flag}</span>
            {nativeName}
          </button>
        );
      })}
    </div>
  );
}

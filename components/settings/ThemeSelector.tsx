"use client";

import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

type ThemeOption = { value: string; labelKey: Parameters<ReturnType<typeof useI18n>["t"]>[0]; Icon: typeof Sun };

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();

  const OPTIONS: ThemeOption[] = [
    { value: "light",  labelKey: "settings.theme.light",  Icon: Sun },
    { value: "dark",   labelKey: "settings.theme.dark",   Icon: Moon },
    { value: "system", labelKey: "settings.theme.system", Icon: Monitor },
  ];

  return (
    <div className="inline-flex rounded-lg border border-border-default bg-bg-surface p-0.5">
      {OPTIONS.map(({ value, labelKey, Icon }) => {
        const active = theme === value || (!theme && value === "light");
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            className={[
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              active
                ? "bg-brand text-white shadow-sm"
                : "text-text-secondary hover:bg-bg-subtle hover:text-text-primary",
            ].join(" ")}
          >
            <Icon size={13} />
            {t(labelKey)}
          </button>
        );
      })}
    </div>
  );
}

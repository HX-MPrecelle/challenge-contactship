"use client";

import { useTransition } from "react";
import { AlignJustify, List } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { setDensity } from "@/actions/preferences";
import type { TableDensity } from "@/lib/preferences";

export function DensitySelector({ current }: { current: TableDensity }) {
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();

  const OPTIONS: { value: TableDensity; labelKey: Parameters<ReturnType<typeof useI18n>["t"]>[0]; Icon: typeof List }[] = [
    { value: "normal",  labelKey: "settings.density.normal",  Icon: AlignJustify },
    { value: "compact", labelKey: "settings.density.compact", Icon: List },
  ];

  function handleSelect(next: TableDensity) {
    if (next === current) return;
    startTransition(async () => {
      await setDensity(next);
    });
  }

  return (
    <div className="inline-flex rounded-lg border border-border-default bg-bg-surface p-0.5">
      {OPTIONS.map(({ value, labelKey, Icon }) => {
        const active = current === value;
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
            <Icon size={13} />
            {t(labelKey)}
          </button>
        );
      })}
    </div>
  );
}

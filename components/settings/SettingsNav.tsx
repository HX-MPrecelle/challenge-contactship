"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";

export function SettingsNav({ activeSection }: { activeSection: string }) {
  const { t } = useI18n();

  // Group title labels differ by locale
  const orgTitle    = t("settings.general.title");        // "Organización" / "Organization"
  const aiTitle     = "IA";                               // same in both languages
  const ifaceTitle  = t("nav.settings.preferences");      // "Preferencias" / "Preferences"

  const GROUPS = [
    {
      title: orgTitle,
      sections: [
        { id: "general",     label: t("nav.settings.general") },
        { id: "hubspot",     label: t("nav.settings.hubspot") },
        { id: "sync",        label: t("nav.settings.sync") },
      ],
    },
    {
      title: aiTitle,
      sections: [
        { id: "ai",          label: t("nav.settings.ai") },
      ],
    },
    {
      title: ifaceTitle,
      sections: [
        { id: "preferences", label: t("nav.settings.preferences") },
      ],
    },
  ];

  return (
    <aside className="flex w-[200px] shrink-0 flex-col gap-5 pr-6">
      {GROUPS.map((group) => (
        <div key={group.title} className="flex flex-col gap-0.5">
          <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            {group.title}
          </p>
          {group.sections.map((section) => {
            const isActive = activeSection === section.id;
            return (
              <Link
                key={section.id}
                href={`/settings?section=${section.id}`}
                className={[
                  "flex h-8 items-center rounded-md px-3 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-bg-subtle text-text-primary"
                    : "text-text-secondary hover:bg-bg-subtle hover:text-text-primary",
                ].join(" ")}
              >
                {section.label}
              </Link>
            );
          })}
        </div>
      ))}
    </aside>
  );
}

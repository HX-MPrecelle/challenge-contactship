"use client";

import Link from "next/link";

interface NavSection {
  id: string;
  label: string;
}

interface NavGroup {
  title: string;
  sections: NavSection[];
}

const GROUPS: NavGroup[] = [
  {
    title: "Organización",
    sections: [
      { id: "general", label: "General" },
      { id: "hubspot", label: "HubSpot" },
      { id: "sync", label: "Sincronización" },
    ],
  },
  {
    title: "IA",
    sections: [
      { id: "ai", label: "Modelos y comportamiento" },
    ],
  },
];

export function SettingsNav({ activeSection }: { activeSection: string }) {
  return (
    <aside className="flex w-[220px] shrink-0 flex-col gap-5 pr-6">
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

"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Check, Copy, ExternalLink, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/context";
import { mergeContacts } from "@/actions/contacts";
import type { DuplicateGroup } from "@/actions/ai";

export function DuplicatesView({ initialGroups }: { initialGroups: DuplicateGroup[] }) {
  const { t } = useI18n();
  const [groups, setGroups] = useState<DuplicateGroup[]>(initialGroups);
  const [isMerging, startMerge] = useTransition();

  function handleMerge(group: DuplicateGroup) {
    startMerge(async () => {
      const result = await mergeContacts({
        primaryId: group.primary.id,
        secondaryId: group.duplicate.id,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(t("duplicates.merge") + " ✓");
      setGroups((prev) => prev.filter((g) => g.primary.id !== group.primary.id || g.duplicate.id !== group.duplicate.id));
    });
  }

  function handleDismiss(group: DuplicateGroup) {
    setGroups((prev) => prev.filter((g) => g.primary.id !== group.primary.id || g.duplicate.id !== group.duplicate.id));
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border-strong py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
          <Check size={22} />
        </div>
        <p className="text-sm text-text-secondary">{t("duplicates.empty")}</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {groups.map((group) => (
        <li
          key={`${group.primary.id}-${group.duplicate.id}`}
          className="overflow-hidden rounded-xl border border-border-default bg-bg-surface"
        >
          {/* Similarity badge */}
          <div className="flex items-center justify-between border-b border-border-default bg-bg-subtle px-4 py-2">
            <span className="text-xs font-medium text-text-secondary">
              {Math.round(group.similarity * 100)}% similitud semántica
            </span>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-warning" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-warning">
                {t("duplicates.title")}
              </span>
            </div>
          </div>

          {/* Side-by-side comparison */}
          <div className="grid grid-cols-2 divide-x divide-border-default">
            <ContactCard contact={group.primary} label="Principal" />
            <ContactCard contact={group.duplicate} label="Duplicado" tone="muted" />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 border-t border-border-default bg-bg-subtle px-4 py-2.5">
            <p className="text-xs text-text-muted">{t("duplicates.mergeDesc")}</p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleMerge(group)}
                disabled={isMerging}
              >
                <Copy size={12} />
                {t("duplicates.merge")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDismiss(group)}
                disabled={isMerging}
                className="text-text-muted hover:text-error"
              >
                <X size={12} />
                {t("duplicates.keepSeparate")}
              </Button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ContactCard({
  contact,
  label,
  tone = "default",
}: {
  contact: DuplicateGroup["primary"];
  label: string;
  tone?: "default" | "muted";
}) {
  const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.email || "—";
  return (
    <div className="flex flex-col gap-1.5 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[10px] font-semibold uppercase tracking-wider ${tone === "muted" ? "text-text-muted" : "text-brand-on-subtle"}`}>
          {label}
        </span>
        <Link
          href={`/contacts/${contact.id}`}
          className="text-text-muted hover:text-brand"
          target="_blank"
          title="Abrir contacto"
        >
          <ExternalLink size={12} />
        </Link>
      </div>
      <p className="font-medium text-text-primary truncate">{name}</p>
      {contact.email && <p className="truncate font-mono text-xs text-text-muted">{contact.email}</p>}
      {contact.company && <p className="truncate text-xs text-text-secondary">{contact.company}</p>}
      {contact.jobTitle && <p className="truncate text-xs text-text-muted">{contact.jobTitle}</p>}
      {contact.lifecycleStage && (
        <span className="mt-1 w-fit rounded-full border border-border-default bg-bg-subtle px-2 py-0.5 text-[10px] text-text-secondary">
          {contact.lifecycleStage}
        </span>
      )}
    </div>
  );
}

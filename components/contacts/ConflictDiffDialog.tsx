"use client";

import { useEffect, useState, useTransition } from "react";
import { ArrowLeftRight, CheckCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getConflictDiff,
  resolveConflictMerge,
  type ConflictDiff,
  type ConflictField,
} from "@/actions/contacts";
import { useI18n } from "@/lib/i18n/context";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
};

export function ConflictDiffDialog({ open, onOpenChange, contactId }: Props) {
  const { t } = useI18n();
  const [diff, setDiff] = useState<ConflictDiff | null>(null);
  const [choices, setChoices] = useState<Record<string, "local" | "hubspot">>(
    {}
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, startSaving] = useTransition();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setDiff(null);
    getConflictDiff({ id: contactId }).then((result) => {
      if (cancelled) return;
      setIsLoading(false);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setDiff(result.data);
      const defaults: Record<string, "local" | "hubspot"> = {};
      for (const f of result.data.fields) {
        defaults[f.field] = "local";
      }
      setChoices(defaults);
    });
    return () => {
      cancelled = true;
    };
  }, [open, contactId]);

  function applyAll(source: "local" | "hubspot") {
    if (!diff) return;
    const next: Record<string, "local" | "hubspot"> = {};
    for (const f of diff.fields) next[f.field] = source;
    setChoices(next);
  }

  function setFieldChoice(field: ConflictField, source: "local" | "hubspot") {
    setChoices((prev) => ({ ...prev, [field]: source }));
  }

  function save() {
    if (!diff) return;
    const payload = diff.fields.map((f) => ({
      field: f.field,
      source: choices[f.field] ?? "local",
    }));
    startSaving(async () => {
      const result = await resolveConflictMerge({
        id: contactId,
        choices: payload,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(t("conflicts.toast.resolved"));
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-error-subtle">
              <ArrowLeftRight size={15} className="text-error" />
            </div>
            {t("conflicts.dialog.title")}
          </DialogTitle>
          <DialogDescription>
            {t("conflicts.dialog.desc")}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin text-text-muted" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-error/40 bg-error-subtle px-3 py-2 text-xs text-error">
            {error}
          </div>
        ) : diff ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-default bg-bg-elevated px-3 py-2 text-xs text-text-secondary">
              <span>
                Conflicto detectado:{" "}
                {diff.detectedAt
                  ? new Date(diff.detectedAt).toLocaleString("es-AR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })
                  : "—"}
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => applyAll("local")}
                  className="rounded-md border border-border-default bg-bg-surface px-2 py-1 text-[10px] font-medium text-text-primary transition-colors hover:border-border-strong"
                >
                  <CheckCheck size={10} className="mr-1 inline" />
                  {t("conflicts.detail.allLocal")}
                </button>
                <button
                  type="button"
                  onClick={() => applyAll("hubspot")}
                  className="rounded-md border border-border-default bg-bg-surface px-2 py-1 text-[10px] font-medium text-text-primary transition-colors hover:border-border-strong"
                >
                  <CheckCheck size={10} className="mr-1 inline" />
                  {t("conflicts.detail.allHubspot")}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-[80px_1fr_1fr] gap-2 rounded-lg border border-border-default bg-bg-subtle px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-text-muted">
              <span>{t("conflicts.detail.campo")}</span>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-info" />
                {t("conflicts.detail.local")}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                {t("conflicts.detail.hubspot")}
              </div>
            </div>

            <ul className="flex flex-col gap-1.5">
              {diff.fields.map((f) => {
                const choice = choices[f.field] ?? "local";
                return (
                  <li
                    key={f.field}
                    className="grid grid-cols-[80px_1fr_1fr] gap-2"
                  >
                    <span className="flex items-center text-xs font-medium text-text-secondary">
                      {f.label}
                    </span>
                    <DiffCell
                      value={f.local}
                      active={choice === "local"}
                      same={!f.differs}
                      onClick={() => setFieldChoice(f.field, "local")}
                      emptyLabel={t("diffDialog.empty")}
                    />
                    <DiffCell
                      value={f.hubspot}
                      active={choice === "hubspot"}
                      same={!f.differs}
                      onClick={() => setFieldChoice(f.field, "hubspot")}
                      emptyLabel={t("diffDialog.empty")}
                    />
                  </li>
                );
              })}
            </ul>

            {diff.fields.every((f) => !f.differs) && (
              <p className="rounded-lg border border-border-default bg-bg-elevated px-3 py-2 text-xs text-text-secondary">
                Curiosamente, ningún campo difiere — quizás el conflicto ya fue
                resuelto por otro flujo. Podés guardar y forzar la sincronización.
              </p>
            )}
          </div>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            onClick={save}
            disabled={isSaving || isLoading || !diff || !!error}
          >
            {isSaving ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                <span>{t("common.saving")}</span>
              </>
            ) : (
              <span>{t("conflicts.dialog.save")}</span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DiffCell({
  value,
  active,
  same,
  onClick,
  emptyLabel,
}: {
  value: string | null;
  active: boolean;
  same: boolean;
  onClick: () => void;
  emptyLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex min-h-[36px] items-center rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors",
        active
          ? "border-brand bg-brand-subtle text-text-primary"
          : same
            ? "border-border-default bg-bg-elevated text-text-muted"
            : "border-border-default bg-bg-surface text-text-primary hover:border-border-strong",
      ].join(" ")}
    >
      <span className={value ? "" : "italic text-text-muted"}>
        {value || emptyLabel}
      </span>
    </button>
  );
}

"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckCheck, GitMerge, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getConflictDiff, type ConflictDiff, type ConflictDiffField } from "@/actions/contacts";
import { resolveConflictField, skipConflict } from "@/actions/conflicts";
import { useI18n } from "@/lib/i18n/context";

type Props = {
  contact: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    company: string | null;
    job_title: string | null;
    local_updated_at: string;
  };
  onResolved: () => void;
};

export function ConflictDetail({ contact, onResolved }: Props) {
  const { t } = useI18n();
  const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(" ") || t("misc.noName");

  const [diff, setDiff] = useState<ConflictDiff | null>(null);
  const [choices, setChoices] = useState<Record<string, "local" | "hubspot">>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [isSkipping, startSkipping] = useTransition();

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setDiff(null);
    getConflictDiff({ id: contact.id }).then((result) => {
      if (cancelled) return;
      setIsLoading(false);
      if (!result.success) { setError(result.error); return; }
      setDiff(result.data);
      // Default: prefer local for true conflicts
      const defaults: Record<string, "local" | "hubspot"> = {};
      for (const f of result.data.fields) {
        if (f.isConflict || f.differs) defaults[f.field] = "local";
      }
      setChoices(defaults);
    });
    return () => { cancelled = true; };
  }, [contact.id]);

  function applyAll(source: "local" | "hubspot") {
    if (!diff) return;
    const next: Record<string, "local" | "hubspot"> = {};
    for (const f of diff.fields) if (f.isConflict || f.differs) next[f.field] = source;
    setChoices(next);
  }

  function save() {
    if (!diff) return;
    const payload = diff.fields.map((f) => ({
      field: f.field,
      source: choices[f.field] ?? "local",
    }));
    startSaving(async () => {
      const result = await resolveConflictField({ contactId: contact.id, choices: payload });
      if (!result.success) { toast.error(result.error); return; }
      toast.success(t("conflicts.toast.resolved"));
      onResolved();
    });
  }

  function handleSkip() {
    startSkipping(async () => {
      const result = await skipConflict(contact.id);
      if (!result.success) { toast.error(result.error); return; }
      toast.info(t("conflicts.toast.skipped"));
      onResolved();
    });
  }

  // Fields that need manual resolution
  const trueConflicts  = diff?.fields.filter(f => f.isConflict) ?? [];
  // Fields that only differ (2-way fallback, no base_state)
  const fallbackDiffs  = diff && !diff.hasBaseState ? diff.fields.filter(f => f.differs) : [];
  const conflictFields = diff?.hasBaseState ? trueConflicts : fallbackDiffs;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-start gap-4 border-b border-border-default p-6">
        <Avatar size={48} name={fullName} />
        <div className="flex flex-1 flex-col gap-1">
          <h2 className="text-lg font-semibold text-text-primary">{fullName}</h2>
          {contact.email && <span className="font-mono text-xs text-text-muted">{contact.email}</span>}
          {contact.company && <span className="text-sm text-text-secondary">{contact.company}</span>}
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-error-subtle px-2.5 py-1 text-xs font-medium text-error">
          <span className="h-1.5 w-1.5 rounded-full bg-error animate-pulse-dot" />
          {t("status.conflict")}
        </span>
      </div>

      {/* Diff body */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={20} className="animate-spin text-text-muted" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-error/40 bg-error-subtle px-4 py-3 text-sm text-error">{error}</div>
        ) : diff ? (
          <div className="flex flex-col gap-4">
            {/* Timestamp */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-default bg-bg-subtle px-3 py-2 text-xs">
              <span className="font-mono text-text-muted">
                Detectado{" "}
                {diff.detectedAt
                  ? new Date(diff.detectedAt).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })
                  : "—"}
              </span>
              {conflictFields.length > 0 && (
                <div className="flex gap-1.5">
                  <button type="button" onClick={() => applyAll("local")}
                    className="rounded-md border border-border-default bg-bg-surface px-2 py-1 text-[10px] font-medium text-text-primary transition-colors hover:border-border-strong">
                    <CheckCheck size={10} className="mr-1 inline" />{t("conflicts.detail.allLocal")}
                  </button>
                  <button type="button" onClick={() => applyAll("hubspot")}
                    className="rounded-md border border-border-default bg-bg-surface px-2 py-1 text-[10px] font-medium text-text-primary transition-colors hover:border-border-strong">
                    <CheckCheck size={10} className="mr-1 inline" />{t("conflicts.detail.allHubspot")}
                  </button>
                </div>
              )}
            </div>

            {/* Auto-merge banner (only with base_state) */}
            {diff.hasBaseState && diff.autoMergedFields.length > 0 && (
              <div className="flex items-start gap-2.5 rounded-lg border border-success/30 bg-success-subtle px-4 py-3">
                <Sparkles size={14} className="mt-0.5 shrink-0 text-success" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold text-success">Auto-merge disponible</span>
                  <span className="text-xs text-text-secondary">
                    <span className="font-medium">{diff.autoMergedFields.join(", ")}</span> solo cambió en HubSpot — se va a aplicar automáticamente al resolver.
                  </span>
                </div>
              </div>
            )}

            {/* No true conflicts — only auto-mergeable changes */}
            {diff.hasBaseState && conflictFields.length === 0 && diff.autoMergedFields.length > 0 && (
              <div className="flex items-start gap-2.5 rounded-lg border border-brand/30 bg-brand-subtle px-4 py-3">
                <GitMerge size={14} className="mt-0.5 shrink-0 text-brand" />
                <div>
                  <span className="text-xs font-semibold text-brand">Sin conflictos reales</span>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    Cada campo fue modificado por un solo lado. Podés aplicar el merge automático.
                  </p>
                </div>
              </div>
            )}

            {/* True conflict fields (or 2-way fallback) */}
            {conflictFields.length > 0 && (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-[90px_1fr_1fr] gap-2 px-1">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">Campo</span>
                  {diff.hasBaseState ? (
                    <>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-info">↑ Tuyo</span>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-warning">↑ HubSpot</span>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-info" />
                        <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">{t("conflicts.detail.local")}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                        <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">{t("conflicts.detail.hubspot")}</span>
                      </div>
                    </>
                  )}
                </div>

                {diff.hasBaseState && (
                  // 3-way: show base value as context
                  <ul className="flex flex-col gap-2">
                    {conflictFields.map((f) => (
                      <li key={f.field} className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 px-1">
                          <span className="w-[90px] font-mono text-xs font-semibold text-text-secondary">{f.label}</span>
                          <span className="text-[10px] text-text-muted">Base: <em>{f.base || "—"}</em></span>
                        </div>
                        <div className="grid grid-cols-[90px_1fr_1fr] gap-2">
                          <span />
                          <DiffCell value={f.local} active={choices[f.field] === "local"} changed={f.localChanged}
                            onClick={() => setChoices(p => ({ ...p, [f.field]: "local" }))} emptyLabel={t("diffDialog.empty")} />
                          <DiffCell value={f.hubspot} active={choices[f.field] === "hubspot"} changed={f.hubspotChanged}
                            onClick={() => setChoices(p => ({ ...p, [f.field]: "hubspot" }))} emptyLabel={t("diffDialog.empty")} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {!diff.hasBaseState && (
                  // Fallback 2-way display
                  <ul className="flex flex-col gap-1.5">
                    {conflictFields.map((f) => (
                      <li key={f.field} className="grid grid-cols-[90px_1fr_1fr] gap-2">
                        <span className="flex items-center font-mono text-xs text-text-secondary">{f.label}</span>
                        <DiffCell value={f.local} active={choices[f.field] === "local"} changed={f.differs}
                          onClick={() => setChoices(p => ({ ...p, [f.field]: "local" }))} emptyLabel={t("diffDialog.empty")} />
                        <DiffCell value={f.hubspot} active={choices[f.field] === "hubspot"} changed={f.differs}
                          onClick={() => setChoices(p => ({ ...p, [f.field]: "hubspot" }))} emptyLabel={t("diffDialog.empty")} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 border-t border-border-default px-6 py-4">
        <Button variant="ghost" size="sm" onClick={handleSkip} disabled={isSkipping || isSaving}>
          {isSkipping && <Loader2 size={12} className="animate-spin" />}
          {t("conflicts.detail.skip")}
        </Button>
        <Button size="sm" onClick={save} disabled={isSaving || isLoading || !diff || !!error}>
          {isSaving && <Loader2 size={12} className="animate-spin" />}
          {diff?.hasBaseState && conflictFields.length === 0 ? "Aplicar merge automático" : t("conflicts.detail.apply")}
        </Button>
      </div>
    </div>
  );
}

function DiffCell({
  value, active, changed, onClick, emptyLabel,
}: {
  value: string | null; active: boolean; changed: boolean; onClick: () => void; emptyLabel: string;
}) {
  return (
    <button type="button" onClick={onClick} disabled={!changed}
      className={[
        "flex min-h-[36px] items-center rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors",
        active
          ? "border-brand bg-brand-subtle text-text-primary"
          : !changed
            ? "cursor-default border-border-default bg-bg-subtle text-text-muted"
            : "border-border-default bg-bg-surface text-text-primary hover:border-border-strong",
      ].join(" ")}
    >
      <span className={!changed ? "italic" : value ? "" : "italic text-text-muted"}>
        {value || emptyLabel}
      </span>
    </button>
  );
}

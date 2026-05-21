"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getConflictDiff, type ConflictDiff } from "@/actions/contacts";
import { resolveConflictField, skipConflict } from "@/actions/conflicts";

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
  const fullName =
    [contact.first_name, contact.last_name].filter(Boolean).join(" ") ||
    "Sin nombre";

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
      if (!result.success) {
        setError(result.error);
        return;
      }
      setDiff(result.data);
      const defaults: Record<string, "local" | "hubspot"> = {};
      for (const f of result.data.fields) defaults[f.field] = "local";
      setChoices(defaults);
    });
    return () => { cancelled = true; };
  }, [contact.id]);

  function applyAll(source: "local" | "hubspot") {
    if (!diff) return;
    const next: Record<string, "local" | "hubspot"> = {};
    for (const f of diff.fields) next[f.field] = source;
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
      toast.success("Conflicto resuelto");
      onResolved();
    });
  }

  function handleSkip() {
    startSkipping(async () => {
      const result = await skipConflict(contact.id);
      if (!result.success) { toast.error(result.error); return; }
      toast.info("Conflicto pospuesto");
      onResolved();
    });
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-start gap-4 border-b border-border-default p-6">
        <Avatar size={48} name={fullName} />
        <div className="flex flex-1 flex-col gap-1">
          <h2 className="text-lg font-semibold text-text-primary">{fullName}</h2>
          {contact.email && (
            <span className="font-mono text-xs text-text-muted">{contact.email}</span>
          )}
          {contact.company && (
            <span className="text-sm text-text-secondary">{contact.company}</span>
          )}
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-error-subtle px-2.5 py-1 text-xs font-medium text-error">
          <span className="h-1.5 w-1.5 rounded-full bg-error animate-pulse-dot" />
          Conflicto
        </span>
      </div>

      {/* Diff body */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={20} className="animate-spin text-text-muted" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-error/40 bg-error-subtle px-4 py-3 text-sm text-error">
            {error}
          </div>
        ) : diff ? (
          <div className="flex flex-col gap-4">
            {/* Meta bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-default bg-bg-subtle px-3 py-2 text-xs">
              <span className="font-mono text-text-muted">
                Detectado{" "}
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
                  Todo local
                </button>
                <button
                  type="button"
                  onClick={() => applyAll("hubspot")}
                  className="rounded-md border border-border-default bg-bg-surface px-2 py-1 text-[10px] font-medium text-text-primary transition-colors hover:border-border-strong"
                >
                  <CheckCheck size={10} className="mr-1 inline" />
                  Todo HubSpot
                </button>
              </div>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-[90px_1fr_1fr] gap-2 px-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">
                Campo
              </span>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-info" />
                <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">
                  Local (vos)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">
                  HubSpot
                </span>
              </div>
            </div>

            <ul className="flex flex-col gap-1.5">
              {diff.fields.map((f) => {
                const choice = choices[f.field] ?? "local";
                return (
                  <li key={f.field} className="grid grid-cols-[90px_1fr_1fr] gap-2">
                    <span className="flex items-center font-mono text-xs text-text-secondary">
                      {f.label}
                    </span>
                    <DiffCell
                      value={f.local}
                      active={choice === "local"}
                      same={!f.differs}
                      onClick={() => setChoices((p) => ({ ...p, [f.field]: "local" }))}
                    />
                    <DiffCell
                      value={f.hubspot}
                      active={choice === "hubspot"}
                      same={!f.differs}
                      onClick={() => setChoices((p) => ({ ...p, [f.field]: "hubspot" }))}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 border-t border-border-default px-6 py-4">
        <Button variant="ghost" size="sm" onClick={handleSkip} disabled={isSkipping || isSaving}>
          {isSkipping ? <Loader2 size={12} className="animate-spin" /> : null}
          Posponer
        </Button>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={save}
            disabled={isSaving || isLoading || !diff || !!error}
          >
            {isSaving ? (
              <Loader2 size={12} className="animate-spin" />
            ) : null}
            Aplicar selección
          </Button>
        </div>
      </div>
    </div>
  );
}

function DiffCell({
  value,
  active,
  same,
  onClick,
}: {
  value: string | null;
  active: boolean;
  same: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={same}
      className={[
        "flex min-h-[36px] items-center rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors",
        active
          ? "border-brand bg-brand-subtle text-text-primary"
          : same
            ? "cursor-default border-border-default bg-bg-subtle text-text-muted"
            : "border-border-default bg-bg-surface text-text-primary hover:border-border-strong",
      ].join(" ")}
    >
      <span className={same ? "italic" : value ? "" : "italic text-text-muted"}>
        {value || "(vacío)"}
      </span>
    </button>
  );
}

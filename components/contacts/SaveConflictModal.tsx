"use client";

import { useState } from "react";
import { AlertTriangle, Check, Info, Sparkles } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Button } from "@/components/ui/button";
import type { PreflightResult, PreflightField } from "@/actions/contacts";

type Choice = "local" | "hubspot" | "base";

type Props = {
  open: boolean;
  result: PreflightResult;
  onConfirm: (resolved: Record<string, string | null>) => void;
  onCancel: () => void;
};

export function SaveConflictModal({ open, result, onConfirm, onCancel }: Props) {
  const [choices, setChoices] = useState<Record<string, Choice>>(() => {
    const init: Record<string, Choice> = {};
    for (const f of result.trueConflicts) init[f.field] = "local";
    for (const f of result.hubspotOnly)    init[f.field] = "hubspot"; // default: accept HS change
    return init;
  });

  function pick(field: string, choice: Choice) {
    setChoices(p => ({ ...p, [field]: choice }));
  }

  function getLabel(f: PreflightField, choice: Choice): string {
    const v = choice === "local" ? f.local : choice === "hubspot" ? f.hubspot : f.base;
    return v ?? "(vacío)";
  }

  function handleConfirm() {
    const resolved: Record<string, string | null> = {};
    for (const f of [...result.trueConflicts, ...result.hubspotOnly, ...result.userOnly]) {
      const choice = choices[f.field];
      if (choice === "local")   resolved[f.field] = f.local;
      else if (choice === "hubspot") resolved[f.field] = f.hubspot;
      else if (choice === "base")    resolved[f.field] = f.base;
      else resolved[f.field] = f.local; // userOnly: always keep user's value
    }
    onConfirm(resolved);
  }

  const totalDecisions = result.trueConflicts.length + result.hubspotOnly.length;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-border-strong bg-bg-surface shadow-2xl data-[state=open]:animate-in data-[state=open]:zoom-in-95">
          <DialogPrimitive.Title className="sr-only">Cambios detectados antes de guardar</DialogPrimitive.Title>

          {/* Header */}
          <div className="flex items-center gap-3 border-b border-border-default px-5 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning-subtle text-warning">
              <AlertTriangle size={15} />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">Cambios detectados en HubSpot</p>
              <p className="text-xs text-text-muted">Revisá y confirmá cómo querés guardar</p>
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto px-5 py-4 flex flex-col gap-5">

            {/* True conflicts */}
            {result.trueConflicts.length > 0 && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle size={12} className="text-error" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-error">Conflicto — los dos cambiaron este campo</span>
                </div>
                {result.trueConflicts.map(f => (
                  <FieldChoice key={f.field} f={f} choice={choices[f.field] ?? "local"} onChange={c => pick(f.field, c)} />
                ))}
              </div>
            )}

            {/* HubSpot-only changes */}
            {result.hubspotOnly.length > 0 && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-1.5">
                  <Info size={12} className="text-warning" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-warning">HubSpot también cambió esto</span>
                </div>
                {result.hubspotOnly.map(f => (
                  <FieldChoice key={f.field} f={f} choice={choices[f.field] ?? "hubspot"} onChange={c => pick(f.field, c)} showBase />
                ))}
              </div>
            )}

            {/* User-only — informational */}
            {result.userOnly.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={12} className="text-success" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-success">Tus cambios — sin conflicto</span>
                </div>
                <ul className="flex flex-col gap-1">
                  {result.userOnly.map(f => (
                    <li key={f.field} className="flex items-center gap-2 text-xs text-text-secondary">
                      <span className="w-24 shrink-0 font-medium text-text-muted">{f.label}</span>
                      <span className="text-text-muted line-through">{f.base || "(vacío)"}</span>
                      <span className="text-text-muted">→</span>
                      <span className="text-text-primary font-medium">{f.local || "(vacío)"}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 border-t border-border-default px-5 py-3">
            <button type="button" onClick={onCancel} className="text-sm text-text-muted hover:text-text-primary">
              Cancelar
            </button>
            <Button size="sm" onClick={handleConfirm}>
              <Check size={13} />
              {totalDecisions > 0 ? "Guardar resolución" : "Guardar cambios"}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function FieldChoice({
  f, choice, onChange, showBase = false,
}: {
  f: PreflightField; choice: Choice; onChange: (c: Choice) => void; showBase?: boolean;
}) {
  const options: { value: Choice; label: string; valueText: string | null; color: string }[] = [
    { value: "local",   label: "Tuyo",    valueText: f.local,   color: "border-brand/40 bg-brand-subtle text-brand" },
    { value: "hubspot", label: "HubSpot", valueText: f.hubspot, color: "border-warning/40 bg-warning-subtle text-warning" },
  ];
  if (showBase) options.push({ value: "base", label: "Revertir", valueText: f.base, color: "border-border-default bg-bg-subtle text-text-muted" });

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-text-secondary">{f.label}</span>
      {f.base && showBase && (
        <span className="text-[10px] text-text-muted">Base: <em>{f.base}</em></span>
      )}
      <div className="flex gap-2">
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={[
              "flex flex-1 flex-col gap-0.5 rounded-lg border px-3 py-2 text-left transition-colors",
              choice === opt.value ? opt.color : "border-border-default bg-bg-surface text-text-primary hover:border-border-strong",
            ].join(" ")}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{opt.label}</span>
            <span className="text-xs">{opt.valueText || "(vacío)"}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

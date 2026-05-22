"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Bot, CheckCircle2, Loader2, Mail, TriangleAlert, X, Zap } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/context";
import { createClient } from "@/lib/supabase/client";
import { runAgentAction, type AgentActionRow } from "@/actions/agent";

const THRESHOLD_PRESETS = [
  { label: "1 día",   days: 1 },
  { label: "7 días",  days: 7 },
  { label: "14 días", days: 14 },
  { label: "30 días", days: 30 },
  { label: "60 días", days: 60 },
  { label: "Todos",   days: 0 },
] as const;

const ACTION_ICON: Record<string, React.ReactNode> = {
  follow_up_email: <Mail size={13} />,
  re_engagement:   <Zap size={13} />,
  risk_alert:      <TriangleAlert size={13} />,
  opportunity:     <Bot size={13} />,
};

const ACTION_COLOR: Record<string, string> = {
  follow_up_email: "text-brand bg-brand-subtle border-brand/20",
  re_engagement:   "text-warning bg-warning-subtle border-warning/20",
  risk_alert:      "text-error bg-error-subtle border-error/20",
  opportunity:     "text-success bg-success-subtle border-success/20",
};

type Props = {
  orgId: string;
  locale: string;
  onDone: () => void;
};

type Phase = "idle" | "running" | "done";

export function AgentRunModal({ orgId, locale, onDone }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [threshold, setThreshold] = useState(30);
  const [phase, setPhase] = useState<Phase>("idle");
  const [streamedActions, setStreamedActions] = useState<AgentActionRow[]>([]);
  const [totalExpected, setTotalExpected] = useState<number | null>(null);
  const [isStarting, startRun] = useTransition();
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  function handleOpen() {
    setPhase("idle");
    setStreamedActions([]);
    setTotalExpected(null);
    setOpen(true);
  }

  // Auto-close 1.2s after done — no extra button needed
  useEffect(() => {
    if (phase !== "done") return;
    const t = setTimeout(() => {
      if (channelRef.current) {
        createClient().removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setOpen(false);
      onDone();
    }, 1200);
    return () => clearTimeout(t);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleClose() {
    if (channelRef.current) {
      createClient().removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setOpen(false);
    if (phase === "done") onDone();
  }

  function startListening() {
    const supabase = createClient();
    const channel = supabase
      .channel(`agent-run-${orgId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "agent_actions", filter: `org_id=eq.${orgId}` },
        (payload) => {
          const row = payload.new as AgentActionRow;
          setStreamedActions((prev) =>
            prev.some((a) => a.id === row.id) ? prev : [...prev, row]
          );
        }
      )
      .subscribe();
    channelRef.current = channel;
  }

  function handleRun() {
    startListening();
    setPhase("running");
    startRun(async () => {
      const result = await runAgentAction({
        locale: locale as "es" | "en",
        thresholdDays: threshold,
      });
      if (!result.success) {
        toast.error(t("agent.error"));
        setPhase("idle");
        return;
      }
      setTotalExpected(result.data.actionsGenerated);
      setPhase("done");
    });
  }

  return (
    <>
      <Button onClick={handleOpen} size="sm" variant="secondary">
        <Bot size={14} />
        {t("agent.run")}
      </Button>

      <DialogPrimitive.Root open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-border-strong bg-bg-surface shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
            <DialogPrimitive.Title className="sr-only">Ejecutar Agente IA</DialogPrimitive.Title>

            {/* Header */}
            <div className="flex items-center justify-between border-b border-border-default px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-subtle text-brand">
                  <Bot size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">Agente IA</p>
                  <p className="text-xs text-text-muted">
                    {phase === "idle" && "Configurá y ejecutá el análisis"}
                    {phase === "running" && "Analizando contactos…"}
                    {phase === "done" && `${totalExpected ?? streamedActions.length} acción${(totalExpected ?? streamedActions.length) === 1 ? "" : "es"} generada${(totalExpected ?? streamedActions.length) === 1 ? "" : "s"}`}
                  </p>
                </div>
              </div>
              <button onClick={handleClose} className="text-text-muted hover:text-text-primary">
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="flex flex-col gap-4 p-5">

              {/* Threshold selector — only in idle */}
              {phase === "idle" && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                    Analizar contactos sin actividad hace más de
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {THRESHOLD_PRESETS.map((p) => (
                      <button
                        key={p.days}
                        type="button"
                        onClick={() => setThreshold(p.days)}
                        className={[
                          "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                          threshold === p.days
                            ? "border-brand/40 bg-brand text-white"
                            : "border-border-default text-text-secondary hover:border-brand/30 hover:text-text-primary",
                        ].join(" ")}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-text-muted">
                    {threshold === 0
                      ? "Modo demo — analiza los contactos más relevantes sin importar su última actividad."
                      : `El agente busca customers, SQLs, oportunidades y leads nuevos sin actividad en los últimos ${threshold} días.`}
                  </p>
                </div>
              )}

              {/* Streaming actions */}
              {(phase === "running" || phase === "done") && (
                <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
                  {streamedActions.length === 0 && phase === "running" && (
                    <div className="flex items-center gap-2 rounded-lg border border-border-default bg-bg-subtle px-3 py-2.5 text-sm text-text-secondary">
                      <Loader2 size={14} className="animate-spin text-brand" />
                      Analizando contactos con IA…
                    </div>
                  )}
                  {streamedActions.map((action) => {
                    const contact = action.contact as { first_name?: string | null; last_name?: string | null; company?: string | null } | null;
                    const contactName = contact
                      ? [contact.first_name, contact.last_name].filter(Boolean).join(" ") || "—"
                      : "—";
                    const colorClass = ACTION_COLOR[action.action_type] ?? ACTION_COLOR.risk_alert;
                    return (
                      <div key={action.id} className="flex items-center gap-3 rounded-lg border border-border-default bg-bg-surface px-3 py-2.5 animate-in fade-in slide-in-from-bottom-1 duration-300">
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${colorClass}`}>
                          {ACTION_ICON[action.action_type]}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-text-primary">{action.title}</p>
                          <p className="truncate text-[10px] text-text-muted">{contactName}{contact?.company ? ` · ${contact.company}` : ""}</p>
                        </div>
                        <CheckCircle2 size={14} className="shrink-0 text-success" />
                      </div>
                    );
                  })}
                  {phase === "running" && streamedActions.length > 0 && (
                    <div className="flex items-center gap-2 px-1 py-1 text-xs text-text-muted">
                      <Loader2 size={12} className="animate-spin" />
                      Generando más acciones…
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-border-default px-5 py-3">
              {phase === "idle" && (
                <>
                  <Button variant="ghost" size="sm" onClick={handleClose}>Cancelar</Button>
                  <Button size="sm" onClick={handleRun} disabled={isStarting}>
                    {isStarting ? <Loader2 size={13} className="animate-spin" /> : <Bot size={13} />}
                    Analizar
                  </Button>
                </>
              )}
              {phase === "running" && (
                <p className="text-xs text-text-muted">Esto puede tomar hasta 60 segundos…</p>
              )}
              {phase === "done" && (
                <div className="flex items-center gap-2 text-xs text-success">
                  <CheckCircle2 size={14} />
                  Listo — redirigiendo a la bandeja…
                </div>
              )}
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}

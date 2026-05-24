"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Mail,
  TriangleAlert,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/context";
import { AgentRunModal } from "@/components/agent/AgentRunModal";
import { createClient } from "@/lib/supabase/client";
import {
  dismissAgentAction,
  approveAgentAction,
  markAgentActionActed,
  getAgentHistory,
  type AgentActionRow,
  type AgentStats,
} from "@/actions/agent";

const ACTION_ICON: Record<string, React.ReactNode> = {
  follow_up_email: <Mail size={14} />,
  re_engagement:   <Zap size={14} />,
  risk_alert:      <TriangleAlert size={14} />,
  opportunity:     <Bot size={14} />,
};

const ACTION_TONE: Record<string, { card: string; icon: string; badge: string }> = {
  follow_up_email: { card: "border-brand/20",   icon: "border-brand/30 bg-brand-subtle text-brand",       badge: "bg-brand/10 text-brand" },
  re_engagement:   { card: "border-warning/20", icon: "border-warning/30 bg-warning-subtle text-warning", badge: "bg-warning/10 text-warning" },
  risk_alert:      { card: "border-error/20",   icon: "border-error/30 bg-error-subtle text-error",       badge: "bg-error/10 text-error" },
  opportunity:     { card: "border-success/20", icon: "border-success/30 bg-success-subtle text-success", badge: "bg-success/10 text-success" },
};

const ACTION_LABEL: Record<string, string> = {
  follow_up_email: "Email de seguimiento",
  re_engagement:   "Re-engagement",
  risk_alert:      "Alerta de riesgo",
  opportunity:     "Oportunidad",
};

type Tab = "pending" | "approved" | "dismissed";

export function AgentInbox({
  initialActions,
  locale,
  orgId,
  stats,
}: {
  initialActions: AgentActionRow[];
  locale: string;
  orgId: string;
  stats: AgentStats;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("pending");
  const [pending,   setPending]   = useState<AgentActionRow[]>(initialActions);
  const [approved,  setApproved]  = useState<AgentActionRow[]>([]);
  const [dismissed, setDismissed] = useState<AgentActionRow[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [localStats, setLocalStats] = useState<AgentStats>(stats);

  // Sync pending from server on refresh
  useEffect(() => { setPending(initialActions); }, [initialActions]);
  useEffect(() => { setLocalStats(stats); }, [stats]);

  // Load history lazily when user clicks the tab
  useEffect(() => {
    if ((activeTab === "approved" || activeTab === "dismissed") && !historyLoaded) {
      Promise.all([
        getAgentHistory("approved"),
        getAgentHistory("dismissed"),
      ]).then(([approvedRes, dismissedRes]) => {
        if (approvedRes.success) setApproved(approvedRes.data);
        if (dismissedRes.success) setDismissed(dismissedRes.data);
        setHistoryLoaded(true);
      });
    }
  }, [activeTab, historyLoaded]);

  // Realtime: pick up new agent_actions as they're generated
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`agent-inbox-rt-${orgId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "agent_actions", filter: `org_id=eq.${orgId}` },
        (payload) => {
          const row = payload.new as AgentActionRow;
          setPending((prev) => prev.some((a) => a.id === row.id) ? prev : [row, ...prev]);
          setLocalStats((s) => ({ ...s, pending: s.pending + 1, total: s.total + 1 }));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orgId]);

  function toggleOpen(id: string) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  async function handleDismiss(id: string) {
    const result = await dismissAgentAction({ id });
    if (!result.success) { toast.error(result.error); return; }
    const action = pending.find(a => a.id === id);
    setPending((prev) => prev.filter((a) => a.id !== id));
    if (action) setDismissed((prev) => [{ ...action, status: "dismissed" }, ...prev]);
    setLocalStats((s) => ({ ...s, pending: Math.max(0, s.pending - 1), dismissed: s.dismissed + 1 }));
    if (openId === id) setOpenId(null);
  }

  async function handleApprove(id: string) {
    const result = await approveAgentAction({ id });
    if (!result.success) { toast.error(result.error); return; }
    const action = pending.find(a => a.id === id);
    setPending((prev) => prev.map((a) => a.id === id ? { ...a, status: "approved" } : a));
    if (action) setApproved((prev) => [{ ...action, status: "approved" }, ...prev]);
    setLocalStats((s) => ({ ...s, pending: Math.max(0, s.pending - 1), approved: s.approved + 1,
      approvalRate: Math.round(((s.approved + 1 + s.acted) / Math.max(1, s.approved + 1 + s.acted + s.dismissed)) * 100) }));
    toast.success("Acción aprobada y guardada en el historial.");
  }

  async function handleAct(id: string, emailUrl: string) {
    await markAgentActionActed({ id });
    window.open(emailUrl, "_blank");
    setPending((prev) => prev.map((a) => a.id === id ? { ...a, status: "acted" } : a));
    setLocalStats((s) => ({ ...s, acted: s.acted + 1 }));
  }

  const currentList = activeTab === "pending" ? pending : activeTab === "approved" ? approved : dismissed;

  const tabCount = {
    pending:   localStats.pending,
    approved:  localStats.approved + localStats.acted,
    dismissed: localStats.dismissed,
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header: stats + run button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-text-muted">
            <span className="font-semibold text-text-primary">{localStats.total}</span> acciones (30d)
          </span>
          {localStats.total > 0 && (
            <span className={`font-semibold ${localStats.approvalRate >= 60 ? "text-success" : localStats.approvalRate >= 30 ? "text-warning" : "text-error"}`}>
              {localStats.approvalRate}% aprobación
            </span>
          )}
        </div>
        <AgentRunModal
          orgId={orgId}
          locale={locale}
          onDone={() => { setHistoryLoaded(false); router.refresh(); }}
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-default">
        {(["pending", "approved", "dismissed"] as Tab[]).map((tab) => {
          const labels = { pending: "Pendientes", approved: "Aprobadas", dismissed: "Descartadas" };
          const count = tabCount[tab];
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={[
                "relative px-4 py-2.5 text-sm font-medium transition-colors",
                activeTab === tab
                  ? "text-text-primary after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-brand after:rounded-t-full"
                  : "text-text-secondary hover:text-text-primary",
              ].join(" ")}
            >
              {labels[tab]}
              {count > 0 && (
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  tab === "pending" ? "bg-warning/15 text-warning" : "bg-bg-subtle text-text-muted"
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Empty state */}
      {currentList.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border-strong py-12 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10 text-success">
            <Check size={18} />
          </div>
          <p className="text-sm text-text-secondary">
            {activeTab === "pending"
              ? t("agent.empty.desc")
              : activeTab === "approved"
                ? "No hay acciones aprobadas en los últimos 30 días."
                : "No hay acciones descartadas en los últimos 30 días."}
          </p>
        </div>
      )}

      {/* Action cards */}
      <ul className="flex flex-col gap-2.5">
        {currentList.map((action) => {
          const isOpen  = openId === action.id;
          const isPending = action.status === "pending";
          const tone = ACTION_TONE[action.action_type] ?? ACTION_TONE.risk_alert!;
          const contact = action.contact as { first_name?: string | null; last_name?: string | null; email?: string | null; company?: string | null } | null;
          const contactName = contact
            ? [contact.first_name, contact.last_name].filter(Boolean).join(" ") || contact.email || "—"
            : "—";
          const statusBadge = action.status === "approved"
            ? "bg-success/10 text-success"
            : action.status === "acted"
              ? "bg-brand/10 text-brand"
              : action.status === "dismissed"
                ? "bg-bg-subtle text-text-muted"
                : "";

          return (
            <li key={action.id} className={`overflow-hidden rounded-xl border bg-bg-surface transition-all ${tone.card}`}>
              <button
                type="button"
                onClick={() => toggleOpen(action.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${tone.icon}`}>
                  {ACTION_ICON[action.action_type]}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-semibold text-text-primary">{action.title}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${tone.badge}`}>
                      {ACTION_LABEL[action.action_type]}
                    </span>
                    {!isPending && (
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadge}`}>
                        {action.status === "approved" ? "Aprobada" : action.status === "acted" ? "Email abierto" : "Descartada"}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    {action.contact_id ? (
                      <Link href={`/contacts/${action.contact_id}`} onClick={(e) => e.stopPropagation()}
                        className="text-xs text-text-muted hover:text-brand hover:underline flex items-center gap-0.5">
                        {contactName}{contact?.company ? ` · ${contact.company}` : ""}
                        <ExternalLink size={10} />
                      </Link>
                    ) : (
                      <span className="text-xs text-text-muted">{contactName}</span>
                    )}
                  </div>
                </div>
                <span className="shrink-0 text-text-muted">
                  {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </span>
              </button>

              {isOpen && (
                <div className="flex flex-col gap-4 border-t border-border-default px-4 pb-4 pt-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Por qué este contacto</span>
                    <p className="text-sm text-text-secondary leading-relaxed">{action.reasoning}</p>
                  </div>

                  {action.draft_subject && action.draft_body && (
                    <div className="flex flex-col gap-0 rounded-lg border border-border-default overflow-hidden">
                      <div className="bg-bg-subtle px-4 py-3 border-b border-border-default">
                        <div className="flex items-center gap-2 text-xs text-text-muted">
                          <span className="font-medium text-text-secondary w-8">De:</span>
                          <span>Tu nombre &lt;vos@tuempresa.com&gt;</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-text-muted mt-1">
                          <span className="font-medium text-text-secondary w-8">Para:</span>
                          <span>{contactName}{contact?.email ? ` <${contact.email}>` : ""}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs mt-1">
                          <span className="w-8 font-medium text-text-secondary text-xs">Asunto:</span>
                          <span className="text-text-primary font-medium text-xs">{action.draft_subject}</span>
                        </div>
                      </div>
                      <div className="bg-white px-4 py-3 dark:bg-bg-surface">
                        <p className="whitespace-pre-wrap text-sm text-text-primary leading-relaxed">{action.draft_body}</p>
                      </div>
                      {contact?.email && (
                        <div className="bg-bg-subtle border-t border-border-default px-4 py-2">
                          <button
                            type="button"
                            onClick={() => {
                              const url = `mailto:${contact.email}?subject=${encodeURIComponent(action.draft_subject!)}&body=${encodeURIComponent(action.draft_body!)}`;
                              handleAct(action.id, url);
                            }}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:underline"
                          >
                            <Mail size={12} /> Abrir en cliente de email
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {isPending && (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => handleApprove(action.id)}>
                          <Check size={12} /> Aprobar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDismiss(action.id)}
                          className="text-text-muted hover:text-error">
                          <X size={12} /> Descartar
                        </Button>
                      </div>
                      <p className="text-[11px] text-text-muted leading-relaxed">
                        <strong>Aprobar</strong> guarda en historial. <strong>Descartar</strong> elimina de la bandeja y ajusta las futuras recomendaciones del agente.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

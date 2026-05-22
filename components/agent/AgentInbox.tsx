"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import {
  dismissAgentAction,
  approveAgentAction,
  type AgentActionRow,
} from "@/actions/agent";

const ACTION_ICON: Record<string, React.ReactNode> = {
  follow_up_email: <Mail size={14} />,
  re_engagement:   <Zap size={14} />,
  risk_alert:      <TriangleAlert size={14} />,
  opportunity:     <Bot size={14} />,
};

const ACTION_TONE: Record<string, { card: string; icon: string; badge: string }> = {
  follow_up_email: {
    card:  "border-brand/20",
    icon:  "border-brand/30 bg-brand-subtle text-brand",
    badge: "bg-brand/10 text-brand",
  },
  re_engagement: {
    card:  "border-warning/20",
    icon:  "border-warning/30 bg-warning-subtle text-warning",
    badge: "bg-warning/10 text-warning",
  },
  risk_alert: {
    card:  "border-error/20",
    icon:  "border-error/30 bg-error-subtle text-error",
    badge: "bg-error/10 text-error",
  },
  opportunity: {
    card:  "border-success/20",
    icon:  "border-success/30 bg-success-subtle text-success",
    badge: "bg-success/10 text-success",
  },
};

const ACTION_LABEL: Record<string, string> = {
  follow_up_email: "Email de seguimiento",
  re_engagement:   "Re-engagement",
  risk_alert:      "Alerta de riesgo",
  opportunity:     "Oportunidad",
};

export function AgentInbox({
  initialActions,
  locale,
  orgId,
}: {
  initialActions: AgentActionRow[];
  locale: string;
  orgId: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [actions, setActions] = useState<AgentActionRow[]>(initialActions);
  const [openId, setOpenId] = useState<string | null>(null); // accordion: only one open

  function toggleOpen(id: string) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  async function handleDismiss(id: string) {
    const result = await dismissAgentAction({ id });
    if (!result.success) { toast.error(result.error); return; }
    setActions((prev) => prev.filter((a) => a.id !== id));
    if (openId === id) setOpenId(null);
  }

  async function handleApprove(id: string) {
    const result = await approveAgentAction({ id });
    if (!result.success) { toast.error(result.error); return; }
    setActions((prev) => prev.map((a) => a.id === id ? { ...a, status: "approved" } : a));
    toast.success("Acción aprobada y guardada en el historial.");
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Run button — opens the modal */}
      <div className="flex items-center justify-end">
        <AgentRunModal
          orgId={orgId}
          locale={locale}
          onDone={() => router.refresh()}
        />
      </div>

      {/* Empty state */}
      {actions.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border-strong py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
            <Check size={22} />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-semibold text-text-primary">{t("agent.empty.title")}</h3>
            <p className="max-w-xs text-xs text-text-secondary">{t("agent.empty.desc")}</p>
          </div>
        </div>
      )}

      {/* Action cards */}
      <ul className="flex flex-col gap-2.5">
        {actions.map((action) => {
          const isOpen = openId === action.id;
          const approved = action.status === "approved";
          const tone = ACTION_TONE[action.action_type] ?? ACTION_TONE.risk_alert!;
          const contact = action.contact as {
            first_name?: string | null;
            last_name?: string | null;
            email?: string | null;
            company?: string | null;
          } | null;
          const contactName = contact
            ? [contact.first_name, contact.last_name].filter(Boolean).join(" ") || contact.email || "—"
            : "—";

          return (
            <li
              key={action.id}
              className={`overflow-hidden rounded-xl border bg-bg-surface transition-all ${approved ? "opacity-60" : tone.card}`}
            >
              {/* Card header — always visible */}
              <button
                type="button"
                onClick={() => toggleOpen(action.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${tone.icon}`}>
                  {ACTION_ICON[action.action_type]}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="truncate text-sm font-semibold text-text-primary">{action.title}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${tone.badge}`}>
                      {ACTION_LABEL[action.action_type]}
                    </span>
                    {approved && (
                      <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
                        Aprobada
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {action.contact_id ? (
                      <Link
                        href={`/contacts/${action.contact_id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-text-muted hover:text-brand hover:underline flex items-center gap-0.5"
                      >
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

              {/* Expanded detail */}
              {isOpen && (
                <div className="flex flex-col gap-4 border-t border-border-default px-4 pb-4 pt-4">
                  {/* Reasoning */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                      Por qué este contacto
                    </span>
                    <p className="text-sm text-text-secondary leading-relaxed">{action.reasoning}</p>
                  </div>

                  {/* Email draft — formatted */}
                  {action.draft_subject && action.draft_body && (
                    <div className="flex flex-col gap-0 rounded-lg border border-border-default overflow-hidden">
                      {/* Email header */}
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
                      {/* Email body */}
                      <div className="bg-white px-4 py-3 dark:bg-bg-surface">
                        <p className="whitespace-pre-wrap text-sm text-text-primary leading-relaxed">
                          {action.draft_body}
                        </p>
                      </div>
                      {/* Email actions */}
                      {contact?.email && (
                        <div className="bg-bg-subtle border-t border-border-default px-4 py-2 flex items-center gap-2">
                          <a
                            href={`mailto:${contact.email}?subject=${encodeURIComponent(action.draft_subject)}&body=${encodeURIComponent(action.draft_body)}`}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:underline"
                          >
                            <Mail size={12} /> Abrir en cliente de email
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Approve / Dismiss with explanation */}
                  {!approved && (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => handleApprove(action.id)}>
                          <Check size={12} />
                          Aprobar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDismiss(action.id)}
                          className="text-text-muted hover:text-error"
                        >
                          <X size={12} />
                          Descartar
                        </Button>
                      </div>
                      <p className="text-[11px] text-text-muted leading-relaxed">
                        <strong>Aprobar</strong> marca esta acción como revisada y la guarda en el historial.{" "}
                        <strong>Descartar</strong> la elimina de tu bandeja sin registrarla.
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

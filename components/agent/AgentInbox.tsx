"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Mail,
  TriangleAlert,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/context";
import {
  runAgentAction,
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

const ACTION_TONE: Record<string, string> = {
  follow_up_email: "border-brand/30 bg-brand-subtle text-brand-on-subtle",
  re_engagement:   "border-warning/30 bg-warning-subtle text-warning",
  risk_alert:      "border-error/30 bg-error-subtle text-error",
  opportunity:     "border-success/30 bg-success-subtle text-success",
};

export function AgentInbox({
  initialActions,
  locale,
}: {
  initialActions: AgentActionRow[];
  locale: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [actions, setActions] = useState<AgentActionRow[]>(initialActions);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [isRunning, startRun] = useTransition();

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleRun() {
    startRun(async () => {
      const result = await runAgentAction({ locale });
      if (!result.success) {
        toast.error(t("agent.error"));
        return;
      }
      const n = result.data.actionsGenerated;
      toast.success(
        t("agent.ran", { n, plural: n === 1 ? "" : "es", pluralf: n === 1 ? "" : "s" })
      );
      router.refresh();
    });
  }

  async function handleDismiss(id: string) {
    const result = await dismissAgentAction({ id });
    if (!result.success) { toast.error(result.error); return; }
    setActions((prev) => prev.filter((a) => a.id !== id));
  }

  async function handleApprove(id: string) {
    const result = await approveAgentAction({ id });
    if (!result.success) { toast.error(result.error); return; }
    setActions((prev) => prev.map((a) => a.id === id ? { ...a, status: "approved" } : a));
    toast.success(t("agent.card.approved"));
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Run button */}
      <div className="flex items-center justify-end">
        <Button onClick={handleRun} disabled={isRunning} size="sm" variant="secondary">
          {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />}
          {isRunning ? t("agent.running") : t("agent.run")}
        </Button>
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
      <ul className="flex flex-col gap-3">
        {actions.map((action) => {
          const isOpen = expanded.has(action.id);
          const contact = action.contact as { first_name?: string | null; last_name?: string | null; email?: string | null; company?: string | null } | null;
          const contactName = contact
            ? [contact.first_name, contact.last_name].filter(Boolean).join(" ") || contact.email || "—"
            : "—";
          const tone = ACTION_TONE[action.action_type] ?? ACTION_TONE.risk_alert;
          const approved = action.status === "approved";

          return (
            <li
              key={action.id}
              className={`overflow-hidden rounded-xl border transition-colors ${approved ? "border-success/30 bg-success-subtle/30 opacity-70" : "border-border-default bg-bg-surface"}`}
            >
              {/* Card header */}
              <div className="flex items-start gap-3 p-4">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${tone}`}>
                  {ACTION_ICON[action.action_type]}
                </div>
                <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-text-primary truncate">{action.title}</span>
                    {approved && (
                      <span className="shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-medium text-success">
                        {t("agent.card.approved")}
                      </span>
                    )}
                  </div>
                  {contact && action.contact_id ? (
                    <Link href={`/contacts/${action.contact_id}`} className="text-xs text-text-secondary hover:text-brand hover:underline truncate">
                      {contactName}{contact.company ? ` · ${contact.company}` : ""}
                    </Link>
                  ) : (
                    <span className="text-xs text-text-muted">{contactName}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => toggleExpand(action.id)}
                  className="shrink-0 text-text-muted hover:text-text-primary"
                >
                  {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>

              {/* Expanded detail */}
              {isOpen && (
                <div className="flex flex-col gap-3 border-t border-border-default px-4 pb-4 pt-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                      {t("agent.card.reasoning")}
                    </span>
                    <p className="text-sm text-text-secondary">{action.reasoning}</p>
                  </div>

                  {action.draft_subject && action.draft_body && (
                    <div className="flex flex-col gap-2 rounded-lg border border-border-default bg-bg-subtle p-3">
                      <p className="text-xs font-medium text-text-secondary">
                        {t("agent.card.draft")}: <span className="text-text-primary">{action.draft_subject}</span>
                      </p>
                      <p className="text-xs text-text-secondary whitespace-pre-wrap">{action.draft_body}</p>
                      {contact?.email && (
                        <a
                          href={`mailto:${contact.email}?subject=${encodeURIComponent(action.draft_subject)}&body=${encodeURIComponent(action.draft_body)}`}
                          className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:underline"
                        >
                          <Mail size={12} /> Abrir en cliente de email
                        </a>
                      )}
                    </div>
                  )}

                  {!approved && (
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="secondary" onClick={() => handleApprove(action.id)}>
                        <Check size={12} />
                        {t("agent.card.approve")}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDismiss(action.id)}
                        className="text-text-muted hover:text-error">
                        {t("agent.card.dismiss")}
                      </Button>
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

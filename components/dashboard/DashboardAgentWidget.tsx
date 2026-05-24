"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Bot, CheckCircle2, Clock, XCircle } from "lucide-react";
import { getAgentStats, type AgentStats } from "@/actions/agent";

export function DashboardAgentWidget() {
  const [stats, setStats] = useState<AgentStats | null>(null);

  useEffect(() => {
    getAgentStats().then((r) => { if (r.success) setStats(r.data); });
  }, []);

  if (!stats) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-border-default bg-bg-surface p-5">
        <div className="h-4 w-28 animate-pulse rounded bg-bg-subtle" />
        <div className="h-8 w-full animate-pulse rounded bg-bg-subtle" />
      </div>
    );
  }

  return (
    <Link
      href="/agent"
      className="group flex flex-col gap-4 rounded-xl border border-border-default bg-bg-surface p-5 transition-colors hover:border-border-strong"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-subtle text-brand">
            <Bot size={14} />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Agente IA · últimos 30 días
          </span>
        </div>
        <ArrowRight
          size={14}
          className="text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-text-primary"
        />
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Stat
          icon={<Clock size={13} className="text-warning" />}
          value={stats.pending}
          label="Pendientes"
          highlight={stats.pending > 0}
        />
        <Stat
          icon={<CheckCircle2 size={13} className="text-success" />}
          value={stats.approved + stats.acted}
          label="Aprobadas"
        />
        <Stat
          icon={<XCircle size={13} className="text-text-muted" />}
          value={stats.dismissed}
          label="Descartadas"
        />
        <div className="flex flex-col items-center gap-1">
          <span className="text-xl font-semibold tabular-nums text-text-primary">
            {stats.approvalRate}%
          </span>
          <span className="text-[10px] text-text-muted">Aprobación</span>
        </div>
      </div>

      {stats.pending > 0 && (
        <p className="text-[11px] font-medium text-warning">
          {stats.pending} acción{stats.pending === 1 ? "" : "es"} esperando tu revisión →
        </p>
      )}
    </Link>
  );
}

function Stat({
  icon,
  value,
  label,
  highlight = false,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-1">
        {icon}
        <span className={`text-xl font-semibold tabular-nums ${highlight ? "text-warning" : "text-text-primary"}`}>
          {value}
        </span>
      </div>
      <span className="text-[10px] text-text-muted">{label}</span>
    </div>
  );
}

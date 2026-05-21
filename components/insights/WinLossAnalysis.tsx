"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, RefreshCw, TrendingUp, AlertTriangle, Sparkles, ArrowRight } from "lucide-react";
import { analyzeWinLoss, type WinLossAnalysis } from "@/actions/ai";
import { useI18n } from "@/lib/i18n/context";

const PRIORITY_STYLES = {
  high:   "bg-error-subtle text-error border-error/30",
  medium: "bg-warning-subtle text-warning border-warning/30",
  low:    "bg-bg-subtle text-text-secondary border-border-default",
};

export function WinLossAnalysisSection() {
  const { t, locale } = useI18n();
  const [data, setData] = useState<WinLossAnalysis | null>(null);
  const [meta, setMeta] = useState({ wins: 0, losses: 0 });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, startTransition] = useTransition();

  function load() {
    startTransition(async () => {
      const result = await analyzeWinLoss({ locale });
      if (!result.success) { setError(result.error); return; }
      setError(null);
      setData(result.data);
      setMeta({ wins: result.winsCount, losses: result.lossesCount });
    });
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">{t("winloss.title")}</h2>
          <p className="mt-0.5 text-sm text-text-muted">{t("winloss.subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          {(meta.wins > 0 || meta.losses > 0) && (
            <span className="font-mono text-xs text-text-muted">
              {meta.wins} wins · {meta.losses} losses
            </span>
          )}
          <button type="button" onClick={load} disabled={isLoading}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-text-muted hover:bg-bg-subtle hover:text-text-primary disabled:opacity-40 transition-colors">
            {isLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            {t("insights.refresh")}
          </button>
        </div>
      </header>

      {isLoading && !data && (
        <div className="flex items-center gap-2 rounded-xl border border-border-default bg-bg-surface p-8 text-sm text-text-muted">
          <Loader2 size={16} className="animate-spin" />
          {t("insights.generating")}
        </div>
      )}
      {error && <p className="rounded-lg border border-error/40 bg-error-subtle px-4 py-2.5 text-sm text-error">{error}</p>}

      {data && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Win Profile */}
          <div className="flex flex-col gap-4 rounded-xl border border-success/30 bg-success-subtle/30 p-5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-success-subtle">
                <TrendingUp size={14} className="text-success" />
              </div>
              <h3 className="text-sm font-semibold text-text-primary">{t("winloss.winProfile")}</h3>
            </div>

            {/* Patterns */}
            <ul className="flex flex-col gap-2.5">
              {data.winProfile.patterns.map((p, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-success/20 font-mono text-[10px] font-semibold text-success">
                    {i + 1}
                  </span>
                  <div>
                    <span className="text-xs font-medium text-text-primary">{p.pattern}</span>
                    <p className="mt-0.5 text-[11px] text-text-secondary">{p.detail}</p>
                  </div>
                </li>
              ))}
            </ul>

            {/* Key signals */}
            {data.winProfile.keySignals.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {data.winProfile.keySignals.map((s, i) => (
                  <span key={i} className="rounded-full border border-success/30 bg-success-subtle px-2 py-0.5 text-[10px] font-medium text-success">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Ideal Customer + Loss Signals */}
          <div className="flex flex-col gap-4">
            {/* Ideal customer */}
            <div className="flex flex-col gap-3 rounded-xl border border-brand/20 bg-brand-subtle/30 p-5">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-subtle">
                  <Sparkles size={14} className="text-brand-on-subtle" />
                </div>
                <h3 className="text-sm font-semibold text-text-primary">{t("winloss.idealCustomer")}</h3>
              </div>
              <p className="text-xs leading-relaxed text-text-secondary">{data.winProfile.idealCustomer}</p>
            </div>

            {/* Loss signals */}
            <div className="flex flex-col gap-3 rounded-xl border border-error/20 bg-error-subtle/20 p-5">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-error-subtle">
                  <AlertTriangle size={14} className="text-error" />
                </div>
                <h3 className="text-sm font-semibold text-text-primary">{t("winloss.lossSignals")}</h3>
              </div>
              <ul className="flex flex-col gap-2">
                {data.lossSignals.map((s, i) => (
                  <li key={i}>
                    <span className="text-xs font-medium text-error">{s.signal}</span>
                    <p className="mt-0.5 text-[11px] text-text-secondary">{s.description}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Recommendations — full width */}
          <div className="lg:col-span-2 flex flex-col gap-3 rounded-xl border border-border-default bg-bg-surface p-5">
            <h3 className="text-sm font-semibold text-text-primary">{t("winloss.recommendations")}</h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {data.recommendations.map((r, i) => (
                <div key={i} className="flex items-start gap-2.5 rounded-lg border border-border-default bg-bg-subtle px-3 py-2.5">
                  <span className={`mt-0.5 shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase ${PRIORITY_STYLES[r.priority]}`}>
                    {t(`winloss.priority.${r.priority}` as Parameters<typeof t>[0])}
                  </span>
                  <div>
                    <span className="text-xs font-medium text-text-primary">{r.action}</span>
                    <p className="mt-0.5 text-[11px] text-text-secondary">{r.reasoning}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, RefreshCw, Shield, Quote } from "lucide-react";
import { extractCompetitorMentions, type CompetitiveAnalysis } from "@/actions/ai";
import { useI18n } from "@/lib/i18n/context";

export function CompetitiveIntelligenceSection() {
  const { t, locale } = useI18n();
  const [data, setData] = useState<CompetitiveAnalysis | null>(null);
  const [notesCount, setNotesCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, startTransition] = useTransition();

  function load() {
    startTransition(async () => {
      const result = await extractCompetitorMentions({ locale });
      if (!result.success) { setError(result.error); return; }
      setError(null);
      setData(result.data);
      setNotesCount(result.notesCount);
    });
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">{t("competitive.title")}</h2>
          <p className="mt-0.5 text-sm text-text-muted">{t("competitive.subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          {notesCount > 0 && (
            <span className="font-mono text-xs text-text-muted">{notesCount} notas analizadas</span>
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

      {data?.noCompetitorsFound && (
        <p className="rounded-lg border border-border-default bg-bg-surface px-4 py-3 text-sm text-text-muted">
          {t("competitive.noData")}
        </p>
      )}

      {data && !data.noCompetitorsFound && data.competitors.length > 0 && (
        <div className="flex flex-col gap-4">
          {/* Summary */}
          {data.summary && (
            <p className="rounded-lg border border-brand/20 bg-brand-subtle/20 px-4 py-3 text-sm text-text-secondary">
              {data.summary}
            </p>
          )}

          {/* Competitor cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.competitors.map((c, i) => {
              const total = c.wonAgainst + c.lostAgainst;
              const winPct = total > 0 ? Math.round((c.wonAgainst / total) * 100) : null;
              return (
                <div key={i} className="flex flex-col gap-3 rounded-xl border border-border-default bg-bg-surface p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-bg-subtle">
                        <Shield size={13} className="text-text-secondary" />
                      </div>
                      <span className="text-sm font-semibold text-text-primary">{c.name}</span>
                    </div>
                    <span className="rounded-full bg-bg-subtle px-2 py-0.5 font-mono text-[10px] text-text-muted">
                      {t("competitive.mentions", { n: c.mentions, plural: c.mentions === 1 ? "" : "s" })}
                    </span>
                  </div>

                  {/* Win/Loss stats */}
                  <div className="grid grid-cols-3 gap-1 rounded-lg bg-bg-subtle px-2 py-2">
                    <div className="flex flex-col items-center">
                      <span className="font-mono text-sm font-semibold text-success">{c.wonAgainst}</span>
                      <span className="text-[10px] text-text-muted">{t("competitive.won")}</span>
                    </div>
                    <div className="flex flex-col items-center border-x border-border-default">
                      <span className="font-mono text-sm font-semibold text-error">{c.lostAgainst}</span>
                      <span className="text-[10px] text-text-muted">{t("competitive.lost")}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="font-mono text-sm font-semibold text-brand">{c.activeDeals}</span>
                      <span className="text-[10px] text-text-muted">{t("competitive.active")}</span>
                    </div>
                  </div>

                  {/* Win rate bar */}
                  {winPct !== null && (
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-subtle">
                        <div
                          className={`h-full rounded-full ${winPct >= 60 ? "bg-success" : winPct >= 40 ? "bg-warning" : "bg-error"}`}
                          style={{ width: `${winPct}%` }}
                        />
                      </div>
                      <span className="shrink-0 font-mono text-[10px] text-text-muted">{winPct}% win rate</span>
                    </div>
                  )}

                  {/* Differentiators */}
                  {c.differentiators.length > 0 && (
                    <div>
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                        {t("competitive.differentiators")}
                      </p>
                      <ul className="flex flex-col gap-1">
                        {c.differentiators.map((d, j) => (
                          <li key={j} className="flex items-start gap-1 text-[11px] text-text-secondary">
                            <span className="mt-0.5 shrink-0 text-success">→</span>
                            {d}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Quote */}
                  {c.quote && (
                    <div className="flex gap-1.5 rounded-md border border-border-default bg-bg-subtle px-2.5 py-2">
                      <Quote size={10} className="mt-0.5 shrink-0 text-text-muted" />
                      <p className="text-[10px] italic leading-relaxed text-text-secondary">
                        {c.quote}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

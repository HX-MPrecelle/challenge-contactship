"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { RefreshCw, Loader2 } from "lucide-react";
import { generatePipelineAlerts, type PipelineAlerts } from "@/actions/ai";
import { useI18n } from "@/lib/i18n/context";

const SEVERITY_STYLES = {
  critical: "border-error/40 bg-error-subtle text-error",
  warning:  "border-warning/40 bg-warning-subtle text-warning",
  info:     "border-info/40 bg-info-subtle text-info",
  success:  "border-success/40 bg-success-subtle text-success",
};

const HEALTH_BADGE = {
  critical:  { label: { es: "Crítico", en: "Critical" },  cls: "bg-error-subtle text-error" },
  warning:   { label: { es: "Atención", en: "Attention" }, cls: "bg-warning-subtle text-warning" },
  good:      { label: { es: "Bueno", en: "Good" },         cls: "bg-success-subtle text-success" },
  excellent: { label: { es: "Excelente", en: "Excellent" }, cls: "bg-brand-subtle text-brand-on-subtle" },
};

export function PipelineHealthWidget() {
  const { t, locale } = useI18n();
  const [data, setData] = useState<PipelineAlerts | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, startTransition] = useTransition();

  function load() {
    startTransition(async () => {
      const result = await generatePipelineAlerts({ locale });
      if (!result.success) { setError(result.error); return; }
      setError(null);
      setData(result.data);
    });
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const health = data?.overallHealth;
  const badge = health ? HEALTH_BADGE[health] : null;

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border-default bg-bg-surface p-5">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex flex-col">
            <h2 className="text-sm font-semibold text-text-primary">
              {t("pipeline.health.title")}
            </h2>
            <p className="text-xs text-text-muted">{t("pipeline.health.subtitle")}</p>
          </div>
          {badge && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.cls}`}>
              {badge.label[locale as "es" | "en"] ?? badge.label.es}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={load}
          disabled={isLoading}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-text-muted transition-colors hover:bg-bg-subtle hover:text-text-primary disabled:opacity-40"
          title={t("pipeline.health.refresh")}
        >
          {isLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          {t("pipeline.health.refresh")}
        </button>
      </header>

      {isLoading && !data && (
        <div className="flex items-center gap-2 py-4 text-sm text-text-muted">
          <Loader2 size={14} className="animate-spin" />
          {t("pipeline.health.loading")}
        </div>
      )}

      {error && (
        <p className="text-xs text-error">{error}</p>
      )}

      {data && data.alerts.length === 0 && (
        <div className="flex flex-col items-center gap-1 py-4 text-center">
          <span className="text-2xl">✅</span>
          <p className="text-sm font-medium text-text-primary">{t("pipeline.health.noAlerts")}</p>
          <p className="text-xs text-text-muted">{t("pipeline.health.noAlertsDesc")}</p>
        </div>
      )}

      {data && data.alerts.length > 0 && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {data.alerts.map((alert, i) => (
            <div
              key={i}
              className={`flex flex-col gap-1.5 rounded-lg border px-3.5 py-3 ${SEVERITY_STYLES[alert.severity]}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-base leading-none">{alert.emoji}</span>
                  <span className="text-xs font-semibold">{alert.title}</span>
                </div>
                {alert.count > 0 && (
                  <span className="shrink-0 rounded-full bg-white/40 px-1.5 py-0.5 font-mono text-[10px] font-semibold">
                    {alert.count}
                  </span>
                )}
              </div>
              <p className="text-[11px] leading-relaxed opacity-90">{alert.description}</p>
              {alert.filterPath && (
                <Link
                  href={alert.filterPath}
                  className="mt-0.5 self-start text-[10px] font-medium underline-offset-2 hover:underline opacity-90"
                >
                  {alert.cta || t("pipeline.health.see")}
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      {data?.summary && (
        <p className="border-t border-border-default pt-3 text-[11px] text-text-muted">
          {data.summary}
        </p>
      )}
    </section>
  );
}

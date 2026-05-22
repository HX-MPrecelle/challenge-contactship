"use client";

import { useEffect, useState, useTransition } from "react";
import { AlertTriangle, Loader2, RefreshCw, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmailDraftDialog } from "@/components/contacts/EmailDraftDialog";
import { generateInsightsAction } from "@/actions/ai";
import { useI18n } from "@/lib/i18n/context";

type Insights = {
  summary: string;
  nextAction: string;
  riskSignal: string | null;
  leadScore: number;
  confidence: "high" | "medium" | "low";
};

export function AiInsightsPanel({ contactId }: { contactId: string }) {
  const { locale, t } = useI18n();
  const [insights, setInsights] = useState<Insights | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function load(forceRefresh = false) {
    startTransition(async () => {
      const result = await generateInsightsAction({ contactId, forceRefresh, locale });
      setIsLoading(false);
      if (!result.success) {
        setError(result.error);
        if (forceRefresh) toast.error(result.error);
        return;
      }
      setError(null);
      setInsights(result.data.insights);
      setGeneratedAt(result.data.generatedAt);
      setFromCache(result.data.fromCache);
      if (forceRefresh) toast.success("Insights actualizados");
    });
  }

  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId]);

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border-default bg-bg-surface p-5">
      <header className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-subtle text-brand-on-subtle">
            <Sparkles size={14} />
          </div>
          <div className="flex flex-col">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              {t("contact.section.insights")}
            </h2>
            {generatedAt && (
              <span className="text-[10px] font-mono text-text-muted">
                {fromCache ? "Cache" : "Recién generado"} ·{" "}
                {new Date(generatedAt).toLocaleString("es-AR", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </span>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => load(true)}
          disabled={isPending}
          aria-label="Regenerar insights"
        >
          {isPending ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <RefreshCw size={12} />
          )}
        </Button>
      </header>

      {isLoading || isPending ? (
        <SkeletonState />
      ) : error ? (
        <div className="rounded-lg border border-error/40 bg-error-subtle px-3 py-2 text-xs text-error">
          {error}
        </div>
      ) : insights ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <LeadScoreCard score={insights.leadScore} label={t("contact.insights.leadScore")} />
            </div>
            <ConfidenceBadge confidence={insights.confidence} />
          </div>

          <Card icon={<Sparkles size={12} />} label={t("contact.insights.summary")}>
            {insights.summary}
          </Card>

          <Card icon={<Zap size={12} />} label={t("contact.insights.nextAction")} highlight>
            {insights.nextAction}
          </Card>

          {insights.riskSignal && (
            <Card
              icon={<AlertTriangle size={12} />}
              label={t("contact.insights.risk")}
              tone="error"
            >
              {insights.riskSignal}
            </Card>
          )}

          <EmailDraftDialog contactId={contactId} />
        </div>
      ) : (
        /* Inline empty — not enough activity to generate insights yet */
        <div className="flex items-center gap-3 rounded-lg border border-dashed border-border-strong px-4 py-3">
          <Sparkles size={16} className="shrink-0 text-text-muted" />
          <div className="flex flex-1 flex-col gap-0.5">
            <span className="text-sm text-text-secondary">{t("contact.insights.noInsights")}</span>
            <span className="text-xs text-text-muted">
              {t("contact.insights.noInsightsDesc")}
            </span>
          </div>
          <Button size="sm" variant="secondary" onClick={() => load(true)} disabled={isPending}>
            {t("contact.insights.generate")}
          </Button>
        </div>
      )}
    </section>
  );
}

function LeadScoreCard({ score, label }: { score: number; label: string }) {
  const tone =
    score >= 80
      ? { text: "text-success", bar: "bg-success", label: "Hot" }
      : score >= 50
        ? { text: "text-brand", bar: "bg-brand", label: "Warm" }
        : score >= 20
          ? { text: "text-warning", bar: "bg-warning", label: "Cool" }
          : { text: "text-error", bar: "bg-error", label: "Cold" };
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border-default bg-bg-subtle px-3.5 py-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-text-secondary">
          {label}
        </span>
        <span className={`text-3xl font-semibold tabular-nums ${tone.text}`}>
          {score}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-border-default">
        <div
          className={`h-full rounded-full ${tone.bar} transition-all`}
          style={{ width: `${Math.max(2, score)}%` }}
        />
      </div>
      <span className="text-xs text-text-muted">{tone.label}</span>
    </div>
  );
}

function Card({
  icon,
  label,
  children,
  tone = "default",
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  tone?: "default" | "error";
  highlight?: boolean;
}) {
  const bg =
    tone === "error"
      ? "border-error/40 bg-error-subtle"
      : highlight
        ? "border-brand/40 bg-brand-subtle"
        : "border-border-default bg-bg-subtle";
  const labelClass =
    tone === "error"
      ? "text-error"
      : highlight
        ? "text-brand-on-subtle"
        : "text-text-secondary";
  return (
    <div className={`flex flex-col gap-1.5 rounded-lg border ${bg} px-3.5 py-3`}>
      <div className={`flex items-center gap-1.5 text-xs font-medium ${labelClass}`}>
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-sm text-text-primary">{children}</p>
    </div>
  );
}

function SkeletonState() {
  return (
    <div className="flex flex-col gap-3">
      <div className="h-16 animate-pulse rounded-lg bg-bg-subtle" />
      <div className="h-12 animate-pulse rounded-lg bg-bg-subtle" />
      <div className="h-12 animate-pulse rounded-lg bg-bg-subtle" />
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: "high" | "medium" | "low" }) {
  const { t } = useI18n();
  const map = {
    high:   { cls: "bg-success/10 text-success border-success/30",  dot: "bg-success" },
    medium: { cls: "bg-warning/10 text-warning border-warning/30",  dot: "bg-warning" },
    low:    { cls: "bg-error/10 text-error border-error/30",        dot: "bg-error" },
  } as const;
  const { cls, dot } = map[confidence];
  return (
    <div className={`flex shrink-0 flex-col items-center gap-1 rounded-lg border ${cls} px-3 py-2`}>
      <span className="text-[9px] font-semibold uppercase tracking-wider opacity-70">
        {t("contact.insights.confidence")}
      </span>
      <div className="flex items-center gap-1.5">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        <span className="text-xs font-medium">
          {t(`contact.insights.confidence.${confidence}` as Parameters<typeof t>[0])}
        </span>
      </div>
    </div>
  );
}

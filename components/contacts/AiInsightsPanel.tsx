"use client";

import { useEffect, useState, useTransition } from "react";
import { AlertTriangle, Loader2, RefreshCw, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { generateInsightsAction } from "@/actions/ai";

type Insights = {
  summary: string;
  nextAction: string;
  riskSignal: string | null;
  leadScore: number;
};

export function AiInsightsPanel({ contactId }: { contactId: string }) {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function load(forceRefresh = false) {
    startTransition(async () => {
      const result = await generateInsightsAction({ contactId, forceRefresh });
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
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-subtle text-brand">
            <Sparkles size={14} />
          </div>
          <div className="flex flex-col">
            <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-text-secondary">
              AI Insights
            </h2>
            {generatedAt && (
              <span className="text-[10px] text-text-muted">
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
          <LeadScoreCard score={insights.leadScore} />

          <Card icon={<Sparkles size={12} />} label="Resumen">
            {insights.summary}
          </Card>

          <Card icon={<Zap size={12} />} label="Próxima acción" highlight>
            {insights.nextAction}
          </Card>

          {insights.riskSignal && (
            <Card
              icon={<AlertTriangle size={12} />}
              label="Riesgo"
              tone="error"
            >
              {insights.riskSignal}
            </Card>
          )}
        </div>
      ) : null}
    </section>
  );
}

function LeadScoreCard({ score }: { score: number }) {
  const tone =
    score >= 80
      ? { text: "text-success", bar: "bg-success", label: "Hot" }
      : score >= 50
        ? { text: "text-brand", bar: "bg-brand", label: "Warm" }
        : score >= 20
          ? { text: "text-warning", bar: "bg-warning", label: "Cool" }
          : { text: "text-error", bar: "bg-error", label: "Cold" };
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border-default bg-bg-elevated px-3.5 py-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-text-secondary">
          Lead score
        </span>
        <span className={`font-heading text-2xl font-semibold ${tone.text}`}>
          {score}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-bg-subtle">
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
        : "border-border-default bg-bg-elevated";
  const labelClass =
    tone === "error" ? "text-error" : highlight ? "text-brand" : "text-text-secondary";
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
      <div className="h-16 animate-pulse rounded-lg bg-bg-elevated" />
      <div className="h-12 animate-pulse rounded-lg bg-bg-elevated" />
      <div className="h-12 animate-pulse rounded-lg bg-bg-elevated" />
    </div>
  );
}

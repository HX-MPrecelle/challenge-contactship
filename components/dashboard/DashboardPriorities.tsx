"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { ArrowRight, Loader2, RefreshCw, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTopPriorities, type DashboardPriority } from "@/actions/ai";

export function DashboardPriorities() {
  const [priorities, setPriorities] = useState<DashboardPriority[] | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function load(forceRefresh = false) {
    startTransition(async () => {
      const result = await getTopPriorities({ forceRefresh });
      setIsLoading(false);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setError(null);
      setPriorities(result.data.priorities);
      setGeneratedAt(result.data.generatedAt);
      setFromCache(result.data.fromCache);
    });
  }

  useEffect(() => {
    load(false);
  }, []);

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-brand/20 bg-brand-subtle p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand text-white">
            <Zap size={14} />
          </div>
          <div className="flex flex-col">
            <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-text-secondary">
              Prioridades de la semana
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
          aria-label="Regenerar prioridades"
        >
          {isPending ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <RefreshCw size={12} />
          )}
        </Button>
      </header>

      {isLoading || isPending ? (
        <SkeletonRows />
      ) : error ? (
        <div className="rounded-lg border border-error/40 bg-error-subtle px-3 py-2 text-xs text-error">
          {error}
        </div>
      ) : !priorities || priorities.length === 0 ? (
        <p className="text-xs text-text-muted">
          Aún no hay suficientes contactos para sugerir prioridades.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {priorities.map((p, idx) => (
            <li key={p.contactId}>
              <Link
                href={`/contacts/${p.contactId}`}
                className="group flex items-start gap-3 rounded-lg border border-brand/20 bg-bg-surface px-3.5 py-3 transition-colors hover:border-brand/40 hover:bg-white"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
                  {idx + 1}
                </span>
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="text-sm font-medium text-text-primary">
                    {p.name}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {p.reason}
                  </span>
                </div>
                <ArrowRight
                  size={14}
                  className="mt-1 text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-text-primary"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <footer className="flex items-center gap-1.5 border-t border-border-default pt-3 text-[10px] text-text-muted">
        <Sparkles size={10} />
        <span>
          Top 3 elegidos por GPT sobre los 30 contactos más recientes ·
          regenera cada 30 minutos
        </span>
      </footer>
    </section>
  );
}

function SkeletonRows() {
  return (
    <div className="flex flex-col gap-2">
      <div className="h-14 animate-pulse rounded-lg bg-bg-elevated" />
      <div className="h-14 animate-pulse rounded-lg bg-bg-elevated" />
      <div className="h-14 animate-pulse rounded-lg bg-bg-elevated" />
    </div>
  );
}

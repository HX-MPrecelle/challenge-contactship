import Link from "next/link";

const FUNNEL_STAGES = [
  { key: "subscriber",            label: "Subscriber", color: "#C4C9D1" },
  { key: "lead",                  label: "Lead",       color: "#9098A0" },
  { key: "marketingqualifiedlead",label: "MQL",        color: "#A8530B" },
  { key: "salesqualifiedlead",    label: "SQL",        color: "#1849A9" },
  { key: "opportunity",           label: "Opp",        color: "#2348C9" },
  { key: "customer",              label: "Cliente",    color: "#0A7C5A" },
] as const;

type Props = {
  stageCounts: Record<string, number>;
  total: number;
};

export function ConversionFunnel({ stageCounts, total }: Props) {
  if (total === 0) return null;

  const maxCount = Math.max(...FUNNEL_STAGES.map(s => stageCounts[s.key] ?? 0), 1);

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border-default bg-bg-surface p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
        Funnel de conversión
      </h2>
      <div className="flex flex-col gap-2">
        {FUNNEL_STAGES.map((stage, i) => {
          const count = stageCounts[stage.key] ?? 0;
          const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
          const barW  = maxCount > 0 ? Math.max(2, (count / maxCount) * 100) : 2;
          const convRate = i > 0
            ? (() => {
                const prevKey = FUNNEL_STAGES[i - 1]?.key;
                const prev = prevKey ? (stageCounts[prevKey] ?? 0) : 0;
                return prev > 0 ? Math.round((count / prev) * 100) : null;
              })()
            : null;

          return (
            <Link
              key={stage.key}
              href={`/contacts?lifecycle=${stage.key}`}
              className="group flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-bg-subtle"
            >
              <span className="w-16 shrink-0 text-right text-xs font-medium text-text-secondary">
                {stage.label}
              </span>
              <div className="relative flex flex-1 items-center">
                <div className="h-5 flex-1 overflow-hidden rounded-sm bg-bg-subtle">
                  <div
                    className="h-full rounded-sm transition-all"
                    style={{ width: `${barW}%`, backgroundColor: stage.color }}
                  />
                </div>
              </div>
              <span className="w-8 shrink-0 font-mono text-xs font-semibold text-text-primary tabular-nums">
                {count}
              </span>
              <span className="w-10 shrink-0 text-right font-mono text-[10px] text-text-muted">
                {pct}%
              </span>
              {convRate !== null && (
                <span className={`w-12 shrink-0 text-right text-[10px] font-mono ${convRate >= 50 ? "text-success" : convRate >= 20 ? "text-warning" : "text-error"}`}>
                  {convRate}% ↓
                </span>
              )}
            </Link>
          );
        })}
      </div>
      <p className="text-[10px] text-text-muted">
        Tasa de conversión entre etapas consecutivas. Click en una fila para filtrar contactos.
      </p>
    </section>
  );
}

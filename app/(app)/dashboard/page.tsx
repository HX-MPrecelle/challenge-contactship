import { redirect } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Globe2,
  MessageSquare,
  Sparkles,
  Users,
} from "lucide-react";
import { DashboardPriorities } from "@/components/dashboard/DashboardPriorities";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const STAGE_LABEL: Record<string, string> = {
  subscriber: "Subscriber",
  lead: "Lead",
  marketingqualifiedlead: "MQL",
  salesqualifiedlead: "SQL",
  opportunity: "Opportunity",
  customer: "Customer",
  evangelist: "Evangelist",
  other: "Other",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const orgId = user.user_metadata?.org_id as string | undefined;
  if (!orgId) redirect("/login?error=no-org");
  if (!user.user_metadata?.onboarding_complete) redirect("/onboarding");

  const [
    { data: org },
    { count: total },
    { data: stageRows },
    { data: countryRows },
    { count: conflicts },
    { count: synced },
    { data: leadStatusRows },
  ] = await Promise.all([
    supabase.from("organizations").select("name").eq("id", orgId).maybeSingle(),
    supabase.from("contacts").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("is_archived", false),
    supabase.from("contacts").select("lifecycle_stage").eq("org_id", orgId).eq("is_archived", false).limit(500),
    supabase.from("contacts").select("country").eq("org_id", orgId).eq("is_archived", false).limit(500),
    supabase.from("contacts").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("is_archived", false).eq("sync_status", "conflict"),
    supabase.from("contacts").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("is_archived", false).eq("sync_status", "synced"),
    supabase.from("contacts").select("lead_status").eq("org_id", orgId).eq("is_archived", false).not("lead_status", "is", null).limit(500),
  ]);

  const stageCounts = aggregateCounts((stageRows ?? []).map((r) => r.lifecycle_stage));
  const countryCounts = aggregateCounts((countryRows ?? []).map((r) => r.country));
  const leadStatusCounts = aggregateCounts((leadStatusRows ?? []).map((r) => r.lead_status));
  const syncPct = total ? Math.round(((synced ?? 0) / total) * 100) : 0;

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8">
      <header className="pb-6">
        <p className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
          {new Date().toLocaleDateString("es-AR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-text-primary">
          Hola, {org?.name ?? "ContactShip"}
        </h1>
        <p className="mt-0.5 text-sm text-text-secondary">
          {(conflicts ?? 0) > 0
            ? `Tenés ${conflicts} conflicto${conflicts === 1 ? "" : "s"} pendiente${conflicts === 1 ? "" : "s"} de resolver.`
            : `${total ?? 0} contactos activos sincronizados con HubSpot.`}
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          icon={<Users size={14} />}
          label="Contactos"
          value={total ?? 0}
          href="/contacts"
        />
        <StatCard
          icon={<Globe2 size={14} />}
          label="Países"
          value={countryCounts.length}
        />
        <StatCard
          icon={<AlertTriangle size={14} />}
          label="Conflictos"
          value={conflicts ?? 0}
          tone={(conflicts ?? 0) > 0 ? "warning" : "default"}
          href={(conflicts ?? 0) > 0 ? "/conflicts" : undefined}
        />
        {/* Sync health stat — same height as StatCard via h-full */}
        <div className="flex h-full flex-col justify-between gap-3 rounded-xl border border-border-default bg-bg-surface px-4 py-4">
          <div className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-success/10 text-success">
              <Sparkles size={11} />
            </span>
            Sync health
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-3xl font-semibold tabular-nums text-text-primary">
              {syncPct}%
            </span>
            <div className="h-1 overflow-hidden rounded-full bg-bg-subtle">
              <div
                className={`h-full rounded-full transition-all ${syncPct >= 90 ? "bg-success" : syncPct >= 70 ? "bg-warning" : "bg-error"}`}
                style={{ width: `${syncPct}%` }}
              />
            </div>
            <span className="text-[10px] text-text-muted">{synced ?? 0} de {total ?? 0} sincronizados</span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Breakdown
          title="Por etapa del ciclo"
          rows={stageCounts.slice(0, 6).map((r) => ({
            label: STAGE_LABEL[r.key ?? ""] ?? r.key ?? "Sin etapa",
            count: r.count,
          }))}
          total={total ?? 0}
        />
        <Breakdown
          title="Top países"
          rows={countryCounts.slice(0, 6).map((r) => ({
            label: r.key ?? "Sin país",
            count: r.count,
          }))}
          total={total ?? 0}
        />
      </div>

      {/* Lead status breakdown */}
      {leadStatusCounts.length > 0 && (
        <Breakdown
          title="Estado del lead"
          rows={leadStatusCounts.slice(0, 8).map((r) => ({
            label: r.key ?? "Sin estado",
            count: r.count,
          }))}
          total={total ?? 0}
        />
      )}

      <DashboardPriorities />

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <QuickLink
          icon={<MessageSquare size={14} />}
          title="Hablá con tu base"
          description="Patrones, prioridades, gaps. El chat tiene contexto de todos tus contactos."
          href="/chat"
        />
        <QuickLink
          icon={<Users size={14} />}
          title="Ver todos los contactos"
          description="Búsqueda en lenguaje natural, edición bidireccional y realtime."
          href="/contacts"
        />
      </section>
    </main>
  );
}

function aggregateCounts(values: (string | null | undefined)[]) {
  const map = new Map<string | null, number>();
  for (const v of values) {
    const key = v && v.trim() !== "" ? v : null;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([key, count]) => ({ key, count }))
    .filter((r) => r.key !== null)
    .sort((a, b) => b.count - a.count);
}

function StatCard({
  icon,
  label,
  value,
  tone = "default",
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone?: "default" | "warning";
  href?: string;
}) {
  const palette =
    tone === "warning"
      ? "border-warning/40 bg-warning-subtle"
      : "border-border-default bg-bg-surface";

  const inner = (
    <div
      className={`flex h-full flex-col justify-between gap-3 rounded-xl border ${palette} px-4 py-4 transition-colors ${href ? "hover:border-border-strong" : ""}`}
    >
      <div className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-md ${tone === "warning" ? "bg-warning/15 text-warning" : "bg-brand-subtle text-brand"}`}
        >
          {icon}
        </span>
        {label}
      </div>
      <span className="text-3xl font-semibold tabular-nums text-text-primary">
        {value}
      </span>
    </div>
  );
  return href ? <Link href={href} className="block h-full">{inner}</Link> : inner;
}

function Breakdown({
  title,
  rows,
  total,
}: {
  title: string;
  rows: { label: string; count: number }[];
  total: number;
}) {
  if (rows.length === 0) {
    return (
      <section className="flex flex-col gap-3 rounded-xl border border-border-default bg-bg-surface p-5">
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-text-secondary">
          {title}
        </h2>
        <p className="text-xs text-text-muted">Sin datos todavía.</p>
      </section>
    );
  }
  const max = Math.max(...rows.map((r) => r.count));
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border-default bg-bg-surface p-5">
      <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-text-secondary">
        {title}
      </h2>
      <ul className="flex flex-col gap-2">
        {rows.map((row, i) => {
          const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
          return (
            <li key={row.label} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-primary">{row.label}</span>
                <span className="font-mono text-text-secondary">
                  {row.count} · {pct}%
                </span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-bg-subtle">
                <div
                  className={`h-full rounded-full transition-all ${i === 0 ? "bg-brand" : "bg-border-strong"}`}
                  style={{ width: `${Math.max(2, (row.count / max) * 100)}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function QuickLink({
  icon,
  title,
  description,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-xl border border-border-default bg-bg-surface p-4 transition-colors hover:border-border-strong"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-subtle text-brand">
        {icon}
      </div>
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="text-sm font-medium text-text-primary">{title}</span>
        <span className="text-xs text-text-secondary">{description}</span>
      </div>
      <ArrowRight
        size={14}
        className="text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-text-primary"
      />
    </Link>
  );
}

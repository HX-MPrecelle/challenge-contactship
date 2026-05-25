import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import {
  AlertTriangle,
  ArrowRight,
  Globe2,
  MessageSquare,
  Sparkles,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  createT,
  LOCALE_COOKIE,
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  type Locale,
} from "@/lib/i18n/index";
import { DashboardPriorities } from "@/components/dashboard/DashboardPriorities";
import { DashboardAgentWidget } from "@/components/dashboard/DashboardAgentWidget";

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

  const orgId = (user.app_metadata?.org_id ?? user.user_metadata?.org_id) as string | undefined;
  if (!orgId) redirect("/login?error=no-org");
  if (!user.user_metadata?.onboarding_complete) redirect("/onboarding");

  const cookieStore = await cookies();
  const rawLocale = cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined;
  const locale: Locale = rawLocale && SUPPORTED_LOCALES.includes(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const t = createT(locale);

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
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 sm:px-6 py-6 sm:py-8">
      <header className="pb-6">
        <p className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
          {new Date().toLocaleDateString(locale === "es" ? "es-AR" : "en-US", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-text-primary">
          {t("dashboard.greeting", { name: org?.name ?? "ContactShip" })}
        </h1>
        <p className="mt-0.5 text-sm text-text-secondary">
          {(conflicts ?? 0) > 0
            ? t("dashboard.subtitle.conflicts", { count: conflicts ?? 0, plural: (conflicts ?? 0) === 1 ? "" : "s" })
            : t("dashboard.subtitle.ok", { count: total ?? 0 })}
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          icon={<Users size={14} />}
          label={t("dashboard.stat.contacts")}
          value={total ?? 0}
          href="/contacts"
        />
        <StatCard
          icon={<Globe2 size={14} />}
          label={t("dashboard.stat.countries")}
          value={countryCounts.length}
        />
        <StatCard
          icon={<AlertTriangle size={14} />}
          label={t("dashboard.stat.conflicts")}
          value={conflicts ?? 0}
          tone={(conflicts ?? 0) > 0 ? "warning" : "default"}
          href={(conflicts ?? 0) > 0 ? "/contacts?status=conflict" : undefined}
        />
        {/* Sync health stat — same height as StatCard via h-full */}
        <div className="flex h-full flex-col justify-between gap-3 rounded-xl border border-border-default bg-bg-surface px-4 py-4">
          <div className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-success/10 text-success">
              <Sparkles size={11} />
            </span>
            {t("dashboard.stat.syncHealth")}
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
            <span className="text-[10px] text-text-muted">{t("dashboard.stat.syncedOf", { synced: synced ?? 0, total: total ?? 0 })}</span>
          </div>
        </div>
      </section>

      {/* Charts row 1: donuts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DonutBreakdown
          title={t("dashboard.breakdown.stage")}
          rows={stageCounts.slice(0, 7).map((r) => ({
            label: STAGE_LABEL[r.key ?? ""] ?? r.key ?? (locale === "es" ? "Sin etapa" : "No stage"),
            count: r.count,
          }))}
          total={total ?? 0}
          colorSet="stage"
        />
        {leadStatusCounts.length > 0 && (
          <DonutBreakdown
            title={t("dashboard.breakdown.leadStatus")}
            rows={leadStatusCounts.slice(0, 8).map((r) => ({
              label: r.key ?? (locale === "es" ? "Sin estado" : "No status"),
              count: r.count,
            }))}
            total={total ?? 0}
            colorSet="status"
          />
        )}
      </div>

      {/* Chart row 2: horizontal bars for countries */}
      <BarBreakdown
        title={t("dashboard.breakdown.countries")}
        rows={countryCounts.slice(0, 8).map((r) => ({
          label: r.key ?? (locale === "es" ? "Sin país" : "No country"),
          count: r.count,
        }))}
        total={total ?? 0}
      />

      <DashboardAgentWidget />

      <DashboardPriorities />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        <QuickLink
          icon={<Sparkles size={14} />}
          title={t("dashboard.quicklink.insights")}
          description={t("dashboard.quicklink.insights.desc")}
          href="/insights"
        />
        <QuickLink
          icon={<MessageSquare size={14} />}
          title={t("dashboard.quicklink.chat")}
          description={t("dashboard.quicklink.chat.desc")}
          href="/chat"
        />
        <QuickLink
          icon={<Users size={14} />}
          title={t("dashboard.quicklink.contacts")}
          description={t("dashboard.quicklink.contacts.desc")}
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

// ─── Color palettes for chart segments ────────────────────────────────────────
const STAGE_COLORS = [
  "#2348C9", // brand cobalt  — opportunity / top stage
  "#0A7C5A", // success green — customer
  "#1849A9", // info blue     — SQL
  "#A8530B", // warning amber — MQL
  "#5B5F66", // secondary     — lead
  "#9098A0", // muted         — subscriber
  "#C4C9D1", // subtle        — other
];

const STATUS_COLORS = [
  "#0A7C5A", // success — OPEN_DEAL
  "#2348C9", // brand   — IN_PROGRESS
  "#1849A9", // info    — CONNECTED
  "#4875D4", // info lt — OPEN
  "#A8530B", // warning — ATTEMPTED_TO_CONTACT
  "#D4730B", // amber   — NEW
  "#B42318", // error   — BAD_TIMING
  "#9098A0", // muted   — UNQUALIFIED
];

// ─── Donut chart (CSS conic-gradient) ─────────────────────────────────────────
function DonutBreakdown({
  title,
  rows,
  total,
  colorSet = "stage",
}: {
  title: string;
  rows: { label: string; count: number }[];
  total: number;
  colorSet?: "stage" | "status";
}) {
  if (rows.length === 0) return null;
  const palette = colorSet === "status" ? STATUS_COLORS : STAGE_COLORS;
  const withColors = rows.map((r, i) => ({
    ...r,
    color: palette[i % palette.length] ?? "#9098A0",
    pct: total > 0 ? Math.round((r.count / total) * 100) : 0,
  }));

  // Build conic-gradient stops (start from top = -90deg)
  let cumDeg = -90;
  const stops = withColors.map(({ count, color }) => {
    const deg = total > 0 ? (count / total) * 360 : 0;
    const stop = `${color} ${cumDeg.toFixed(1)}deg ${(cumDeg + deg).toFixed(1)}deg`;
    cumDeg += deg;
    return stop;
  });

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border-default bg-bg-surface p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
        {title}
      </h2>
      <div className="flex items-center gap-5">
        {/* Donut */}
        <div
          className="h-[108px] w-[108px] shrink-0 rounded-full"
          style={{
            background: stops.length > 0 ? `conic-gradient(${stops.join(", ")})` : "#E6E6E4",
            WebkitMaskImage: "radial-gradient(transparent 41%, black 42%)",
            maskImage: "radial-gradient(transparent 41%, black 42%)",
          }}
        />
        {/* Legend */}
        <ul className="flex flex-1 flex-col gap-1.5 overflow-hidden">
          {withColors.map((row) => (
            <li key={row.label} className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex min-w-0 items-center gap-1.5">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: row.color }}
                />
                <span className="truncate text-xs text-text-secondary" title={row.label}>
                  {row.label}
                </span>
              </div>
              <span className="shrink-0 font-mono text-[11px] text-text-muted">
                {row.count} · {row.pct}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ─── Enhanced horizontal bar chart (for geographic/ranked data) ───────────────
function BarBreakdown({
  title,
  rows,
  total,
}: {
  title: string;
  rows: { label: string; count: number }[];
  total: number;
}) {
  if (rows.length === 0) return null;
  const max = Math.max(...rows.map((r) => r.count));

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border-default bg-bg-surface p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
        {title}
      </h2>
      <ul className="flex flex-col gap-2.5">
        {rows.map((row, i) => {
          const widthPct = max > 0 ? Math.max(2, (row.count / max) * 100) : 2;
          const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
          return (
            <li key={row.label} className="flex items-center gap-3">
              {/* Rank */}
              <span className="w-4 shrink-0 text-right font-mono text-[10px] text-text-muted">
                {i + 1}
              </span>
              {/* Label */}
              <span className="w-28 shrink-0 truncate text-xs text-text-primary" title={row.label}>
                {row.label}
              </span>
              {/* Bar */}
              <div className="flex flex-1 items-center gap-2">
                <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-bg-subtle">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${widthPct}%`,
                      background: i === 0
                        ? "#2348C9"
                        : `rgba(35,72,201,${Math.max(0.15, 0.7 - i * 0.1)})`,
                    }}
                  />
                </div>
                <span className="w-14 shrink-0 text-right font-mono text-[11px] text-text-muted">
                  {row.count} · {pct}%
                </span>
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

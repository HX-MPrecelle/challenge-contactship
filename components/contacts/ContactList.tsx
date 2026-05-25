"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import { BarChart3, Loader2, RefreshCw, Search, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { FilterSummaryDialog } from "@/components/contacts/FilterSummaryDialog";
import { SyncStatusBadge } from "@/components/contacts/SyncStatusBadge";
import { naturalLanguageSearch } from "@/actions/ai";
import { createClient } from "@/lib/supabase/client";
import { matchesFilter, type AiFilterClause } from "@/lib/utils/contact-filters";
import type { Database } from "@/types/database";

type SyncStatus = "synced" | "pending" | "conflict" | "error";

type ContactRow = Pick<
  Database["public"]["Tables"]["contacts"]["Row"],
  | "id" | "first_name" | "last_name" | "email" | "company" | "job_title"
  | "lifecycle_stage" | "country" | "sync_status" | "local_updated_at"
  | "is_archived" | "created_at" | "city" | "lead_status"
>;

type AiFilter = {
  filters: AiFilterClause[];
  explanation: string;
  query: string;
};

type Props = {
  contacts: ContactRow[];
  orgId: string;
  totalCount: number;
  page: number;
  pageSize?: number;
  statusFilter: SyncStatus | null;
  lifecycleFilter: string | null;
  searchQuery: string;
  density?: "normal" | "compact";
};

const LIFECYCLE_FILTER_VALUES = [
  { value: "opportunity",           label: "Opportunity" },
  { value: "salesqualifiedlead",    label: "SQL" },
  { value: "marketingqualifiedlead",label: "MQL" },
  { value: "customer",              label: "Cliente" },
  { value: "lead",                  label: "Lead" },
  { value: "subscriber",            label: "Subscriber" },
] as const;

const DEFAULT_PAGE_SIZE = 15;

export function ContactList({
  contacts: initialContacts,
  orgId,
  totalCount,
  page,
  pageSize: serverPageSize = DEFAULT_PAGE_SIZE,
  statusFilter,
  lifecycleFilter,
  searchQuery,
  density = "normal",
}: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rowPy = density === "compact" ? "py-1.5" : "py-3";

  const STATUS_FILTERS: { value: SyncStatus; label: string; dot: string }[] = [
    { value: "synced",   label: t("contacts.filter.status.synced"),   dot: "bg-success" },
    { value: "pending",  label: t("contacts.filter.status.pending"),  dot: "bg-warning" },
    { value: "conflict", label: t("contacts.filter.status.conflict"), dot: "bg-error animate-pulse-dot" },
    { value: "error",    label: t("contacts.filter.status.error"),    dot: "bg-error" },
  ];

  // Dynamic page size: calculate how many rows fit in the viewport
  const tableRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function calc() {
      const top = tableRef.current?.getBoundingClientRect().top ?? 240;
      const rowH = density === "compact" ? 40 : 52;
      const paginationH = 52;
      const available = window.innerHeight - top - paginationH - 16;
      const rows = Math.max(5, Math.min(50, Math.floor(available / rowH)));
      if (rows !== serverPageSize) {
        const p = new URLSearchParams(searchParams.toString());
        p.set("size", String(rows));
        p.delete("page");
        router.replace(`/contacts?${p.toString()}`, { scroll: false });
      }
    }
    // Only recalculate on resize, not on mount (serverPageSize already set)
    const handler = () => calc();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [density, serverPageSize, searchParams, router]);

  // Local state only for realtime updates and AI filter overlay
  const [contacts, setContacts] = useState<ContactRow[]>(initialContacts);
  const [aiFilter, setAiFilter] = useState<AiFilter | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [isParsing, startParsing] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isBulking, startBulk] = useTransition();

  // Text search input — local state, debounced to URL
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync contacts when server re-renders with new data
  useEffect(() => { setContacts(initialContacts); }, [initialContacts]);

  // ── URL navigation helpers ───────────────────────────────────────────────
  function buildUrl(overrides: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(overrides)) {
      if (v === null || v === "") params.delete(k);
      else params.set(k, v);
    }
    // Reset page when any filter changes (except page itself)
    if (!("page" in overrides)) params.delete("page");
    return `/contacts?${params.toString()}`;
  }

  function navigate(overrides: Record<string, string | null>) {
    router.push(buildUrl(overrides), { scroll: false });
  }

  // ── Debounced text search → URL ──────────────────────────────────────────
  function handleQueryChange(value: string) {
    setLocalQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      navigate({ q: value.trim() || null });
    }, 350);
  }

  // ── AI search ────────────────────────────────────────────────────────────
  function runAiSearch() {
    const q = localQuery.trim();
    if (!q) { toast.error(t("contacts.ai.error.empty")); return; }

    // Clear ?q= IMMEDIATELY before the async call.
    // The debounce may have set ?q= in the URL which causes the server to
    // filter by ilike (returns 0 rows for natural language). We need the server
    // to load all contacts so the AI filter can apply client-side on them.
    if (debounceRef.current) clearTimeout(debounceRef.current);
    navigate({ q: null, page: null });

    startParsing(async () => {
      const result = await naturalLanguageSearch({ query: q });
      if (!result.success) { toast.error(result.error); return; }
      if (result.data.filters.length === 0) {
        toast.warning(t("contacts.ai.error.noFilters"));
        return;
      }
      setAiFilter({ filters: result.data.filters, explanation: result.data.explanation, query: q });
      setLocalQuery("");
    });
  }

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(totalCount / serverPageSize));

  function goToPage(p: number) {
    router.push(buildUrl({ page: p === 0 ? null : String(p) }), { scroll: false });
  }

  // ── Realtime subscription ─────────────────────────────────────────────────
  // Debounced router.refresh() so server re-fetches count + current page after
  // any webhook-driven change (e.g. a HubSpot contact update arriving via webhook
  // may affect a different page than what's currently displayed).
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function scheduleRefresh() {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => { router.refresh(); }, 800);
  }

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("contacts-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "contacts", filter: `org_id=eq.${orgId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as ContactRow;
            if (row.is_archived) return;
            setContacts((prev) => prev.some((c) => c.id === row.id) ? prev : [row, ...prev]);
            scheduleRefresh();
          }
          if (payload.eventType === "UPDATE") {
            const row = payload.new as ContactRow;
            setContacts((prev) => {
              if (row.is_archived) return prev.filter((c) => c.id !== row.id);
              return prev.map((c) => (c.id === row.id ? row : c));
            });
            scheduleRefresh();
          }
          if (payload.eventType === "DELETE") {
            const row = payload.old as Partial<ContactRow>;
            setContacts((prev) => prev.filter((c) => c.id !== row.id));
            scheduleRefresh();
          }
        }
      ).subscribe();
    return () => {
      supabase.removeChannel(channel);
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [orgId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── AI filter overlay (client-side on loaded page) ────────────────────────
  const displayed = aiFilter
    ? contacts.filter((c) => aiFilter.filters.every((f) => matchesFilter(c, f)))
    : contacts;

  // ── Bulk actions ──────────────────────────────────────────────────────────
  function toggleRow(id: string, e: React.MouseEvent) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (e.shiftKey && prev.size > 0) {
        const ids = displayed.map((c) => c.id);
        const lastSelected = ids.findIndex((i) => prev.has(i));
        const current = ids.indexOf(id);
        if (lastSelected !== -1) {
          const [a, b] = [lastSelected, current].sort((x, y) => x - y) as [number, number];
          ids.slice(a, b + 1).forEach((i) => next.add(i));
          return next;
        }
      }
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function bulkResync() {
    const ids = [...selected];
    startBulk(async () => {
      const { toast: tt } = await import("sonner");
      const { createClient: cc } = await import("@/lib/supabase/client");
      const s = cc();
      const { error } = await s.from("contacts").update({ sync_status: "pending" }).in("id", ids).eq("org_id", orgId);
      if (error) { tt.error(error.message); return; }
      tt.info(`${ids.length} contacto${ids.length === 1 ? "" : "s"} en cola de sync.`, { duration: 5000, icon: "🔄" });
      setSelected(new Set());
    });
  }

  function bulkArchive() {
    const ids = [...selected];
    startBulk(async () => {
      const { toast: tt } = await import("sonner");
      const { createClient } = await import("@/lib/supabase/client");
      const s = createClient();
      const { error } = await s.from("contacts").update({ is_archived: true }).in("id", ids).eq("org_id", orgId);
      if (error) { tt.error(error.message); return; }
      tt.success(`${ids.length} contacto${ids.length === 1 ? "" : "s"} archivado${ids.length === 1 ? "" : "s"}`);
      setSelected(new Set());
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Search row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <Input
            type="search"
            value={localQuery}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) runAiSearch(); }}
            placeholder={t("contacts.search.placeholder")}
            className="h-10 pl-9"
          />
        </div>
        <Button variant="secondary" size="default" onClick={runAiSearch} disabled={isParsing} aria-label={t("contacts.search.aiLabel")}>
          {isParsing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          <span>{t("contacts.search.aiButton")}</span>
        </Button>
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-medium uppercase tracking-wider text-text-muted" htmlFor="stage-filter">
            {t("contacts.filter.stage")}
          </label>
          <select
            id="stage-filter"
            value={lifecycleFilter ?? ""}
            onChange={(e) => navigate({ lifecycle: e.target.value || null })}
            className="h-7 appearance-none rounded-md border border-border-default bg-bg-surface px-2 pr-6 text-xs text-text-primary focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-brand/20"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239098A0' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 6px center" }}
          >
            <option value="">{t("contacts.filter.stage.all")}</option>
            {LIFECYCLE_FILTER_VALUES.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wider text-text-muted">{t("contacts.filter.sync")}</span>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => navigate({ status: statusFilter === f.value ? null : f.value })}
              className={[
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                statusFilter === f.value
                  ? "border-brand/40 bg-brand-subtle text-brand-on-subtle"
                  : "border-border-default text-text-secondary hover:border-border-strong hover:text-text-primary",
              ].join(" ")}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${f.dot}`} />
              {f.label}
            </button>
          ))}
        </div>

        {(statusFilter || lifecycleFilter) && (
          <button type="button" onClick={() => navigate({ status: null, lifecycle: null })}
            className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary">
            <X size={12} />{t("contacts.filter.clear")}
          </button>
        )}
      </div>

      {/* AI filter banner */}
      {aiFilter && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-brand/40 bg-brand-subtle px-4 py-2.5">
          <div className="flex items-start gap-2 text-sm">
            <Sparkles size={14} className="mt-0.5 shrink-0 text-brand-on-subtle" />
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-text-primary">{t("contacts.ai.applied")}</span>
              <span className="text-xs text-text-secondary">{aiFilter.explanation}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button type="button" size="sm" variant="secondary" onClick={() => setSummaryOpen(true)} disabled={displayed.length === 0} title={t("contacts.ai.summarize", { n: displayed.length })}>
              <BarChart3 size={12} />{t("contacts.ai.summarize", { n: displayed.length })}
            </Button>
            <button type="button" onClick={() => setAiFilter(null)} className="text-xs text-text-secondary hover:text-text-primary" aria-label={t("contacts.filter.clear")}>
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {aiFilter && <FilterSummaryDialog open={summaryOpen} onOpenChange={setSummaryOpen} query={aiFilter.query} filters={aiFilter.filters} />}

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border-strong bg-bg-surface px-4 py-2.5 shadow-cs-sm">
          <span className="text-sm font-medium text-text-primary">
            {t("contacts.bulk.selected", { n: selected.size, plural: selected.size === 1 ? "" : "s" })}
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={bulkResync} disabled={isBulking}><RefreshCw size={12} />{t("contacts.bulk.resync")}</Button>
            <Button size="sm" variant="ghost" onClick={bulkArchive} disabled={isBulking} className="text-error hover:bg-error-subtle hover:text-error"><Trash2 size={12} />{t("contacts.bulk.archive")}</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}><X size={12} />{t("contacts.bulk.deselect")}</Button>
          </div>
        </div>
      )}

      {/* Table — horizontal scroll on mobile */}
      <div ref={tableRef} className="overflow-x-auto rounded-xl border border-border-default bg-bg-surface">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="border-b border-border-default bg-bg-subtle">
            <tr className="text-left text-xs font-semibold uppercase tracking-wider text-text-muted">
              <th className="w-10 px-4 py-2.5">
                <input type="checkbox" className="h-3.5 w-3.5 rounded border-border-strong accent-brand"
                  checked={selected.size === displayed.length && displayed.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) setSelected(new Set(displayed.map((c) => c.id)));
                    else setSelected(new Set());
                  }} />
              </th>
              <th className="px-4 py-2.5">{t("contacts.table.name")}</th>
              <th className="hidden sm:table-cell px-4 py-2.5">{t("contacts.table.email")}</th>
              <th className="px-4 py-2.5">{t("contacts.table.company")}</th>
              <th className="hidden lg:table-cell px-4 py-2.5">{t("contacts.table.jobTitle")}</th>
              <th className="hidden sm:table-cell px-4 py-2.5">{t("contacts.table.stage")}</th>
              <th className="px-4 py-2.5">{t("contacts.table.sync")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default text-text-primary">
            {displayed.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-text-muted">
                  {totalCount === 0 ? t("contacts.empty.noContacts") : t("contacts.empty.noMatch")}
                </td>
              </tr>
            )}
            {displayed.map((c) => {
              const fullName = [c.first_name, c.last_name].filter(Boolean).join(" ") || "—";
              return (
                <tr key={c.id} className={`transition-colors hover:bg-bg-subtle ${selected.has(c.id) ? "bg-brand-subtle/30" : ""}`}>
                  <td className={`w-10 px-4 ${rowPy}`} onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" className="h-3.5 w-3.5 rounded border-border-strong accent-brand"
                      checked={selected.has(c.id)} onChange={() => {}} onClick={(e) => toggleRow(c.id, e)} />
                  </td>
                  <td className={`max-w-[180px] px-4 ${rowPy}`}>
                    <Link href={`/contacts/${c.id}`} className="flex min-w-0 items-center gap-2.5 text-text-primary">
                      <Avatar size={26} name={fullName === "—" ? "?" : fullName} className="shrink-0" />
                      <span className="truncate font-medium" title={fullName}>{fullName}</span>
                    </Link>
                  </td>
                  <td className={`hidden sm:table-cell max-w-[160px] px-4 ${rowPy}`}>
                    <Link href={`/contacts/${c.id}`} className="block truncate font-mono text-xs text-text-muted" title={c.email ?? ""}>{c.email ?? "—"}</Link>
                  </td>
                  <td className={`max-w-[140px] px-4 ${rowPy} text-text-secondary`}>
                    <Link href={`/contacts/${c.id}`} className="block truncate" title={c.company ?? ""}>{c.company ?? "—"}</Link>
                  </td>
                  <td className={`hidden lg:table-cell max-w-[140px] px-4 ${rowPy} text-text-secondary`}>
                    <Link href={`/contacts/${c.id}`} className="block truncate" title={c.job_title ?? ""}>{c.job_title ?? "—"}</Link>
                  </td>
                  <td className={`hidden sm:table-cell px-4 ${rowPy} text-text-secondary`}>
                    <Link href={`/contacts/${c.id}`} className="block truncate">{c.lifecycle_stage ?? "—"}</Link>
                  </td>
                  <td className={`px-4 ${rowPy}`}>
                    <Link href={`/contacts/${c.id}`}><SyncStatusBadge status={c.sync_status} /></Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-muted">
          {t("contacts.footer", { shown: totalCount, page: page + 1, total: totalPages })}
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => goToPage(Math.max(0, page - 1))} disabled={page === 0}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border-default text-xs text-text-secondary transition-colors hover:bg-bg-subtle disabled:opacity-40">‹</button>
            {page > 0 ? (
              <button type="button" onClick={() => goToPage(page - 1)}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-border-default text-xs text-text-secondary transition-colors hover:bg-bg-subtle">{page}</button>
            ) : <span className="h-7 w-7" />}
            <button type="button" className="flex h-7 w-7 items-center justify-center rounded-md bg-brand text-xs font-medium text-white">{page + 1}</button>
            {page < totalPages - 1 ? (
              <button type="button" onClick={() => goToPage(page + 1)}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-border-default text-xs text-text-secondary transition-colors hover:bg-bg-subtle">{page + 2}</button>
            ) : <span className="h-7 w-7" />}
            <button type="button" onClick={() => goToPage(Math.min(totalPages - 1, page + 1))} disabled={page === totalPages - 1}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border-default text-xs text-text-secondary transition-colors hover:bg-bg-subtle disabled:opacity-40">›</button>
          </div>
        )}
      </div>
    </div>
  );
}

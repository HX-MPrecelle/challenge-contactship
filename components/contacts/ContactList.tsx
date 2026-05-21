"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { BarChart3, Loader2, RefreshCw, Search, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { FilterSummaryDialog } from "@/components/contacts/FilterSummaryDialog";
import { SyncStatusBadge } from "@/components/contacts/SyncStatusBadge";
import { naturalLanguageSearch } from "@/actions/ai";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

type SyncStatus = "synced" | "pending" | "conflict" | "error";

type ContactRow = Pick<
  Database["public"]["Tables"]["contacts"]["Row"],
  | "id"
  | "first_name"
  | "last_name"
  | "email"
  | "company"
  | "job_title"
  | "lifecycle_stage"
  | "country"
  | "sync_status"
  | "local_updated_at"
  | "is_archived"
  | "created_at"
  | "city"
  | "lead_status"
>;

type AiFilter = {
  filters: {
    field: string;
    operator: "eq" | "ilike" | "lt" | "gt" | "lte" | "gte";
    value: string;
  }[];
  explanation: string;
  query: string;
};

type Props = {
  initialContacts: ContactRow[];
  orgId: string;
  initialStatusFilter?: SyncStatus | null;
};

const STATUS_LABEL: Record<SyncStatus, string> = {
  synced: "sincronizados",
  pending: "pendientes",
  conflict: "en conflicto",
  error: "con error",
};

const LIFECYCLE_FILTERS = [
  { value: "opportunity", label: "Opportunity" },
  { value: "salesqualifiedlead", label: "SQL" },
  { value: "marketingqualifiedlead", label: "MQL" },
  { value: "customer", label: "Cliente" },
  { value: "lead", label: "Lead" },
  { value: "subscriber", label: "Subscriber" },
] as const;

const STATUS_FILTERS: { value: SyncStatus; label: string; dot: string }[] = [
  { value: "synced", label: "Synced", dot: "bg-success" },
  { value: "pending", label: "Pendiente", dot: "bg-warning" },
  { value: "conflict", label: "Conflicto", dot: "bg-error animate-pulse-dot" },
  { value: "error", label: "Error", dot: "bg-error" },
];

const PAGE_SIZE = 10;

export function ContactList({
  initialContacts,
  orgId,
  initialStatusFilter,
}: Props) {
  const [contacts, setContacts] = useState<ContactRow[]>(initialContacts);
  const [query, setQuery] = useState("");
  const [aiFilter, setAiFilter] = useState<AiFilter | null>(null);
  const [statusFilter, setStatusFilter] = useState<SyncStatus | null>(
    initialStatusFilter ?? null
  );
  const [lifecycleFilter, setLifecycleFilter] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [isParsing, startParsing] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isBulking, startBulk] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("contacts-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "contacts",
          filter: `org_id=eq.${orgId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as ContactRow;
            if (row.is_archived) return;
            setContacts((prev) =>
              prev.some((c) => c.id === row.id) ? prev : [row, ...prev]
            );
          }
          if (payload.eventType === "UPDATE") {
            const row = payload.new as ContactRow;
            setContacts((prev) => {
              if (row.is_archived) return prev.filter((c) => c.id !== row.id);
              const next = prev.map((c) => (c.id === row.id ? row : c));
              if (!next.some((c) => c.id === row.id)) next.unshift(row);
              return next;
            });
          }
          if (payload.eventType === "DELETE") {
            const row = payload.old as Partial<ContactRow>;
            setContacts((prev) => prev.filter((c) => c.id !== row.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId]);

  const filtered = useMemo(() => {
    let result = contacts;
    if (statusFilter) {
      result = result.filter((c) => c.sync_status === statusFilter);
    }
    if (lifecycleFilter) {
      result = result.filter((c) => c.lifecycle_stage === lifecycleFilter);
    }
    if (aiFilter) {
      result = result.filter((c) =>
        aiFilter.filters.every((f) => matchesFilter(c, f))
      );
    }
    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter((c) => {
        const name = `${c.first_name ?? ""} ${c.last_name ?? ""}`.toLowerCase();
        return (
          name.includes(q) ||
          (c.email ?? "").toLowerCase().includes(q) ||
          (c.company ?? "").toLowerCase().includes(q) ||
          (c.job_title ?? "").toLowerCase().includes(q) ||
          (c.lifecycle_stage ?? "").toLowerCase().includes(q) ||
          (c.country ?? "").toLowerCase().includes(q)
        );
      });
    }
    return result;
  }, [contacts, query, aiFilter, statusFilter]);

  // Reset to page 0 whenever any filter changes
  useEffect(() => { setPage(0); }, [statusFilter, lifecycleFilter, aiFilter, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function runAiSearch() {
    const q = query.trim();
    if (!q) {
      toast.error("Escribí una consulta primero");
      return;
    }
    startParsing(async () => {
      const result = await naturalLanguageSearch({ query: q });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      if (result.data.filters.length === 0) {
        toast.warning(
          "No pude traducir esa consulta. Probá con algo más específico."
        );
        return;
      }
      setAiFilter({
        filters: result.data.filters,
        explanation: result.data.explanation,
        query: q,
      });
      setQuery("");
    });
  }

  function toggleRow(id: string, e: React.MouseEvent) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (e.shiftKey && prev.size > 0) {
        // Shift+click: select range between last selected and this
        const ids = filtered.map((c) => c.id);
        const lastSelected = ids.findIndex((i) => prev.has(i));
        const current = ids.indexOf(id);
        if (lastSelected !== -1) {
          const sorted = [lastSelected, current].sort((x, y) => x - y) as [number, number];
          ids.slice(sorted[0], sorted[1] + 1).forEach((i) => next.add(i));
          return next;
        }
      }
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function bulkResync() {
    const ids = [...selected];
    startBulk(async () => {
      const { toast: t } = await import("sonner");
      const { createClient: cc } = await import("@/lib/supabase/client");
      const supabase = cc();
      const { error } = await supabase
        .from("contacts")
        .update({ sync_status: "pending" })
        .in("id", ids)
        .eq("org_id", orgId);
      if (error) { t.error(error.message); return; }
      // The realtime subscription will update each row when sync completes.
      t.info(`${ids.length} contacto${ids.length === 1 ? "" : "s"} en cola de sync. El status se actualizará en tiempo real.`, {
        duration: 5000,
        icon: "🔄",
      });
      setSelected(new Set());
    });
  }

  function bulkArchive() {
    const ids = [...selected];
    startBulk(async () => {
      const { toast: t } = await import("sonner");
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase
        .from("contacts")
        .update({ is_archived: true })
        .in("id", ids)
        .eq("org_id", orgId);
      if (error) { t.error(error.message); return; }
      t.success(`${ids.length} contacto${ids.length === 1 ? "" : "s"} archivado${ids.length === 1 ? "" : "s"}`);
      setSelected(new Set());
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.metaKey) runAiSearch();
            }}
            placeholder="Buscar — texto rápido o consulta en lenguaje natural"
            className="h-10 pl-9"
          />
        </div>
        <Button
          variant="secondary"
          size="default"
          onClick={runAiSearch}
          disabled={isParsing}
          aria-label="Interpretar como búsqueda en lenguaje natural"
        >
          {isParsing ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Sparkles size={14} />
          )}
          <span>AI search</span>
        </Button>
      </div>

      {/* Filter row: stage select + sync pills */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Lifecycle stage — select dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-medium uppercase tracking-wider text-text-muted" htmlFor="stage-filter">
            Etapa:
          </label>
          <select
            id="stage-filter"
            value={lifecycleFilter ?? ""}
            onChange={(e) => setLifecycleFilter(e.target.value || null)}
            className="h-7 rounded-md border border-border-default bg-bg-surface px-2 text-xs text-text-primary focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-brand/20"
          >
            <option value="">Todas</option>
            {LIFECYCLE_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>

        {/* Sync status — pills */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wider text-text-muted">Sync:</span>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(statusFilter === f.value ? null : f.value)}
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
          <button
            type="button"
            onClick={() => { setStatusFilter(null); setLifecycleFilter(null); }}
            className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary"
          >
            <X size={12} />
            Limpiar filtros
          </button>
        )}
      </div>

      {aiFilter && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-brand/40 bg-brand-subtle px-4 py-2.5">
          <div className="flex items-start gap-2 text-sm">
            <Sparkles size={14} className="mt-0.5 shrink-0 text-brand-on-subtle" />
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-text-primary">
                Búsqueda con IA aplicada
              </span>
              <span className="text-xs text-text-secondary">
                {aiFilter.explanation}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setSummaryOpen(true)}
              disabled={filtered.length === 0}
              title="Análisis IA sobre los contactos filtrados"
            >
              <BarChart3 size={12} />
              Resumir {filtered.length}
            </Button>
            <button
              type="button"
              onClick={() => setAiFilter(null)}
              className="text-xs text-text-secondary hover:text-text-primary"
              aria-label="Limpiar filtro"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {aiFilter && (
        <FilterSummaryDialog
          open={summaryOpen}
          onOpenChange={setSummaryOpen}
          query={aiFilter.query}
          filters={aiFilter.filters}
        />
      )}

      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border-strong bg-bg-surface px-4 py-2.5 shadow-cs-sm">
          <span className="text-sm font-medium text-text-primary">
            {selected.size} seleccionado{selected.size === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={bulkResync} disabled={isBulking}>
              <RefreshCw size={12} />
              Re-sync
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={bulkArchive}
              disabled={isBulking}
              className="text-error hover:bg-error-subtle hover:text-error"
            >
              <Trash2 size={12} />
              Archivar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              <X size={12} />
              Deseleccionar
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border-default bg-bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border-default bg-bg-subtle">
            <tr className="text-left text-xs font-semibold uppercase tracking-wider text-text-muted">
              <th className="w-10 px-4 py-2.5">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-border-strong accent-brand"
                  checked={selected.size === filtered.length && filtered.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) setSelected(new Set(filtered.map((c) => c.id)));
                    else setSelected(new Set());
                  }}
                />
              </th>
              <th className="px-4 py-2.5">Nombre</th>
              <th className="px-4 py-2.5">Email</th>
              <th className="px-4 py-2.5">Empresa</th>
              <th className="px-4 py-2.5">Cargo</th>
              <th className="px-4 py-2.5">Etapa</th>
              <th className="px-4 py-2.5">Sync</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default text-text-primary">
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-sm text-text-muted"
                >
                  {contacts.length === 0
                    ? "Sin contactos sincronizados todavía."
                    : "Ningún contacto coincide con los filtros activos."}
                </td>
              </tr>
            )}
            {paginated.map((c) => {
              const fullName =
                [c.first_name, c.last_name].filter(Boolean).join(" ") || "—";
              return (
                <tr
                  key={c.id}
                  className={`transition-colors hover:bg-bg-subtle ${selected.has(c.id) ? "bg-brand-subtle/30" : ""}`}
                >
                  <td className="w-10 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-border-strong accent-brand"
                      checked={selected.has(c.id)}
                      onChange={() => {}}
                      onClick={(e) => toggleRow(c.id, e)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/contacts/${c.id}`}
                      className="flex items-center gap-2.5 text-text-primary"
                    >
                      <Avatar
                        size={26}
                        name={fullName === "—" ? "?" : fullName}
                      />
                      <span className="font-medium">{fullName}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/contacts/${c.id}`} className="block w-full font-mono text-xs text-text-muted">
                      {c.email ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    <Link href={`/contacts/${c.id}`} className="block w-full">
                      {c.company ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    <Link href={`/contacts/${c.id}`} className="block w-full">
                      {c.job_title ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    <Link href={`/contacts/${c.id}`} className="block w-full">
                      {c.lifecycle_stage ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/contacts/${c.id}`}>
                      <SyncStatusBadge status={c.sync_status} />
                    </Link>
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
          {filtered.length} contacto{filtered.length === 1 ? "" : "s"}
          {(statusFilter || lifecycleFilter || aiFilter) ? " coinciden" : " totales"}
          {" · "}página {page + 1} de {totalPages}
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border-default text-xs text-text-secondary transition-colors hover:bg-bg-subtle disabled:opacity-40"
            >
              ‹
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              // Show first, last, and pages around current
              const p = totalPages <= 7 ? i :
                i === 0 ? 0 :
                i === 6 ? totalPages - 1 :
                page - 2 + i;
              const clamped = Math.max(0, Math.min(totalPages - 1, p));
              return (
                <button
                  key={clamped}
                  type="button"
                  onClick={() => setPage(clamped)}
                  className={[
                    "flex h-7 w-7 items-center justify-center rounded-md text-xs font-medium transition-colors",
                    clamped === page
                      ? "bg-brand text-white"
                      : "border border-border-default text-text-secondary hover:bg-bg-subtle",
                  ].join(" ")}
                >
                  {clamped + 1}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border-default text-xs text-text-secondary transition-colors hover:bg-bg-subtle disabled:opacity-40"
            >
              ›
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function matchesFilter(
  contact: ContactRow,
  filter: AiFilter["filters"][number]
): boolean {
  const rawValue = contact[filter.field as keyof ContactRow];
  if (rawValue === null || rawValue === undefined) return false;
  const fieldValue = String(rawValue);

  switch (filter.operator) {
    case "eq":
      return fieldValue.toLowerCase() === filter.value.toLowerCase();
    case "ilike": {
      const needle = filter.value.replace(/%/g, "").toLowerCase();
      return fieldValue.toLowerCase().includes(needle);
    }
    case "lt":
      return new Date(fieldValue).getTime() < new Date(filter.value).getTime();
    case "gt":
      return new Date(fieldValue).getTime() > new Date(filter.value).getTime();
    case "lte":
      return new Date(fieldValue).getTime() <= new Date(filter.value).getTime();
    case "gte":
      return new Date(fieldValue).getTime() >= new Date(filter.value).getTime();
    default:
      return false;
  }
}

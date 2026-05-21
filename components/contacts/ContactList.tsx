"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { BarChart3, Loader2, Search, Sparkles, X } from "lucide-react";
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
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [isParsing, startParsing] = useTransition();

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

      {statusFilter && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border-default bg-bg-subtle px-4 py-2.5 text-sm">
          <span className="text-text-secondary">
            Mostrando solo{" "}
            <span className="font-medium text-text-primary">
              contactos {STATUS_LABEL[statusFilter]}
            </span>
            .
          </span>
          <button
            type="button"
            onClick={() => setStatusFilter(null)}
            className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary"
            aria-label="Quitar filtro de estado"
          >
            <X size={14} />
            <span>Ver todos</span>
          </button>
        </div>
      )}

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

      <div className="overflow-hidden rounded-xl border border-border-default bg-bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border-default bg-bg-subtle">
            <tr className="text-left text-xs font-semibold uppercase tracking-wider text-text-muted">
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
                  colSpan={6}
                  className="px-4 py-10 text-center text-sm text-text-muted"
                >
                  {contacts.length === 0
                    ? "Sin contactos sincronizados todavía."
                    : "Ningún contacto coincide con los filtros activos."}
                </td>
              </tr>
            )}
            {filtered.map((c) => {
              const fullName =
                [c.first_name, c.last_name].filter(Boolean).join(" ") || "—";
              return (
                <tr
                  key={c.id}
                  className="transition-colors hover:bg-bg-subtle"
                >
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

      <p className="text-xs text-text-muted">
        Mostrando {filtered.length} de {contacts.length} contacto
        {contacts.length === 1 ? "" : "s"}. Updates en tiempo real via Supabase
        Realtime.
      </p>
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

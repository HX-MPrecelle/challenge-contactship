"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SyncStatusBadge } from "@/components/contacts/SyncStatusBadge";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

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
>;

type Props = {
  initialContacts: ContactRow[];
  orgId: string;
};

/**
 * Client-side contact list. The server component fetches the initial page;
 * after mount we subscribe to postgres_changes on contacts filtered by
 * org_id, so any sync write (webhook, manual edit, initial import finish)
 * shows up without a page refresh. RLS protects the subscription too —
 * users can only ever receive rows for their own org.
 */
export function ContactList({ initialContacts, orgId }: Props) {
  const [contacts, setContacts] = useState<ContactRow[]>(initialContacts);
  const [query, setQuery] = useState("");

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
            setContacts((prev) => {
              if (prev.some((c) => c.id === row.id)) return prev;
              return [row, ...prev];
            });
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
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => {
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
  }, [contacts, query]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-md">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
        />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre, email, empresa, etapa..."
          className="h-10 pl-9"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border-default bg-bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-bg-elevated">
            <tr className="text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
              <th className="px-4 py-2.5">Nombre</th>
              <th className="px-4 py-2.5">Email</th>
              <th className="px-4 py-2.5">Empresa</th>
              <th className="px-4 py-2.5">Cargo</th>
              <th className="px-4 py-2.5">Etapa</th>
              <th className="px-4 py-2.5">Sync</th>
            </tr>
          </thead>
          <tbody className="text-text-primary">
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm text-text-muted"
                >
                  {contacts.length === 0
                    ? "Sin contactos sincronizados todavía."
                    : "Ningún contacto coincide con esa búsqueda."}
                </td>
              </tr>
            )}
            {filtered.map((c) => (
              <tr
                key={c.id}
                className="cursor-pointer border-t border-border-default transition-colors hover:bg-bg-subtle"
              >
                <td className="px-4 py-3 font-medium">
                  <Link
                    href={`/contacts/${c.id}`}
                    className="block w-full text-text-primary"
                  >
                    {[c.first_name, c.last_name].filter(Boolean).join(" ") ||
                      "—"}
                  </Link>
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  <Link href={`/contacts/${c.id}`} className="block w-full">
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
            ))}
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

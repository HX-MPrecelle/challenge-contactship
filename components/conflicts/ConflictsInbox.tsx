"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ConflictListItem } from "./ConflictListItem";
import { ConflictDetail } from "./ConflictDetail";

type ConflictContact = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  company: string | null;
  job_title: string | null;
  local_updated_at: string;
};

export function ConflictsInbox({
  initialContacts,
  orgId,
}: {
  initialContacts: ConflictContact[];
  orgId: string;
}) {
  const [contacts, setContacts] = useState<ConflictContact[]>(initialContacts);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialContacts[0]?.id ?? null
  );

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("conflicts-realtime")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "contacts",
          filter: `org_id=eq.${orgId}`,
        },
        (payload) => {
          const row = payload.new as ConflictContact & { sync_status: string; is_archived: boolean };
          if (row.sync_status === "conflict" && !row.is_archived) {
            setContacts((prev) => {
              const exists = prev.some((c) => c.id === row.id);
              if (exists) return prev.map((c) => (c.id === row.id ? row : c));
              return [row, ...prev];
            });
          } else {
            setContacts((prev) => prev.filter((c) => c.id !== row.id));
            setSelectedId((prev) => {
              if (prev !== row.id) return prev;
              const remaining = contacts.filter((c) => c.id !== row.id);
              return remaining[0]?.id ?? null;
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orgId, contacts]);

  const selected = contacts.find((c) => c.id === selectedId) ?? null;

  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-6 py-20 text-center">
        {/* Celebration icon */}
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-success-subtle">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-12 w-12 text-success">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {/* Decorative ring */}
          <div className="absolute inset-0 animate-ping rounded-full bg-success-subtle opacity-30" />
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold text-text-primary">
            Todo en sync 🎉
          </h2>
          <p className="max-w-sm text-sm text-text-secondary">
            No hay conflictos pendientes. Tu base de contactos está perfectamente
            sincronizada con HubSpot — todos los cambios están alineados.
          </p>
        </div>

        <div className="flex gap-2">
          <a
            href="/contacts"
            className="rounded-lg border border-border-default px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-subtle hover:text-text-primary"
          >
            Ver contactos
          </a>
          <a
            href="/activity"
            className="rounded-lg border border-border-default px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-subtle hover:text-text-primary"
          >
            Ver actividad
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-10rem)] overflow-hidden rounded-xl border border-border-default">
      {/* List panel */}
      <div className="flex w-[380px] shrink-0 flex-col border-r border-border-default overflow-y-auto">
        <div className="border-b border-border-default px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-text-primary">
              Conflictos pendientes
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-error-subtle px-2 py-0.5 text-xs font-medium text-error">
              <span className="h-1.5 w-1.5 rounded-full bg-error animate-pulse-dot" />
              {contacts.length}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-text-muted">
            Resolución campo por campo o aplicación masiva.
          </p>
        </div>
        <div className="flex flex-col">
          {contacts.map((c) => (
            <ConflictListItem
              key={c.id}
              contact={c}
              active={c.id === selectedId}
              onClick={() => setSelectedId(c.id)}
            />
          ))}
        </div>
      </div>

      {/* Detail panel */}
      <div className="flex-1 bg-bg-surface overflow-hidden">
        {selected ? (
          <ConflictDetail
            key={selected.id}
            contact={selected}
            onResolved={() => {
              setContacts((prev) => {
                const next = prev.filter((c) => c.id !== selected.id);
                setSelectedId(next[0]?.id ?? null);
                return next;
              });
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-text-muted">
              Seleccioná un conflicto de la lista.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

import { redirect } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Pencil,
  Plus,
  SkipForward,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ type?: string; direction?: string }>;
};

const EVENT_META: Record<
  string,
  { Icon: typeof Plus; label: string; iconClass: string; bgClass: string }
> = {
  create:   { Icon: Plus,          label: "Creado",     iconClass: "text-success", bgClass: "bg-success-subtle" },
  update:   { Icon: Pencil,        label: "Actualizado",iconClass: "text-brand",   bgClass: "bg-brand-subtle"   },
  delete:   { Icon: Trash2,        label: "Archivado",  iconClass: "text-text-muted", bgClass: "bg-bg-subtle"   },
  conflict: { Icon: AlertTriangle, label: "Conflicto",  iconClass: "text-error",   bgClass: "bg-error-subtle"   },
  skip:     { Icon: SkipForward,   label: "Descartado", iconClass: "text-text-muted", bgClass: "bg-bg-subtle"   },
};

export default async function ActivityPage({ searchParams }: Props) {
  const { type, direction } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const orgId = user.user_metadata?.org_id as string | undefined;
  if (!orgId) redirect("/login?error=no-org");

  let query = supabase
    .from("sync_events")
    .select("id, event_type, direction, created_at, error_message, contact_id")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (type) query = query.eq("event_type", type);
  if (direction) query = query.eq("direction", direction);

  const { data: events } = await query;

  const EVENT_TYPES = ["create", "update", "conflict", "error", "skip"];
  const DIRECTIONS = [
    { value: "hubspot_to_local", label: "← HubSpot" },
    { value: "local_to_hubspot", label: "→ HubSpot" },
  ];

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <header className="pb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Activity</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Audit trail de todos los eventos de sincronización.
        </p>
      </header>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        <FilterChip href="/activity" label="Todos" active={!type && !direction} />
        {EVENT_TYPES.map((t) => (
          <FilterChip
            key={t}
            href={`/activity?type=${t}`}
            label={EVENT_META[t]?.label ?? t}
            active={type === t}
          />
        ))}
        <span className="h-5 w-px self-center bg-border-default" />
        {DIRECTIONS.map((d) => (
          <FilterChip
            key={d.value}
            href={`/activity?direction=${d.value}`}
            label={d.label}
            active={direction === d.value}
          />
        ))}
      </div>

      {/* Timeline */}
      {(events ?? []).length === 0 ? (
        <div className="rounded-xl border border-border-default bg-bg-surface px-6 py-12 text-center">
          <p className="text-sm text-text-muted">Sin eventos que mostrar.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border-default bg-bg-surface">
          <ol className="flex flex-col">
            {(events ?? []).map((event, index) => {
              const isLast = index === (events?.length ?? 0) - 1;
              const meta = EVENT_META[event.event_type] ?? {
                Icon: Pencil,
                label: event.event_type,
                iconClass: "text-text-muted",
                bgClass: "bg-bg-subtle",
              };
              const contactName = event.contact_id
                ? event.contact_id.slice(0, 8) + "…"
                : "—";
              const DirIcon =
                event.direction === "hubspot_to_local"
                  ? ArrowDownToLine
                  : ArrowUpFromLine;

              return (
                <li
                  key={event.id}
                  className={`flex gap-4 px-5 py-4 ${!isLast ? "border-b border-border-default" : ""}`}
                >
                  <div
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${meta.bgClass} ${meta.iconClass}`}
                  >
                    <meta.Icon size={13} />
                  </div>
                  <div className="flex flex-1 flex-col gap-0.5 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-primary">{meta.label}</span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-bg-subtle px-1.5 py-0.5 font-mono text-xs text-text-secondary">
                        <DirIcon size={10} />
                        {event.direction === "hubspot_to_local" ? "desde HubSpot" : "hacia HubSpot"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {event.contact_id ? (
                        <Link
                          href={`/contacts/${event.contact_id}`}
                          className="text-xs text-brand hover:underline"
                        >
                          {contactName}
                        </Link>
                      ) : (
                        <span className="text-xs text-text-muted">{contactName}</span>
                      )}
                    </div>
                    {event.error_message && (
                      <span className="mt-0.5 text-xs text-error">{event.error_message}</span>
                    )}
                  </div>
                  <span className="shrink-0 font-mono text-xs text-text-muted">
                    {new Date(event.created_at).toLocaleString("es-AR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </main>
  );
}

function FilterChip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-brand bg-brand-subtle text-brand-on-subtle"
          : "border-border-default text-text-secondary hover:border-border-strong hover:text-text-primary",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

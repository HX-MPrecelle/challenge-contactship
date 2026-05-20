import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Pencil,
  Plus,
  SkipForward,
  Trash2,
} from "lucide-react";

type SyncEvent = {
  id: string;
  direction: string;
  event_type: string;
  created_at: string;
  error_message: string | null;
};

const EVENT_META: Record<
  string,
  { Icon: typeof Plus; label: string; iconClass: string; bgClass: string }
> = {
  create: {
    Icon: Plus,
    label: "Contacto creado",
    iconClass: "text-success",
    bgClass: "bg-success-subtle",
  },
  update: {
    Icon: Pencil,
    label: "Actualizado",
    iconClass: "text-brand",
    bgClass: "bg-brand-subtle",
  },
  delete: {
    Icon: Trash2,
    label: "Archivado",
    iconClass: "text-text-muted",
    bgClass: "bg-bg-elevated",
  },
  conflict: {
    Icon: AlertTriangle,
    label: "Conflicto",
    iconClass: "text-error",
    bgClass: "bg-error-subtle",
  },
  skip: {
    Icon: SkipForward,
    label: "Evento descartado (out of order o duplicado)",
    iconClass: "text-text-muted",
    bgClass: "bg-bg-elevated",
  },
};

export function ContactTimeline({ events }: { events: SyncEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-text-muted">
        Sin eventos de sincronización todavía.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-3">
      {events.map((event) => {
        const meta =
          EVENT_META[event.event_type] ?? {
            Icon: Pencil,
            label: event.event_type,
            iconClass: "text-text-muted",
            bgClass: "bg-bg-elevated",
          };
        const DirIcon =
          event.direction === "hubspot_to_local"
            ? ArrowDownToLine
            : ArrowUpFromLine;
        return (
          <li key={event.id} className="flex items-start gap-3">
            <div
              className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-full ${meta.bgClass} ${meta.iconClass}`}
            >
              <meta.Icon size={13} />
            </div>
            <div className="flex flex-col gap-0.5 text-sm">
              <div className="flex items-center gap-2 text-text-primary">
                <span className="font-medium">{meta.label}</span>
                <span className="inline-flex items-center gap-1 rounded-md bg-bg-elevated px-1.5 py-0.5 text-xs text-text-secondary">
                  <DirIcon size={11} />
                  {event.direction === "hubspot_to_local"
                    ? "desde HubSpot"
                    : "hacia HubSpot"}
                </span>
              </div>
              <span className="text-xs text-text-muted">
                {new Date(event.created_at).toLocaleString("es-AR", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
              {event.error_message && (
                <span className="mt-1 text-xs text-error">
                  {event.error_message}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

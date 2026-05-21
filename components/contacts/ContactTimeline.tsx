import { useI18n } from "@/lib/i18n/context";
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

export function ContactTimeline({ events }: { events: SyncEvent[] }) {
  const { t } = useI18n();

  const EVENT_META: Record<
    string,
    { Icon: typeof Plus; labelKey: string; iconClass: string; bgClass: string }
  > = {
    create:   { Icon: Plus,          labelKey: "timeline.event.create",   iconClass: "text-success",      bgClass: "bg-success-subtle" },
    update:   { Icon: Pencil,        labelKey: "timeline.event.update",   iconClass: "text-brand",        bgClass: "bg-brand-subtle"   },
    delete:   { Icon: Trash2,        labelKey: "timeline.event.delete",   iconClass: "text-text-muted",   bgClass: "bg-bg-subtle"      },
    conflict: { Icon: AlertTriangle, labelKey: "timeline.event.conflict", iconClass: "text-error",        bgClass: "bg-error-subtle"   },
    skip:     { Icon: SkipForward,   labelKey: "timeline.event.skip",     iconClass: "text-text-muted",   bgClass: "bg-bg-subtle"      },
  };

  if (events.length === 0) {
    return <p className="text-sm text-text-muted">{t("timeline.empty")}</p>;
  }

  return (
    <ol className="flex flex-col">
      {events.map((event, index) => {
        const isLast = index === events.length - 1;
        const meta = EVENT_META[event.event_type] ?? {
          Icon: Pencil,
          labelKey: "timeline.event.update",
          iconClass: "text-text-muted",
          bgClass: "bg-bg-subtle",
        };
        const DirIcon =
          event.direction === "hubspot_to_local" ? ArrowDownToLine : ArrowUpFromLine;

        return (
          <li key={event.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${meta.bgClass} ${meta.iconClass}`}
              >
                <meta.Icon size={13} />
              </div>
              {!isLast && <div className="my-1.5 w-px flex-1 bg-border-default" />}
            </div>

            <div className={`flex flex-col gap-0.5 text-sm ${!isLast ? "pb-4" : ""}`}>
              <div className="flex items-center gap-2 text-text-primary">
                <span className="font-medium">{t(meta.labelKey as Parameters<typeof t>[0])}</span>
                <span className="inline-flex items-center gap-1 rounded-md bg-bg-subtle px-1.5 py-0.5 font-mono text-xs text-text-secondary">
                  <DirIcon size={11} />
                  {event.direction === "hubspot_to_local"
                    ? t("timeline.direction.from")
                    : t("timeline.direction.to")}
                </span>
              </div>
              <span className="font-mono text-xs text-text-muted">
                {new Date(event.created_at).toLocaleString("es-AR", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
              {event.error_message && (
                <span className="mt-1 text-xs text-error">{event.error_message}</span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

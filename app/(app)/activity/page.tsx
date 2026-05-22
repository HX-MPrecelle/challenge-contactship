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
import { BackButton } from "@/components/layout/BackButton";
import { getServerT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

type Props = {
  searchParams: Promise<{ type?: string; direction?: string; page?: string }>;
};

export default async function ActivityPage({ searchParams }: Props) {
  const { type, direction, page: pageStr } = await searchParams;
  const page = Math.max(0, parseInt(pageStr ?? "0") || 0);
  const offset = page * PAGE_SIZE;

  const supabase = await createClient();
  const { t } = await getServerT();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const orgId = (user.app_metadata?.org_id ?? user.user_metadata?.org_id) as string | undefined;
  if (!orgId) redirect("/login?error=no-org");

  let countQuery = supabase
    .from("sync_events")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId);

  let query = supabase
    .from("sync_events")
    .select("id, event_type, direction, created_at, error_message, contact_id")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (type) { query = query.eq("event_type", type); countQuery = countQuery.eq("event_type", type); }
  if (direction) { query = query.eq("direction", direction); countQuery = countQuery.eq("direction", direction); }

  const [{ data: events }, { count: totalCount }] = await Promise.all([query, countQuery]);
  const totalPages = Math.max(1, Math.ceil((totalCount ?? 0) / PAGE_SIZE));

  const EVENT_META: Record<
    string,
    { Icon: typeof Plus; label: string; iconClass: string; bgClass: string }
  > = {
    create:   { Icon: Plus,          label: t("activity.event.create"),   iconClass: "text-success",   bgClass: "bg-success-subtle" },
    update:   { Icon: Pencil,        label: t("activity.event.update"),   iconClass: "text-brand",     bgClass: "bg-brand-subtle"   },
    delete:   { Icon: Trash2,        label: t("activity.event.delete"),   iconClass: "text-text-muted", bgClass: "bg-bg-subtle"     },
    conflict: { Icon: AlertTriangle, label: t("activity.event.conflict"), iconClass: "text-error",     bgClass: "bg-error-subtle"   },
    skip:     { Icon: SkipForward,   label: t("activity.event.skip"),     iconClass: "text-text-muted", bgClass: "bg-bg-subtle"     },
  };

  const EVENT_TYPES = ["create", "update", "conflict", "error", "skip"];
  const DIRECTIONS = [
    { value: "hubspot_to_local", label: t("activity.filter.fromHubspot") },
    { value: "local_to_hubspot", label: t("activity.filter.toHubspot") },
  ];

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <BackButton />
      <header className="pb-6">
        <h1 className="text-2xl font-semibold text-text-primary">{t("activity.title")}</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {t("activity.subtitle")}
        </p>
      </header>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        <FilterChip href="/activity" label={t("activity.filter.all")} active={!type && !direction} />
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
          <p className="text-sm text-text-muted">{t("activity.empty")}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border-default bg-bg-surface">
          <div className="max-h-[600px] overflow-y-auto">
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
                        {event.direction === "hubspot_to_local" ? t("activity.direction.from") : t("activity.direction.to")}
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
          {/* Pagination footer */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border-default px-5 py-3">
              <span className="text-xs text-text-muted">
                {t("activity.pagination.info", { page: page + 1, total: totalPages, count: totalCount ?? 0 })}
              </span>
              <div className="flex items-center gap-1.5">
                {page > 0 && (
                  <Link
                    href={`/activity?${new URLSearchParams({ ...(type ? { type } : {}), ...(direction ? { direction } : {}), page: String(page - 1) }).toString()}`}
                    className="rounded-md border border-border-default px-3 py-1 text-xs text-text-secondary hover:bg-bg-subtle"
                  >
                    {t("activity.pagination.prev")}
                  </Link>
                )}
                {page < totalPages - 1 && (
                  <Link
                    href={`/activity?${new URLSearchParams({ ...(type ? { type } : {}), ...(direction ? { direction } : {}), page: String(page + 1) }).toString()}`}
                    className="rounded-md border border-border-default px-3 py-1 text-xs text-text-secondary hover:bg-bg-subtle"
                  >
                    {t("activity.pagination.next")}
                  </Link>
                )}
              </div>
            </div>
          )}
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

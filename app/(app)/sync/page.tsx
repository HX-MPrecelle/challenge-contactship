import { redirect } from "next/navigation";
import Link from "next/link";
import { Activity, RefreshCw } from "lucide-react";
import { SyncHealthPanel } from "@/components/sync/SyncHealthPanel";
import { createClient } from "@/lib/supabase/server";
import { ResyncButton } from "./ResyncButton";
import { BackButton } from "@/components/layout/BackButton";
import { getServerT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function SyncPage() {
  const supabase = await createClient();
  const { t } = await getServerT();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const orgId = (user.app_metadata?.org_id ?? user.user_metadata?.org_id) as string | undefined;
  if (!orgId) redirect("/login?error=no-org");

  const { data: connection } = await supabase
    .from("hubspot_connections")
    .select("portal_name, last_synced_at, needs_reconnect")
    .eq("org_id", orgId)
    .maybeSingle();

  const { data: recentEvents } = await supabase
    .from("sync_events")
    .select("id, event_type, direction, created_at, error_message")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <main className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-8">
      <BackButton />
      <header className="flex items-start justify-between pb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">{t("sync.title")}</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {t("sync.subtitle")}
          </p>
        </div>
        <ResyncButton />
      </header>

      {connection && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-border-default bg-bg-surface px-4 py-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white"
              style={{ backgroundColor: "#FF7A59" }}
            >
              H
            </div>
            <div>
              <span className="text-sm font-medium text-text-primary">
                {connection.portal_name ?? t("nav.settings.hubspot")}
              </span>
              {connection.last_synced_at && (
                <p className="font-mono text-xs text-text-muted">
                  {t("sync.lastSync")}{" "}
                  {new Date(connection.last_synced_at).toLocaleString("es-AR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {connection.needs_reconnect ? (
              <span className="rounded-full bg-error-subtle px-2 py-0.5 text-xs font-medium text-error">
                {t("settings.hubspot.reconnect")}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success-subtle px-2 py-0.5 text-xs font-medium text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-dot" />
                {t("settings.hubspot.live")}
              </span>
            )}
          </div>
        </div>
      )}

      <SyncHealthPanel orgId={orgId} />

      {/* Recent events */}
      <section className="mt-6 flex flex-col gap-4 rounded-xl border border-border-default bg-bg-surface p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-primary">
            {t("sync.activity.title")}
          </h2>
          <Link
            href="/activity"
            className="text-xs text-brand hover:underline"
          >
            {t("sync.activity.viewAll")}
          </Link>
        </div>
        {(recentEvents ?? []).length === 0 ? (
          <p className="text-sm text-text-muted">{t("sync.activity.none")}</p>
        ) : (
          <div className="max-h-72 overflow-y-auto rounded-lg border border-border-default">
            <ol className="flex flex-col divide-y divide-border-default">
              {(recentEvents ?? []).map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <EventDot type={e.event_type} />
                    <span className="font-medium text-text-primary capitalize">{e.event_type}</span>
                    <span className="text-text-muted">
                      {e.direction === "hubspot_to_local" ? t("activity.filter.fromHubspot") : t("activity.filter.toHubspot")}
                    </span>
                  </div>
                  <span className="shrink-0 font-mono text-text-muted">
                    {new Date(e.created_at).toLocaleString("es-AR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>
    </main>
  );
}

function EventDot({ type }: { type: string }) {
  const color =
    type === "conflict" || type === "error"
      ? "bg-error"
      : type === "create" || type === "update"
        ? "bg-success"
        : "bg-text-muted";
  return <span className={`h-1.5 w-1.5 rounded-full ${color}`} />;
}

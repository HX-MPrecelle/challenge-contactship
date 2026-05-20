import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export async function SyncHealthPanel({ orgId }: { orgId: string }) {
  const supabase = await createClient();

  const [syncedRes, pendingRes, conflictRes, errorRes, connRes, lastEventRes] =
    await Promise.all([
      supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("is_archived", false)
        .eq("sync_status", "synced"),
      supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("is_archived", false)
        .eq("sync_status", "pending"),
      supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("is_archived", false)
        .eq("sync_status", "conflict"),
      supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("is_archived", false)
        .eq("sync_status", "error"),
      supabase
        .from("hubspot_connections")
        .select("last_synced_at, needs_reconnect, portal_name")
        .eq("org_id", orgId)
        .maybeSingle(),
      supabase
        .from("sync_events")
        .select("created_at")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const synced = syncedRes.count ?? 0;
  const pending = pendingRes.count ?? 0;
  const conflicts = conflictRes.count ?? 0;
  const errors = errorRes.count ?? 0;
  const lastEvent = lastEventRes.data?.created_at ?? connRes.data?.last_synced_at;

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border-default bg-bg-surface p-6">
      <header>
        <h2 className="font-heading text-lg font-semibold text-text-primary">
          Estado del sync
        </h2>
        <p className="text-sm text-text-secondary">
          Salud actual del espejo local frente a HubSpot.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          icon={<CheckCircle2 size={14} />}
          tone="success"
          count={synced}
          label="Sincronizados"
        />
        <StatTile
          icon={<Clock size={14} />}
          tone="warning"
          count={pending}
          label="Pendientes"
          href={pending > 0 ? "/contacts?status=pending" : undefined}
        />
        <StatTile
          icon={<AlertTriangle size={14} />}
          tone="error"
          count={conflicts}
          label="Conflictos"
          href={conflicts > 0 ? "/contacts?status=conflict" : undefined}
        />
        <StatTile
          icon={<AlertCircle size={14} />}
          tone="error"
          count={errors}
          label="Errores"
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border-default bg-bg-elevated px-4 py-2.5 text-xs">
        <span className="text-text-secondary">Última actividad de sync</span>
        <span className="font-mono text-text-primary">
          {lastEvent
            ? new Date(lastEvent).toLocaleString("es-AR", {
                dateStyle: "medium",
                timeStyle: "short",
              })
            : "—"}
        </span>
      </div>

      {connRes.data?.needs_reconnect && (
        <div className="rounded-lg border border-error/40 bg-error-subtle px-4 py-2.5 text-xs text-error">
          La conexión con HubSpot dejó de funcionar. Reconectá la cuenta para
          que vuelva a sincronizar.
        </div>
      )}
    </section>
  );
}

function StatTile({
  icon,
  tone,
  count,
  label,
  href,
}: {
  icon: React.ReactNode;
  tone: "success" | "warning" | "error";
  count: number;
  label: string;
  href?: string;
}) {
  const palette: Record<typeof tone, { bg: string; text: string }> = {
    success: { bg: "bg-success-subtle", text: "text-success" },
    warning: { bg: "bg-warning-subtle", text: "text-warning" },
    error: { bg: "bg-error-subtle", text: "text-error" },
  };
  const p = palette[tone];

  const inner = (
    <div
      className={`flex h-full flex-col items-start gap-2 rounded-lg border border-border-default bg-bg-elevated px-3.5 py-3 transition-colors ${href ? "hover:border-border-strong" : ""}`}
    >
      <div
        className={`flex h-7 w-7 items-center justify-center rounded-md ${p.bg} ${p.text}`}
      >
        {icon}
      </div>
      <div className="flex flex-col">
        <span
          className={`font-heading text-2xl font-semibold ${count > 0 ? p.text : "text-text-primary"}`}
        >
          {count}
        </span>
        <span className="text-xs text-text-secondary">{label}</span>
      </div>
    </div>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}

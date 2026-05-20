import { redirect } from "next/navigation";
import Link from "next/link";
import { Plug, PlugZap, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SyncHealthPanel } from "@/components/sync/SyncHealthPanel";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const orgId = user.user_metadata?.org_id as string | undefined;
  if (!orgId) redirect("/login?error=no-org");

  const [{ data: org }, { data: connection }] = await Promise.all([
    supabase.from("organizations").select("name, email_domain").eq("id", orgId).maybeSingle(),
    supabase
      .from("hubspot_connections")
      .select("portal_id, portal_name, scopes, connected_at, last_synced_at, needs_reconnect")
      .eq("org_id", orgId)
      .maybeSingle(),
  ]);

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-8">
      <header className="flex items-center gap-3 pb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-subtle text-brand">
          <Settings2 size={18} />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-semibold text-text-primary">
            Settings
          </h1>
          <p className="text-sm text-text-secondary">
            Conexión con HubSpot, salud del sync, y datos de organización.
          </p>
        </div>
      </header>

      <section className="rounded-xl border border-border-default bg-bg-surface p-6">
        <h2 className="font-heading text-lg font-semibold text-text-primary">
          Organización
        </h2>
        <dl className="mt-3 flex flex-col gap-1.5 text-sm">
          <Row label="Nombre" value={org?.name ?? "—"} />
          <Row label="Dominio" value={org?.email_domain ?? "(sin dominio)"} mono />
        </dl>
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-border-default bg-bg-surface p-6">
        <header className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                connection && !connection.needs_reconnect
                  ? "bg-success-subtle text-success"
                  : "bg-warning-subtle text-warning"
              }`}
            >
              {connection && !connection.needs_reconnect ? (
                <PlugZap size={16} />
              ) : (
                <Plug size={16} />
              )}
            </div>
            <div>
              <h2 className="font-heading text-lg font-semibold text-text-primary">
                Conexión HubSpot
              </h2>
              <p className="text-xs text-text-secondary">
                {connection
                  ? `Portal ${connection.portal_id}${connection.portal_name ? ` · ${connection.portal_name}` : ""}`
                  : "No hay portal conectado."}
              </p>
            </div>
          </div>
          {(!connection || connection.needs_reconnect) && (
            <Button asChild size="sm">
              <Link href="/api/hubspot/connect">
                {connection ? "Reconectar" : "Conectar HubSpot"}
              </Link>
            </Button>
          )}
        </header>

        {connection && (
          <dl className="flex flex-col gap-1.5 text-sm">
            <Row
              label="Conectado el"
              value={new Date(connection.connected_at).toLocaleString("es-AR", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            />
            <Row
              label="Último sync"
              value={
                connection.last_synced_at
                  ? new Date(connection.last_synced_at).toLocaleString("es-AR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })
                  : "—"
              }
            />
            <Row
              label="Scopes"
              value={connection.scopes?.join(", ") ?? "—"}
              mono
            />
          </dl>
        )}
      </section>

      <SyncHealthPanel orgId={orgId} />
    </main>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-xs text-text-secondary">{label}</dt>
      <dd
        className={`text-right text-sm text-text-primary ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

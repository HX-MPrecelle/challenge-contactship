import { redirect } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Loader2,
  Plug,
  PlugZap,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SyncHealthPanel } from "@/components/sync/SyncHealthPanel";
import { SettingsNav } from "@/components/settings/SettingsNav";
import { SettingsSection, SettingsRow } from "@/components/settings/SettingsSection";
import { BackButton } from "@/components/layout/BackButton";
import { createClient } from "@/lib/supabase/server";
import { OrgNameForm } from "./OrgNameForm";
import { HubSpotActions } from "./HubSpotActions";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ section?: string }>;
};

export default async function SettingsPage({ searchParams }: Props) {
  const { section = "general" } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const orgId = user.user_metadata?.org_id as string | undefined;
  if (!orgId) redirect("/login?error=no-org");

  const [{ data: org }, { data: connection }, { count: contactCount }] =
    await Promise.all([
      supabase
        .from("organizations")
        .select("name, email_domain")
        .eq("id", orgId)
        .maybeSingle(),
      supabase
        .from("hubspot_connections")
        .select(
          "portal_id, portal_name, scopes, connected_at, last_synced_at, needs_reconnect"
        )
        .eq("org_id", orgId)
        .maybeSingle(),
      supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId),
    ]);

  const isConnected = !!connection && !connection.needs_reconnect;

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <BackButton />
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text-primary">Settings</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Configuración de organización, HubSpot y preferencias de IA.
        </p>
      </div>

      <div className="flex gap-8">
        <SettingsNav activeSection={section} />

        <div className="flex flex-1 flex-col gap-8 min-w-0">
          {/* ── General ── */}
          {section === "general" && (
            <>
              <SettingsSection
                title="Organización"
                description="Información básica de tu workspace."
              >
                <SettingsRow
                  title="Nombre de la organización"
                  description="Se muestra en toda la interfaz y en los emails."
                >
                  <OrgNameForm currentName={org?.name ?? ""} />
                </SettingsRow>
                <SettingsRow
                  title="Dominio de email"
                  description="Dominio del workspace. No editable."
                >
                  <span className="font-mono text-xs text-text-muted">
                    {org?.email_domain ?? "—"}
                  </span>
                </SettingsRow>
              </SettingsSection>
            </>
          )}

          {/* ── HubSpot ── */}
          {section === "hubspot" && (
            <>
              {/* Connection card */}
              <div
                className={`rounded-xl border p-5 ${
                  isConnected
                    ? "border-border-default bg-bg-surface"
                    : "border-warning/40 bg-warning-subtle"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* HubSpot avatar */}
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-white text-lg font-bold"
                    style={{ backgroundColor: "#FF7A59" }}
                  >
                    H
                  </div>

                  <div className="flex flex-1 flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-text-primary">
                        {connection?.portal_name ?? "HubSpot"}
                      </span>
                      {isConnected ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-success-subtle px-2 py-0.5 text-xs font-medium text-success">
                          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-dot" />
                          Live
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-subtle px-2 py-0.5 text-xs font-medium text-warning">
                          Desconectado
                        </span>
                      )}
                    </div>

                    {connection && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                        <span className="font-mono text-xs text-text-muted">
                          Portal {connection.portal_id}
                        </span>
                        <span className="font-mono text-xs text-text-muted">
                          {contactCount ?? 0} contactos sincronizados
                        </span>
                        <span className="font-mono text-xs text-text-muted">
                          Conectado{" "}
                          {new Date(connection.connected_at).toLocaleDateString(
                            "es-AR",
                            { dateStyle: "medium" }
                          )}
                        </span>
                        {connection.last_synced_at && (
                          <span className="font-mono text-xs text-text-muted">
                            Último sync{" "}
                            {new Date(
                              connection.last_synced_at
                            ).toLocaleString("es-AR", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {isConnected ? (
                      <HubSpotActions />
                    ) : (
                      <Button asChild size="sm">
                        <Link href="/api/hubspot/connect">
                          <Plug size={14} />
                          {connection?.needs_reconnect
                            ? "Reconectar"
                            : "Conectar HubSpot"}
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {!connection && (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border-strong px-6 py-10 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-bg-subtle text-text-muted">
                    <PlugZap size={22} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      Sin portal conectado
                    </p>
                    <p className="mt-1 text-xs text-text-secondary">
                      Conectá tu portal de HubSpot para sincronizar contactos.
                    </p>
                  </div>
                  <Button asChild size="sm">
                    <Link href="/api/hubspot/connect">
                      <Plug size={14} />
                      Conectar HubSpot
                    </Link>
                  </Button>
                </div>
              )}
            </>
          )}

          {/* ── Sync ── */}
          {section === "sync" && (
            <>
              <SettingsSection
                title="Sincronización"
                description="Configurá cómo se comporta el sync entre ContactShip y HubSpot."
              >
                <SettingsRow
                  title="Sync bidireccional"
                  description="Los cambios locales se escriben en HubSpot automáticamente."
                >
                  <TogglePlaceholder defaultOn />
                </SettingsRow>
                <SettingsRow
                  title="Webhooks de HubSpot"
                  description="Recibe cambios de HubSpot en tiempo real."
                >
                  <TogglePlaceholder defaultOn />
                </SettingsRow>
                <SettingsRow
                  title="Estrategia de conflictos"
                  description="Qué versión gana cuando hay un conflicto de datos."
                >
                  <span className="rounded-md border border-border-default px-3 py-1.5 text-xs font-medium text-text-secondary">
                    Manual (revisar en /conflicts)
                  </span>
                </SettingsRow>
              </SettingsSection>

              <SyncHealthPanel orgId={orgId} />
            </>
          )}

          {/* ── AI ── */}
          {section === "ai" && (
            <SettingsSection
              title="Inteligencia Artificial"
              description="Configurá el comportamiento del copiloto de IA."
            >
              <SettingsRow
                title="Generar insights automáticamente"
                description="Genera AI Insights al abrir el perfil de un contacto."
              >
                <TogglePlaceholder defaultOn />
              </SettingsRow>
              <SettingsRow
                title="Modelo de lenguaje"
                description="Modelo que usa el chat y los insights."
              >
                <span className="font-mono text-xs text-text-muted">
                  claude-3-5-haiku · Anthropic
                </span>
              </SettingsRow>
              <SettingsRow
                title="Embeddings"
                description="Modelo para búsqueda semántica y contactos similares."
              >
                <span className="font-mono text-xs text-text-muted">
                  text-embedding-3-small · OpenAI
                </span>
              </SettingsRow>
            </SettingsSection>
          )}
        </div>
      </div>
    </main>
  );
}

function TogglePlaceholder({ defaultOn }: { defaultOn?: boolean }) {
  return (
    <div
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
        defaultOn ? "bg-brand" : "bg-border-strong"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
          defaultOn ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </div>
  );
}

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
import { SettingsSection, SettingsRow } from "@/components/settings/SettingsSection";
import { BackButton } from "@/components/layout/BackButton";
import { createClient } from "@/lib/supabase/server";
import { OrgNameForm } from "./OrgNameForm";
import { HubSpotActions } from "./HubSpotActions";
import { getServerT } from "@/lib/i18n/server";
import { ThemeSelector } from "@/components/settings/ThemeSelector";
import { LanguageSelector } from "@/components/settings/LanguageSelector";
import { DensitySelector } from "@/components/settings/DensitySelector";
import { DENSITY_COOKIE, getDensityFromCookieValue } from "@/actions/preferences";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ section?: string }>;
};

export default async function SettingsPage({ searchParams }: Props) {
  const { section = "general" } = await searchParams;

  const cookieStore = await cookies();
  const density = getDensityFromCookieValue(cookieStore.get(DENSITY_COOKIE)?.value);

  const supabase = await createClient();
  const { t } = await getServerT();
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
        <h1 className="text-2xl font-semibold text-text-primary">{t("settings.title")}</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {t("settings.subtitle")}
        </p>
      </div>

      <div className="flex flex-col gap-8">
          {/* ── General ── */}
          {section === "general" && (
            <>
              <SettingsSection
                title={t("settings.general.title")}
                description={t("settings.general.desc")}
              >
                <SettingsRow
                  title={t("settings.general.orgName")}
                  description={t("settings.general.orgNameDesc")}
                >
                  <OrgNameForm currentName={org?.name ?? ""} />
                </SettingsRow>
                <SettingsRow
                  title={t("settings.general.domain")}
                  description={t("settings.general.domainDesc")}
                >
                  <span className="font-mono text-xs text-text-muted">
                    {org?.email_domain
                      ? org.email_domain
                      : t("settings.general.domainGeneric", { domain: user.email?.split("@")[1] ?? "—" })}
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
                          {t("settings.hubspot.live")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-subtle px-2 py-0.5 text-xs font-medium text-warning">
                          {t("settings.hubspot.disconnected")}
                        </span>
                      )}
                    </div>

                    {connection && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                        <span className="font-mono text-xs text-text-muted">
                          Portal {connection.portal_id}
                        </span>
                        <span className="font-mono text-xs text-text-muted">
                          {t("settings.hubspot.contactsSynced", { n: contactCount ?? 0 })}
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
                            ? t("settings.hubspot.reconnect")
                            : t("settings.hubspot.connect")}
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
                      {t("settings.hubspot.noPortal")}
                    </p>
                    <p className="mt-1 text-xs text-text-secondary">
                      {t("settings.hubspot.noPortalDesc")}
                    </p>
                  </div>
                  <Button asChild size="sm">
                    <Link href="/api/hubspot/connect">
                      <Plug size={14} />
                      {t("settings.hubspot.connect")}
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
                title={t("nav.settings.sync")}
                description={t("settings.sync.bidirDesc")}
              >
                <SettingsRow
                  title={t("settings.sync.bidir")}
                  description={t("settings.sync.bidirDesc")}
                >
                  <TogglePlaceholder defaultOn />
                </SettingsRow>
                <SettingsRow
                  title={t("settings.sync.webhooks")}
                  description={t("settings.sync.webhooksDesc")}
                >
                  <TogglePlaceholder defaultOn />
                </SettingsRow>
                <SettingsRow
                  title={t("settings.sync.strategy")}
                  description={t("settings.sync.strategyDesc")}
                >
                  <span className="rounded-md border border-border-default px-3 py-1.5 text-xs font-medium text-text-secondary">
                    {t("settings.sync.strategyValue")}
                  </span>
                </SettingsRow>
              </SettingsSection>

              <SyncHealthPanel orgId={orgId} />
            </>
          )}

          {/* ── AI ── */}
          {section === "ai" && (
            <SettingsSection
              title={t("nav.settings.ai")}
              description={t("settings.ai.autoGenerateDesc")}
            >
              <SettingsRow
                title={t("settings.ai.autoGenerate")}
                description={t("settings.ai.autoGenerateDesc")}
              >
                <TogglePlaceholder defaultOn />
              </SettingsRow>
              <SettingsRow
                title={t("settings.ai.model")}
                description={t("settings.ai.modelDesc")}
              >
                <span className="font-mono text-xs text-text-muted">
                  claude-3-5-haiku · Anthropic
                </span>
              </SettingsRow>
              <SettingsRow
                title={t("settings.ai.embeddings")}
                description={t("settings.ai.embeddingsDesc")}
              >
                <span className="font-mono text-xs text-text-muted">
                  text-embedding-3-small · OpenAI
                </span>
              </SettingsRow>
            </SettingsSection>
          )}

          {/* ── Preferences ── */}
          {section === "preferences" && (
            <SettingsSection
              title={t("settings.preferences.title")}
              description={t("settings.preferences.desc")}
            >
              <SettingsRow
                title={t("language.label")}
                description={t("settings.preferences.desc").split(".")[0] + "."}
              >
                <LanguageSelector />
              </SettingsRow>
              <SettingsRow
                title={t("settings.theme.label")}
                description={t("settings.theme.desc")}
              >
                <ThemeSelector />
              </SettingsRow>
              <SettingsRow
                title={t("settings.density.label")}
                description={t("settings.density.desc")}
              >
                <DensitySelector current={density} />
              </SettingsRow>
            </SettingsSection>
          )}
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

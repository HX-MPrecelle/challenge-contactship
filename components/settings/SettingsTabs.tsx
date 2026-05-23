"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Plug, PlugZap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsSection, SettingsRow } from "@/components/settings/SettingsSection";
import { OrgNameForm } from "@/app/(app)/settings/OrgNameForm";
import { OrgIndustryForm } from "@/app/(app)/settings/OrgIndustryForm";
import { HubSpotActions } from "@/app/(app)/settings/HubSpotActions";
import { ThemeSelector } from "@/components/settings/ThemeSelector";
import { LanguageSelector } from "@/components/settings/LanguageSelector";
import { DensitySelector } from "@/components/settings/DensitySelector";
import { useI18n } from "@/lib/i18n/context";
import type { TableDensity } from "@/lib/preferences";

type Tab = "general" | "hubspot" | "ai" | "preferences";

type Connection = {
  portal_id: string;
  portal_name: string | null;
  scopes: string[] | null;
  connected_at: string;
  last_synced_at: string | null;
  needs_reconnect: boolean;
} | null;

type Org = {
  name: string;
  email_domain: string | null;
  industry: string | null;
} | null;

type Props = {
  org: Org;
  connection: Connection;
  contactCount: number;
  userEmail: string | undefined;
  density: TableDensity;
  syncContent: React.ReactNode;
};

export function SettingsTabs({
  org,
  connection,
  contactCount,
  userEmail,
  density,
  syncContent,
}: Props) {
  const { t } = useI18n();
  const [active, setActive] = useState<Tab>("general");
  const isConnected = !!connection && !connection.needs_reconnect;

  const tabs: { id: Tab; label: string }[] = [
    { id: "general",     label: t("nav.settings.general") },
    { id: "hubspot",     label: t("nav.settings.hubspot") },
    { id: "ai",          label: t("nav.settings.ai") },
    { id: "preferences", label: t("nav.settings.preferences") },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Tab bar */}
      <div className="flex gap-0 border-b border-border-default">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className={[
              "relative px-4 py-2.5 text-sm font-medium transition-colors",
              active === tab.id
                ? "text-text-primary after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-brand after:rounded-t-full"
                : "text-text-secondary hover:text-text-primary",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── General ── */}
      {active === "general" && (
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
            title={t("settings.general.industry")}
            description={t("settings.general.industryDesc")}
          >
            <OrgIndustryForm currentIndustry={org?.industry ?? null} />
          </SettingsRow>
          <SettingsRow
            title={t("settings.general.domain")}
            description={t("settings.general.domainDesc")}
          >
            <span className="font-mono text-xs text-text-muted">
              {org?.email_domain
                ? org.email_domain
                : t("settings.general.domainGeneric", {
                    domain: userEmail?.split("@")[1] ?? "—",
                  })}
            </span>
          </SettingsRow>
        </SettingsSection>
      )}

      {/* ── HubSpot ── */}
      {active === "hubspot" && (
        <div className="flex flex-col gap-6">
          <div
            className={`rounded-xl border p-5 ${
              isConnected
                ? "border-border-default bg-bg-surface"
                : "border-warning/40 bg-warning-subtle"
            }`}
          >
            <div className="flex items-start gap-4">
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
                      {t("settings.hubspot.contactsSynced", { n: contactCount })}
                    </span>
                    <span className="font-mono text-xs text-text-muted">
                      Conectado{" "}
                      {new Date(connection.connected_at).toLocaleDateString("es-AR", {
                        dateStyle: "medium",
                      })}
                    </span>
                    {connection.last_synced_at && (
                      <span className="font-mono text-xs text-text-muted">
                        Último sync{" "}
                        {new Date(connection.last_synced_at).toLocaleString("es-AR", {
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

          {/* Sync settings — moved here since they're HubSpot-specific */}
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

          {syncContent}
        </div>
      )}

      {/* ── AI ── */}
      {active === "ai" && (
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
      {active === "preferences" && (
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

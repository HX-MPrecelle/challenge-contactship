"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { PipelineHealthWidget } from "@/components/dashboard/PipelineHealthWidget";
import { DashboardPriorities } from "@/components/dashboard/DashboardPriorities";
import { WinLossAnalysisSection } from "@/components/insights/WinLossAnalysis";
import { CompetitiveIntelligenceSection } from "@/components/insights/CompetitiveIntelligence";

type Tab = "pipeline" | "priorities" | "winloss" | "competitive";

export function InsightsTabs() {
  const { t } = useI18n();
  const [active, setActive] = useState<Tab>("pipeline");

  const tabs: { id: Tab; label: string }[] = [
    { id: "pipeline",    label: t("insights.tab.pipeline") },
    { id: "priorities",  label: t("insights.tab.priorities") },
    { id: "winloss",     label: t("insights.tab.winloss") },
    { id: "competitive", label: t("insights.tab.competitive") },
  ];

  return (
    <div className="flex flex-col gap-6">
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

      {active === "pipeline"    && <PipelineHealthWidget />}
      {active === "priorities"  && <DashboardPriorities />}
      {active === "winloss"     && <WinLossAnalysisSection />}
      {active === "competitive" && <CompetitiveIntelligenceSection />}
    </div>
  );
}

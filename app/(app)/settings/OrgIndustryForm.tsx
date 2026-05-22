"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateOrgIndustry } from "@/actions/settings";
import { INDUSTRIES, getIndustryLabel } from "@/lib/industries";
import { useI18n } from "@/lib/i18n/context";

export function OrgIndustryForm({ currentIndustry }: { currentIndustry: string | null }) {
  const { t, locale } = useI18n();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentIndustry);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const result = await updateOrgIndustry(value);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(t("settings.industry.updated"));
      setEditing(false);
    });
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-text-primary">
          {value ? getIndustryLabel(value, locale as "es" | "en") : (
            <span className="text-text-muted">{t("settings.industry.notSet")}</span>
          )}
        </span>
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
          <Pencil size={13} />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={value ?? ""}
        onChange={(e) => setValue(e.target.value || null)}
        disabled={isPending}
        className="h-8 rounded-md border border-border-default bg-bg-surface px-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-brand"
      >
        <option value="">{t("settings.industry.placeholder")}</option>
        {INDUSTRIES.map((ind) => (
          <option key={ind.value} value={ind.value}>
            {ind.emoji} {locale === "es" ? ind.labelEs : ind.value}
          </option>
        ))}
      </select>
      <Button size="sm" onClick={handleSave} disabled={isPending}>
        {isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => { setValue(currentIndustry); setEditing(false); }}
        disabled={isPending}
      >
        {t("common.cancel")}
      </Button>
    </div>
  );
}

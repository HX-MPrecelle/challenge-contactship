"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateOrgName } from "@/actions/settings";
import { useI18n } from "@/lib/i18n/context";

export function OrgNameForm({ currentName }: { currentName: string }) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentName);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const result = await updateOrgName(value);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(t("settings.orgName.updated"));
      setEditing(false);
    });
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-text-primary">{value || "—"}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setEditing(true)}
          aria-label={t("settings.orgName.editAria")}
        >
          <Pencil size={13} />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") { setValue(currentName); setEditing(false); }
        }}
        className="h-8 w-48 text-sm"
        autoFocus
        disabled={isPending}
      />
      <Button size="sm" onClick={handleSave} disabled={isPending}>
        {isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => { setValue(currentName); setEditing(false); }}
        disabled={isPending}
      >
        {t("common.cancel")}
      </Button>
    </div>
  );
}

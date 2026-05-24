"use client";

import { useState } from "react";
import { AlertTriangle, GitMerge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConflictDiffDialog } from "@/components/contacts/ConflictDiffDialog";
import { useI18n } from "@/lib/i18n/context";

export function ConflictBanner({ contactId }: { contactId: string }) {
  const { t } = useI18n();
  const [diffOpen, setDiffOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between gap-3 rounded-lg border border-error/40 bg-error-subtle px-4 py-3">
        <div className="flex items-start gap-2.5">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-error" />
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-medium text-text-primary">{t("conflict.banner.title")}</p>
            <p className="text-xs text-text-secondary">{t("conflict.banner.desc")}</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setDiffOpen(true)}>
          <GitMerge size={13} />
          Resolver conflicto
        </Button>
      </div>

      <ConflictDiffDialog
        open={diffOpen}
        onOpenChange={setDiffOpen}
        contactId={contactId}
      />
    </>
  );
}

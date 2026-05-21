"use client";

import { useTransition } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { triggerResync, reembedAllContacts } from "@/actions/settings";
import { useI18n } from "@/lib/i18n/context";

export function ResyncButton() {
  const { t } = useI18n();
  const [isSyncing, startSync] = useTransition();
  const [isEmbedding, startEmbed] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="sm" onClick={() => startSync(async () => {
        const result = await triggerResync();
        if (!result.success) { toast.error(result.error); return; }
        toast.success(result.message);
      })} disabled={isSyncing || isEmbedding}>
        {isSyncing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
        {t("sync.resync")}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => startEmbed(async () => {
        const result = await reembedAllContacts();
        if (!result.success) { toast.error(result.error); return; }
        toast.info(result.message, { duration: 6000 });
      })} disabled={isSyncing || isEmbedding} title={t("settings.reembed.tooltip")}>
        {isEmbedding ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
        {t("sync.reembed")}
      </Button>
    </div>
  );
}


"use client";

import { useTransition } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { triggerResync, reembedAllContacts } from "@/actions/settings";

export function ResyncButton() {
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
        Re-sync ahora
      </Button>
      <Button variant="ghost" size="sm" onClick={() => startEmbed(async () => {
        const result = await reembedAllContacts();
        if (!result.success) { toast.error(result.error); return; }
        toast.info(result.message, { duration: 6000 });
      })} disabled={isSyncing || isEmbedding} title="Re-generar embeddings con datos enriquecidos">
        {isEmbedding ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
        Re-embed
      </Button>
    </div>
  );
}


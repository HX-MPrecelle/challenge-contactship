"use client";

import { useTransition } from "react";
import { Loader2, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { disconnectHubSpot, triggerResync } from "@/actions/settings";

export function HubSpotActions() {
  const [isSyncing, startSync] = useTransition();
  const [isDisconnecting, startDisconnect] = useTransition();

  function handleResync() {
    startSync(async () => {
      const result = await triggerResync();
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
    });
  }

  function handleDisconnect() {
    if (
      !confirm(
        "¿Seguro que querés desconectar HubSpot? Los contactos sincronizados se mantienen pero no habrá nuevos updates."
      )
    )
      return;

    startDisconnect(async () => {
      await disconnectHubSpot();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="secondary"
        size="sm"
        onClick={handleResync}
        disabled={isSyncing || isDisconnecting}
      >
        {isSyncing ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <RefreshCw size={13} />
        )}
        Re-sync
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDisconnect}
        disabled={isDisconnecting || isSyncing}
        className="text-error hover:bg-error-subtle hover:text-error"
      >
        {isDisconnecting ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <Trash2 size={13} />
        )}
        Desconectar
      </Button>
    </div>
  );
}

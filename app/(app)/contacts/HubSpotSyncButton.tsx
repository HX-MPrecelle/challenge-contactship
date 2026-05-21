"use client";

import { useTransition } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { triggerResync } from "@/actions/settings";

export function HubSpotSyncButton() {
  const [isPending, startTransition] = useTransition();

  function handleSync() {
    startTransition(async () => {
      const result = await triggerResync();
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
    });
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleSync}
      disabled={isPending}
      title="Importar todos los contactos desde HubSpot"
    >
      {isPending ? (
        <Loader2 size={13} className="animate-spin" />
      ) : (
        <RefreshCw size={13} />
      )}
      Sincronizar desde HubSpot
    </Button>
  );
}

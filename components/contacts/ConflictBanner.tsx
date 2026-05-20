"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { resolveConflict } from "@/actions/contacts";

export function ConflictBanner({ contactId }: { contactId: string }) {
  const [isPending, startTransition] = useTransition();
  const [pendingChoice, setPendingChoice] = useState<
    "keep_local" | "use_hubspot" | null
  >(null);

  function resolve(choice: "keep_local" | "use_hubspot") {
    setPendingChoice(choice);
    startTransition(async () => {
      const result = await resolveConflict({ id: contactId, resolution: choice });
      setPendingChoice(null);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(
        choice === "keep_local"
          ? "Tus cambios fueron escritos en HubSpot"
          : "El contacto ahora refleja la versión de HubSpot"
      );
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-error/40 bg-error-subtle px-4 py-3 text-sm">
      <div className="flex items-start gap-2.5">
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-error" />
        <div className="flex flex-col gap-0.5">
          <p className="font-medium text-text-primary">Conflicto detectado</p>
          <p className="text-xs text-text-secondary">
            Este contacto fue editado en HubSpot mientras vos lo modificabas
            localmente. Elegí qué versión mantener.
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => resolve("keep_local")}
          disabled={isPending}
        >
          {isPending && pendingChoice === "keep_local" ? (
            <Loader2 size={12} className="animate-spin" />
          ) : null}
          Mantener mis cambios
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => resolve("use_hubspot")}
          disabled={isPending}
        >
          {isPending && pendingChoice === "use_hubspot" ? (
            <Loader2 size={12} className="animate-spin" />
          ) : null}
          Usar versión de HubSpot
        </Button>
      </div>
    </div>
  );
}

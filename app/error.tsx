"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-bg-base px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-error-subtle">
        <AlertTriangle size={24} className="text-error" />
      </div>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-lg font-semibold text-text-primary">Algo salió mal</h1>
        <p className="max-w-sm text-sm text-text-secondary">
          Ocurrió un error inesperado. Podés intentar de nuevo o volver al inicio.
        </p>
        {error.digest && (
          <p className="font-mono text-[10px] text-text-muted">
            ID: {error.digest}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <Button onClick={reset}>Intentar de nuevo</Button>
        <Button variant="ghost" onClick={() => (window.location.href = "/")}>
          Ir al inicio
        </Button>
      </div>
    </div>
  );
}

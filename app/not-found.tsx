import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyGlyph } from "@/components/ui/empty-glyph";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg-base px-6 text-center">
      <EmptyGlyph kind="search" />
      <div className="flex flex-col gap-1.5">
        <p className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
          404
        </p>
        <h1 className="text-lg font-semibold text-text-primary">
          Página no encontrada
        </h1>
        <p className="max-w-xs text-sm text-text-secondary">
          La URL que buscás no existe o fue movida.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Ir al inicio</Link>
      </Button>
    </div>
  );
}

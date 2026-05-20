import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="flex w-full max-w-md flex-col items-center gap-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-subtle text-brand">
          <Sparkles size={22} />
        </div>

        <div className="flex flex-col gap-3">
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-text-primary">
            ContactShip
          </h1>
          <p className="text-base text-text-secondary">
            Tu CRM con IA accionable, sincronizado con HubSpot en tiempo real.
          </p>
        </div>

        <Button asChild size="lg">
          <Link href="/login">Iniciar sesión</Link>
        </Button>
      </div>
    </main>
  );
}

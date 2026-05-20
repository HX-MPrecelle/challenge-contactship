import { Sparkles } from "lucide-react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-4 pb-8 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-subtle text-brand">
            <Sparkles size={20} />
          </div>
          <div className="flex flex-col gap-1.5">
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-text-primary">
              Bienvenido a ContactShip
            </h1>
            <p className="text-sm text-text-secondary">
              Ingresá con tu email de trabajo
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border-default bg-bg-surface p-6">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}

import { Check } from "lucide-react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      {/* Brand panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-[440px] xl:w-[500px] shrink-0 flex-col justify-between bg-[#0F1115] p-10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white">
            <Check size={14} className="text-[#0F1115]" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-semibold text-white">ContactShip</span>
        </div>

        <div className="flex flex-col gap-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-white/40">
            CRM workspace
          </p>
          <h1 className="text-[2rem] font-semibold leading-[1.15] tracking-tight text-white">
            A CRM workspace that mirrors HubSpot in real time.
          </h1>
          <p className="text-sm leading-relaxed text-white/55">
            AI-powered insights, conflict resolution, and instant sync —
            built for sales teams that live in HubSpot.
          </p>
        </div>

        <p className="font-mono text-[11px] text-white/25">
          ContactShip v2 · {new Date().getFullYear()}
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 flex-col items-center justify-center bg-bg-base px-8 py-12">
        {/* Mobile-only logo */}
        <div className="mb-8 flex items-center gap-2.5 lg:hidden">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-text-primary">
            <Check size={14} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-semibold text-text-primary">ContactShip</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="pb-7">
            <h2 className="text-xl font-semibold text-text-primary">Bienvenido</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Ingresá con tu cuenta de trabajo.
            </p>
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}

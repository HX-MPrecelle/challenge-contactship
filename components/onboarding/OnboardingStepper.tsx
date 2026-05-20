"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Plug,
  PlugZap,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  markOnboardingComplete,
  previewContactCount,
  updateOrganizationName,
} from "@/app/(app)/onboarding/actions";

const STEPS = [
  { id: 1, label: "Bienvenida" },
  { id: 2, label: "Conectar HubSpot" },
  { id: 3, label: "Seleccionar contactos" },
  { id: 4, label: "Sincronización" },
] as const;

type Props = {
  initialStep: number;
  initialOrgName: string;
  hubspotConnected: boolean;
  hubspotPortalName: string | null;
  callbackError?: string;
};

export function OnboardingStepper({
  initialStep,
  initialOrgName,
  hubspotConnected,
  hubspotPortalName,
  callbackError,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState(initialStep);

  useEffect(() => {
    if (!callbackError) return;
    const errorMessages: Record<string, string> = {
      "state-mismatch": "Verificación CSRF fallida. Intentá conectar de nuevo.",
      "missing-code": "HubSpot no devolvió un código de autorización.",
      "oauth-failed": "Falló el intercambio de tokens con HubSpot.",
      "persist-failed": "No pudimos guardar la conexión.",
      "no-org": "Tu sesión perdió la organización. Volvé a entrar.",
    };
    toast.error(
      errorMessages[callbackError] ??
        `Error en HubSpot: ${callbackError}`
    );
  }, [callbackError]);

  return (
    <div className="w-full max-w-xl">
      <StepperHeader currentStep={step} />

      <div className="mt-8 rounded-xl border border-border-default bg-bg-surface p-8">
        {step === 1 && (
          <WelcomeStep
            initialOrgName={initialOrgName}
            onContinue={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <ConnectStep
            isConnected={hubspotConnected}
            portalName={hubspotPortalName}
            onContinue={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <SelectStep
            onContinue={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        )}
        {step === 4 && (
          <SyncStep
            onSkip={async () => {
              const result = await markOnboardingComplete();
              if (!result.success) {
                toast.error(result.error);
                return;
              }
              router.push("/contacts");
              router.refresh();
            }}
          />
        )}
      </div>
    </div>
  );
}

function StepperHeader({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-between">
      {STEPS.map((step, idx) => {
        const isActive = step.id === currentStep;
        const isDone = step.id < currentStep;
        return (
          <div key={step.id} className="flex flex-1 items-center">
            <div className="flex items-center gap-3">
              <div
                className={[
                  "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-medium transition-colors",
                  isDone
                    ? "border-brand bg-brand text-white"
                    : isActive
                      ? "border-brand bg-brand-subtle text-brand"
                      : "border-border-default bg-bg-elevated text-text-muted",
                ].join(" ")}
              >
                {isDone ? <CheckCircle2 size={14} /> : step.id}
              </div>
              <span
                className={[
                  "text-xs font-medium",
                  isActive || isDone
                    ? "text-text-primary"
                    : "text-text-muted",
                ].join(" ")}
              >
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className="mx-3 h-px flex-1 bg-border-default" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function WelcomeStep({
  initialOrgName,
  onContinue,
}: {
  initialOrgName: string;
  onContinue: () => void;
}) {
  const [orgName, setOrgName] = useState(initialOrgName);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    if (!name) {
      toast.error("Ingresá un nombre para la organización");
      return;
    }

    startTransition(async () => {
      const result = await updateOrganizationName({ name });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setOrgName(result.data.name);
      onContinue();
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-6">
      <header className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-subtle text-brand">
          <Sparkles size={20} />
        </div>
        <div className="flex flex-col gap-1.5">
          <h2 className="font-heading text-xl font-semibold text-text-primary">
            Bienvenido a ContactShip
          </h2>
          <p className="text-sm text-text-secondary">
            Antes de empezar, confirmá el nombre de tu organización.
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="orgName" className="text-sm font-medium text-text-secondary">
          Nombre de la organización
        </Label>
        <Input
          id="orgName"
          name="name"
          defaultValue={orgName}
          required
          maxLength={120}
          disabled={isPending}
          className="h-10"
        />
        <p className="mt-1 text-xs text-text-muted">
          Lo podés cambiar después desde Settings.
        </p>
      </div>

      <Button type="submit" disabled={isPending} className="self-end">
        {isPending ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            <span>Guardando...</span>
          </>
        ) : (
          <>
            <span>Continuar</span>
            <ArrowRight size={14} />
          </>
        )}
      </Button>
    </form>
  );
}

function ConnectStep({
  isConnected,
  portalName,
  onContinue,
}: {
  isConnected: boolean;
  portalName: string | null;
  onContinue: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col items-center gap-3 text-center">
        <div
          className={[
            "flex h-11 w-11 items-center justify-center rounded-xl",
            isConnected
              ? "bg-success-subtle text-success"
              : "bg-brand-subtle text-brand",
          ].join(" ")}
        >
          {isConnected ? <PlugZap size={20} /> : <Plug size={20} />}
        </div>
        <div className="flex flex-col gap-1.5">
          <h2 className="font-heading text-xl font-semibold text-text-primary">
            {isConnected ? "HubSpot conectado" : "Conectá tu cuenta de HubSpot"}
          </h2>
          <p className="text-sm text-text-secondary">
            {isConnected
              ? `Portal: ${portalName ?? "conectado"}. Listos para importar tus contactos.`
              : "Vas a ser redirigido a HubSpot para autorizar el acceso."}
          </p>
        </div>
      </header>

      {!isConnected && (
        <a
          href="/api/hubspot/connect"
          className="flex h-10 items-center justify-center gap-2 self-stretch rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-brand-hover"
        >
          <Plug size={16} />
          <span>Conectar HubSpot</span>
        </a>
      )}

      {isConnected && (
        <Button onClick={onContinue} className="self-end">
          <span>Continuar</span>
          <ArrowRight size={14} />
        </Button>
      )}
    </div>
  );
}

type Selection =
  | { mode: "all" }
  | { mode: "lifecycle"; lifecycleStage: string };

function SelectStep({
  onContinue,
  onBack,
}: {
  onContinue: () => void;
  onBack: () => void;
}) {
  const [selection, setSelection] = useState<Selection>({ mode: "all" });
  const [count, setCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function loadPreview(next: Selection) {
    setIsLoading(true);
    setCount(null);
    const result = await previewContactCount(
      next.mode === "lifecycle"
        ? { lifecycleStage: next.lifecycleStage }
        : {}
    );
    setIsLoading(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setCount(result.data.total);
  }

  useEffect(() => {
    // Auto-load the "all" count on first paint so the user sees a number
    // immediately and isn't staring at a blank state.
    void loadPreview({ mode: "all" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-subtle text-brand">
          <Users size={20} />
        </div>
        <div className="flex flex-col gap-1.5">
          <h2 className="font-heading text-xl font-semibold text-text-primary">
            ¿Qué contactos querés importar?
          </h2>
          <p className="text-sm text-text-secondary">
            Podés importar todo o filtrar por etapa del ciclo de vida.
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-3">
        <SelectionOption
          label="Todos los contactos"
          description="Importa toda la base sin filtros."
          checked={selection.mode === "all"}
          onSelect={() => {
            const next: Selection = { mode: "all" };
            setSelection(next);
            void loadPreview(next);
          }}
        />
        <SelectionOption
          label="Solo una etapa del ciclo"
          description="Por ejemplo: lead, opportunity, customer."
          checked={selection.mode === "lifecycle"}
          onSelect={() => {
            const next: Selection = {
              mode: "lifecycle",
              lifecycleStage: "lead",
            };
            setSelection(next);
            void loadPreview(next);
          }}
        />

        {selection.mode === "lifecycle" && (
          <div className="ml-7 flex flex-col gap-1.5">
            <Label
              htmlFor="lifecycleStage"
              className="text-sm font-medium text-text-secondary"
            >
              Lifecycle stage
            </Label>
            <Input
              id="lifecycleStage"
              value={selection.lifecycleStage}
              onChange={(e) => {
                const next: Selection = {
                  mode: "lifecycle",
                  lifecycleStage: e.target.value,
                };
                setSelection(next);
              }}
              onBlur={() => loadPreview(selection)}
              placeholder="lead"
              className="h-9"
            />
            <p className="text-xs text-text-muted">
              Valores comunes: subscriber, lead, marketingqualifiedlead,
              salesqualifiedlead, opportunity, customer.
            </p>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border-default bg-bg-elevated px-4 py-3 text-sm">
        {isLoading ? (
          <span className="flex items-center gap-2 text-text-secondary">
            <Loader2 size={14} className="animate-spin" />
            Consultando HubSpot...
          </span>
        ) : count === null ? (
          <span className="text-text-muted">Esperando preview...</span>
        ) : (
          <span className="text-text-primary">
            Vas a importar{" "}
            <span className="font-mono font-semibold">{count}</span>{" "}
            contacto{count === 1 ? "" : "s"}.
          </span>
        )}
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          Volver
        </Button>
        <Button
          onClick={onContinue}
          disabled={count === null || count === 0}
        >
          <span>Importar</span>
          <ArrowRight size={14} />
        </Button>
      </div>
    </div>
  );
}

function SelectionOption({
  label,
  description,
  checked,
  onSelect,
}: {
  label: string;
  description: string;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "flex items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
        checked
          ? "border-brand bg-brand-subtle"
          : "border-border-default bg-bg-elevated hover:border-border-strong",
      ].join(" ")}
    >
      <span
        className={[
          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          checked
            ? "border-brand bg-brand"
            : "border-border-strong bg-transparent",
        ].join(" ")}
      >
        {checked && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-text-primary">{label}</span>
        <span className="text-xs text-text-secondary">{description}</span>
      </span>
    </button>
  );
}

function SyncStep({ onSkip }: { onSkip: () => void | Promise<void> }) {
  const [isFinishing, setIsFinishing] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-warning-subtle text-warning">
          <Loader2 size={20} className="animate-spin" />
        </div>
        <div className="flex flex-col gap-1.5">
          <h2 className="font-heading text-xl font-semibold text-text-primary">
            Sincronizando tus contactos
          </h2>
          <p className="text-sm text-text-secondary">
            El sync engine de la app se conecta acá. Por ahora, podés saltar
            directo a ver el workspace; el siguiente bloque de implementación
            cablea el import real con barra de progreso en tiempo real.
          </p>
        </div>
      </header>

      <Button
        onClick={async () => {
          setIsFinishing(true);
          await onSkip();
        }}
        disabled={isFinishing}
      >
        {isFinishing ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            <span>Finalizando...</span>
          </>
        ) : (
          <>
            <span>Ir al workspace</span>
            <ArrowRight size={14} />
          </>
        )}
      </Button>
    </div>
  );
}

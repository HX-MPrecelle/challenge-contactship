"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Plug,
  PlugZap,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/lib/supabase/client";
import {
  importContacts,
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

export type Selection =
  | { mode: "all" }
  | { mode: "lifecycle"; lifecycleStage: string };

type Props = {
  initialStep: number;
  initialOrgName: string;
  hubspotConnected: boolean;
  hubspotPortalName: string | null;
  orgId: string;
  callbackError?: string;
};

export function OnboardingStepper({
  initialStep,
  initialOrgName,
  hubspotConnected,
  hubspotPortalName,
  orgId,
  callbackError,
}: Props) {
  const [step, setStep] = useState(initialStep);
  const [selection, setSelection] = useState<Selection>({ mode: "all" });

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
      errorMessages[callbackError] ?? `Error en HubSpot: ${callbackError}`
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
            selection={selection}
            onSelectionChange={setSelection}
            onContinue={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        )}
        {step === 4 && <SyncStep orgId={orgId} selection={selection} />}
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

function SelectStep({
  selection,
  onSelectionChange,
  onContinue,
  onBack,
}: {
  selection: Selection;
  onSelectionChange: (s: Selection) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
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
            onSelectionChange(next);
            void loadPreview(next);
          }}
        />
        <SelectionOption
          label="Solo una etapa del ciclo"
          description="Por ejemplo: lead, opportunity, customer."
          checked={selection.mode === "lifecycle"}
          onSelect={() => {
            const next: Selection = { mode: "lifecycle", lifecycleStage: "lead" };
            onSelectionChange(next);
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
              onChange={(e) =>
                onSelectionChange({
                  mode: "lifecycle",
                  lifecycleStage: e.target.value,
                })
              }
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
        <Button onClick={onContinue} disabled={count === null || count === 0}>
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

function SyncStep({ orgId, selection }: { orgId: string; selection: Selection }) {
  const router = useRouter();
  const [progress, setProgress] = useState({ processed: 0, total: 0 });
  const [phase, setPhase] = useState<"connecting" | "syncing" | "done" | "error">(
    "connecting"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;
    const supabase = createClient();
    const channel = supabase.channel(`sync:${orgId}`);

    channel
      .on("broadcast", { event: "progress" }, ({ payload }) => {
        if (cancelled) return;
        const p = payload as {
          processed: number;
          total: number;
          status: "syncing" | "done" | "error";
        };
        setProgress({ processed: p.processed, total: p.total });
        if (p.status === "syncing") setPhase("syncing");
      })
      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED" || cancelled) return;
        setPhase("syncing");

        const filter =
          selection.mode === "lifecycle"
            ? { lifecycleStage: selection.lifecycleStage }
            : {};
        const result = await importContacts(filter);
        if (cancelled) return;

        if (!result.success) {
          setErrorMessage(result.error);
          setPhase("error");
          toast.error(result.error);
          return;
        }

        const completeResult = await markOnboardingComplete();
        if (cancelled) return;

        if (!completeResult.success) {
          setErrorMessage(completeResult.error);
          setPhase("error");
          toast.error(completeResult.error);
          return;
        }

        setPhase("done");
        if (result.data.conflicts > 0) {
          toast.warning(
            `${result.data.conflicts} contacto(s) con conflicto detectado. Resolvelos desde Settings.`
          );
        } else {
          toast.success(
            `Importamos ${result.data.imported} contacto${result.data.imported === 1 ? "" : "s"}.`
          );
        }
        setTimeout(() => {
          if (cancelled) return;
          router.push("/contacts");
          router.refresh();
        }, 1200);
      });

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [orgId, selection, router]);

  const pct =
    progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col items-center gap-3 text-center">
        <div
          className={[
            "flex h-11 w-11 items-center justify-center rounded-xl",
            phase === "done"
              ? "bg-success-subtle text-success"
              : phase === "error"
                ? "bg-error-subtle text-error"
                : "bg-brand-subtle text-brand",
          ].join(" ")}
        >
          {phase === "done" ? (
            <CheckCircle2 size={20} />
          ) : phase === "error" ? (
            <XCircle size={20} />
          ) : (
            <Loader2 size={20} className="animate-spin" />
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <h2 className="font-heading text-xl font-semibold text-text-primary">
            {phase === "done"
              ? "Sincronización completa"
              : phase === "error"
                ? "Hubo un error"
                : "Sincronizando tus contactos"}
          </h2>
          <p className="text-sm text-text-secondary">
            {phase === "done"
              ? "Te llevamos al workspace en un segundo..."
              : phase === "error"
                ? errorMessage ?? "Intentá refrescar la página."
                : "Esto puede tardar unos segundos. No cierres la ventana."}
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-2">
        <Progress value={pct} className="h-2" />
        <div className="flex items-center justify-between text-xs">
          <span className="font-mono text-text-secondary">
            {progress.processed} / {progress.total || "?"}
          </span>
          <span className="font-mono text-text-secondary">{pct}%</span>
        </div>
      </div>

      {phase === "error" && (
        <Button
          onClick={() => {
            startedRef.current = false;
            setPhase("connecting");
            setErrorMessage(null);
            setProgress({ processed: 0, total: 0 });
          }}
          className="self-end"
        >
          Reintentar
        </Button>
      )}
    </div>
  );
}

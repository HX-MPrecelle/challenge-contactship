"use client";

import { useState, useTransition } from "react";
import { ArrowRight, CheckCircle2, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendMagicLink } from "./actions";

type FormStatus =
  | { state: "idle" }
  | { state: "submitting" }
  | { state: "sent"; email: string }
  | { state: "error"; message: string };

export function LoginForm() {
  const [status, setStatus] = useState<FormStatus>({ state: "idle" });
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    const email = String(formData.get("email") ?? "");
    setStatus({ state: "submitting" });

    startTransition(async () => {
      const result = await sendMagicLink(formData);
      if (!result.success) {
        setStatus({ state: "error", message: result.error });
        return;
      }
      setStatus({ state: "sent", email });
    });
  }

  if (status.state === "sent") {
    return (
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success-subtle text-success">
          <CheckCircle2 size={22} />
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="font-heading text-lg font-semibold text-text-primary">
            Revisá tu email
          </h2>
          <p className="text-sm text-text-secondary">
            Te enviamos un link a{" "}
            <span className="font-mono text-text-primary">{status.email}</span>.
            Hacé click para entrar.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setStatus({ state: "idle" })}
          className="text-xs text-text-secondary underline-offset-4 hover:text-text-primary hover:underline"
        >
          Usar otro email
        </button>
      </div>
    );
  }

  const submitting = isPending || status.state === "submitting";

  return (
    <form action={handleSubmit} className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email" className="text-sm font-medium text-text-secondary">
          Email
        </Label>
        <div className="relative">
          <Mail
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="vos@empresa.com"
            disabled={submitting}
            className="h-10 pl-9"
          />
        </div>
        {status.state === "error" && (
          <p className="mt-1 text-xs text-error">{status.message}</p>
        )}
      </div>

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            <span>Enviando...</span>
          </>
        ) : (
          <>
            <span>Enviar magic link</span>
            <ArrowRight size={14} />
          </>
        )}
      </Button>

      <p className="text-xs text-text-muted">
        Te enviaremos un link único. Sin contraseñas.
      </p>
    </form>
  );
}

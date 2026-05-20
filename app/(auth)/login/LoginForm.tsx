"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRight, KeyRound, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, signUp } from "./actions";

type Mode = "signin" | "signup";

type FieldErrors = {
  email?: string;
  password?: string;
  form?: string;
};

const COPY: Record<Mode, {
  submit: string;
  submitting: string;
  toggleQuestion: string;
  toggleAction: string;
  helper: string;
}> = {
  signin: {
    submit: "Iniciar sesión",
    submitting: "Iniciando sesión...",
    toggleQuestion: "¿No tenés cuenta?",
    toggleAction: "Crear una",
    helper: "Usá el email y contraseña con los que te registraste.",
  },
  signup: {
    submit: "Crear cuenta",
    submitting: "Creando cuenta...",
    toggleQuestion: "¿Ya tenés cuenta?",
    toggleAction: "Iniciar sesión",
    helper: "La contraseña debe tener al menos 8 caracteres.",
  },
};

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isPending, startTransition] = useTransition();

  const copy = COPY[mode];

  function handleSubmit(formData: FormData) {
    setErrors({});

    startTransition(async () => {
      const action = mode === "signin" ? signIn : signUp;
      const result = await action(formData);

      if (!result.success) {
        if (result.field) {
          setErrors({ [result.field]: result.error });
        } else {
          setErrors({ form: result.error });
        }
        return;
      }

      router.push(result.redirectTo);
      router.refresh();
    });
  }

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
            disabled={isPending}
            aria-invalid={errors.email ? "true" : undefined}
            className="h-10 pl-9"
          />
        </div>
        {errors.email && (
          <p className="mt-1 text-xs text-error">{errors.email}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password" className="text-sm font-medium text-text-secondary">
          Contraseña
        </Label>
        <div className="relative">
          <KeyRound
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            required
            minLength={8}
            maxLength={72}
            placeholder={mode === "signin" ? "Tu contraseña" : "Al menos 8 caracteres"}
            disabled={isPending}
            aria-invalid={errors.password ? "true" : undefined}
            className="h-10 pl-9"
          />
        </div>
        {errors.password && (
          <p className="mt-1 text-xs text-error">{errors.password}</p>
        )}
      </div>

      {errors.form && (
        <div className="rounded-lg border border-error/40 bg-error-subtle px-3 py-2 text-xs text-error">
          {errors.form}
        </div>
      )}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            <span>{copy.submitting}</span>
          </>
        ) : (
          <>
            <span>{copy.submit}</span>
            <ArrowRight size={14} />
          </>
        )}
      </Button>

      <p className="text-center text-xs text-text-muted">
        {copy.helper}
      </p>

      <div className="flex items-center justify-center gap-1.5 pt-2 text-xs">
        <span className="text-text-secondary">{copy.toggleQuestion}</span>
        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setErrors({});
          }}
          disabled={isPending}
          className="font-medium text-brand underline-offset-4 hover:underline disabled:opacity-50"
        >
          {copy.toggleAction}
        </button>
      </div>
    </form>
  );
}

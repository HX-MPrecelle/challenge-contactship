"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useI18n } from "@/lib/i18n/context";
import {
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, signUp } from "./actions";

type Mode = "signin" | "signup";

type FieldErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
  form?: string;
};

export function LoginForm() {
  const router = useRouter();
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>("signin");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isPending, startTransition] = useTransition();

  const COPY: Record<Mode, {
    submit: string; submitting: string; toggleQuestion: string;
    toggleAction: string; helper: string;
  }> = {
    signin: {
      submit: t("login.submit.signin"),
      submitting: t("login.submit.signin.pending"),
      toggleQuestion: t("login.toggle.toSignup.question"),
      toggleAction: t("login.toggle.toSignup.action"),
      helper: t("login.helper.signin"),
    },
    signup: {
      submit: t("login.submit.signup"),
      submitting: t("login.submit.signup.pending"),
      toggleQuestion: t("login.toggle.toSignin.question"),
      toggleAction: t("login.toggle.toSignin.action"),
      helper: t("login.helper.signup"),
    },
  };
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const copy = COPY[mode];

  function handleSubmit(formData: FormData) {
    setErrors({});

    // Confirm-password is a client-only check; the Server Action just sees
    // `password`. We surface the mismatch as a field-level error on the
    // confirm input without firing a transition.
    if (mode === "signup") {
      const password = String(formData.get("password") ?? "");
      const confirm = String(formData.get("confirmPassword") ?? "");
      if (password !== confirm) {
        setErrors({ confirmPassword: t("login.error.passwordMismatch") });
        return;
      }
    }

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
          {t("login.email.label")}
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
            placeholder={t("login.email.placeholder")}
            disabled={isPending}
            aria-invalid={errors.email ? "true" : undefined}
            className="h-10 pl-9"
          />
        </div>
        {errors.email && (
          <p className="mt-1 text-xs text-error">{errors.email}</p>
        )}
      </div>

      <PasswordField
        id="password"
        name="password"
        label={t("login.password.label")}
        autoComplete={mode === "signin" ? "current-password" : "new-password"}
        placeholder={mode === "signin" ? t("login.password.placeholder.signin") : t("login.password.placeholder.signup")}
        disabled={isPending}
        revealed={showPassword}
        onToggleReveal={() => setShowPassword((v) => !v)}
        error={errors.password}
      />

      {mode === "signup" && (
        <PasswordField
          id="confirmPassword"
          name="confirmPassword"
          label={t("login.confirmPassword.label")}
          autoComplete="new-password"
          placeholder={t("login.confirmPassword.placeholder")}
          disabled={isPending}
          revealed={showConfirmPassword}
          onToggleReveal={() => setShowConfirmPassword((v) => !v)}
          error={errors.confirmPassword}
        />
      )}

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
            setShowPassword(false);
            setShowConfirmPassword(false);
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

function PasswordField({
  id,
  name,
  label,
  autoComplete,
  placeholder,
  disabled,
  revealed,
  onToggleReveal,
  error,
}: {
  id: string;
  name: string;
  label: string;
  autoComplete: string;
  placeholder: string;
  disabled?: boolean;
  revealed: boolean;
  onToggleReveal: () => void;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-sm font-medium text-text-secondary">
        {label}
      </Label>
      <div className="relative">
        <KeyRound
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
        />
        <Input
          id={id}
          name={name}
          type={revealed ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={8}
          maxLength={72}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={error ? "true" : undefined}
          className="h-10 pl-9 pr-10"
        />
        <button
          type="button"
          onClick={onToggleReveal}
          disabled={disabled}
          aria-label={revealed ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={revealed}
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-primary disabled:opacity-50"
        >
          {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
    </div>
  );
}

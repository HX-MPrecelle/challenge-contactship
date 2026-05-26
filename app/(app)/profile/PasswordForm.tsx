"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePassword } from "@/actions/profile";
import { useI18n } from "@/lib/i18n/context";

export function PasswordForm() {
  const { t } = useI18n();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError(t("profile.password.mismatch"));
      return;
    }

    startTransition(async () => {
      const result = await changePassword(newPassword);
      if (!result.success) {
        setError(result.error);
        return;
      }
      toast.success(t("profile.password.changed"));
      setNewPassword("");
      setConfirmPassword("");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-sm">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="newPassword" className="text-sm font-medium text-text-secondary">
          {t("profile.password.new")}
        </Label>
        <div className="relative">
          <KeyRound
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <Input
            id="newPassword"
            type={showNew ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={72}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder={t("profile.password.placeholder")}
            disabled={isPending}
            className="h-10 pl-9 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowNew((v) => !v)}
            disabled={isPending}
            aria-label={showNew ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={showNew}
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-primary disabled:opacity-50"
          >
            {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirmPassword" className="text-sm font-medium text-text-secondary">
          {t("profile.password.confirm")}
        </Label>
        <div className="relative">
          <KeyRound
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <Input
            id="confirmPassword"
            type={showConfirm ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={72}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder={t("profile.password.placeholder")}
            disabled={isPending}
            className="h-10 pl-9 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            disabled={isPending}
            aria-label={showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={showConfirm}
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-primary disabled:opacity-50"
          >
            {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-error">{error}</p>}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            <span>{t("profile.password.submitting")}</span>
          </>
        ) : (
          <span>{t("profile.password.submit")}</span>
        )}
      </Button>
    </form>
  );
}

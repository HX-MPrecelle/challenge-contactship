"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateContact, checkConflictBeforeSave, type PreflightResult } from "@/actions/contacts";
import { SaveConflictModal } from "@/components/contacts/SaveConflictModal";
import { useI18n } from "@/lib/i18n/context";

type Props = {
  contactId: string;
  initial: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    company: string | null;
    jobTitle: string | null;
    message: string | null;
  };
  onDirtyChange?: (dirty: boolean) => void;
};

export function ContactForm({ contactId, initial, onDirtyChange }: Props) {
  const { t } = useI18n();
  const [isPending, setIsPending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [preflightResult, setPreflightResult] = useState<PreflightResult | null>(null);
  const [pendingValues, setPendingValues] = useState<Record<string, string | null> | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const onDirtyRef = useRef(onDirtyChange);
  useEffect(() => { onDirtyRef.current = onDirtyChange; }, [onDirtyChange]);

  const isDirty = Object.values(dirty).some(Boolean);
  useEffect(() => { onDirtyRef.current?.(isDirty); }, [isDirty]);

  function trackDirty(field: string, value: string, defaultValue: string) {
    setDirty(prev => ({ ...prev, [field]: value !== defaultValue }));
  }

  function collectValues(form: HTMLFormElement): Record<string, string | null> {
    const fd = new FormData(form);
    const nullable = (v: FormDataEntryValue | null) => {
      const s = String(v ?? "").trim();
      return s === "" ? null : s;
    };
    return {
      first_name: nullable(fd.get("firstName")),
      last_name:  nullable(fd.get("lastName")),
      email:      nullable(fd.get("email")),
      phone:      nullable(fd.get("phone")),
      company:    nullable(fd.get("company")),
      job_title:  nullable(fd.get("jobTitle")),
      message:    nullable(fd.get("message")),
    };
  }

  async function doSave(values: Record<string, string | null>) {
    setIsPending(true);
    setErrors({});
    const result = await updateContact({
      id: contactId,
      firstName: values.first_name,
      lastName:  values.last_name,
      email:     values.email,
      phone:     values.phone,
      company:   values.company,
      jobTitle:  values.job_title,
      message:   values.message,
    });
    setIsPending(false);
    if (!result.success) {
      if (result.code === "VALIDATION_ERROR") setErrors({ form: result.error });
      toast.error(result.error);
      return;
    }
    setDirty({});
    toast.success(t("contact.form.saved"));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending || isChecking) return;

    const values = collectValues(e.currentTarget);
    setIsChecking(true);

    const preflight = await checkConflictBeforeSave({ contactId, userValues: values });
    setIsChecking(false);

    if (!preflight.success) {
      // If pre-flight fails (e.g. HubSpot unreachable), save anyway
      await doSave(values);
      return;
    }

    if (preflight.data.hasChanges) {
      setPendingValues(values);
      setPreflightResult(preflight.data);
    } else {
      await doSave(values);
    }
  }

  async function handleModalConfirm(resolved: Record<string, string | null>) {
    setPreflightResult(null);
    const base = pendingValues ?? {};
    // Merge: resolved fields override pending values
    await doSave({ ...base, ...resolved });
    setPendingValues(null);
  }

  const busy = isPending || isChecking;

  return (
    <>
      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Field name="firstName" label={t("contact.form.firstName")} defaultValue={initial.firstName ?? ""} disabled={busy} onChange={v => trackDirty("firstName", v, initial.firstName ?? "")} />
          <Field name="lastName"  label={t("contact.form.lastName")}  defaultValue={initial.lastName ?? ""}  disabled={busy} onChange={v => trackDirty("lastName",  v, initial.lastName  ?? "")} />
          <Field name="email"     label={t("contact.form.email")}     type="email" defaultValue={initial.email ?? ""}     disabled={busy} onChange={v => trackDirty("email",     v, initial.email     ?? "")} />
          <Field name="phone"     label={t("contact.form.phone")}     type="tel"   defaultValue={initial.phone ?? ""}     disabled={busy} onChange={v => trackDirty("phone",     v, initial.phone     ?? "")} />
          <Field name="company"   label={t("contact.form.company")}   defaultValue={initial.company ?? ""}   disabled={busy} onChange={v => trackDirty("company",   v, initial.company   ?? "")} />
          <Field name="jobTitle"  label={t("contact.form.jobTitle")}  defaultValue={initial.jobTitle ?? ""}  disabled={busy} onChange={v => trackDirty("jobTitle",  v, initial.jobTitle  ?? "")} />
        </div>

        {/* CRM Notes field */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="message" className="text-xs font-medium text-text-secondary">
            Notas del CRM
          </Label>
          <textarea
            id="message"
            name="message"
            rows={4}
            defaultValue={initial.message ?? ""}
            disabled={busy}
            onChange={e => trackDirty("message", e.target.value, initial.message ?? "")}
            placeholder="Notas de ventas, contexto del deal, información relevante…"
            className="w-full resize-none rounded-lg border border-border-default bg-bg-subtle px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-60"
          />
        </div>

        {errors.form && <p className="text-xs text-error">{errors.form}</p>}

        <div className="flex justify-end">
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            <span>{isChecking ? "Verificando…" : isPending ? t("contact.form.saving") : t("common.save")}</span>
          </Button>
        </div>
      </form>

      {preflightResult && (
        <SaveConflictModal
          open
          result={preflightResult}
          onConfirm={handleModalConfirm}
          onCancel={() => { setPreflightResult(null); setPendingValues(null); }}
        />
      )}
    </>
  );
}

function Field({
  name, label, defaultValue, type = "text", disabled, onChange,
}: {
  name: string; label: string; defaultValue: string;
  type?: string; disabled?: boolean; onChange?: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name} className="text-xs font-medium text-text-secondary">{label}</Label>
      <Input
        id={name} name={name} type={type} defaultValue={defaultValue}
        disabled={disabled} className="h-9"
        onChange={e => onChange?.(e.target.value)}
      />
    </div>
  );
}

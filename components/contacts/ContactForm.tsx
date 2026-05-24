"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateContact } from "@/actions/contacts";
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
  };
  onDirtyChange?: (dirty: boolean) => void;
};

export function ContactForm({ contactId, initial, onDirtyChange }: Props) {
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const onDirtyRef = useRef(onDirtyChange);
  useEffect(() => { onDirtyRef.current = onDirtyChange; }, [onDirtyChange]);

  const isDirty = Object.values(dirty).some(Boolean);
  useEffect(() => { onDirtyRef.current?.(isDirty); }, [isDirty]);

  function trackDirty(field: string, value: string, defaultValue: string) {
    setDirty((prev) => ({ ...prev, [field]: value !== defaultValue }));
  }

  function handleSubmit(formData: FormData) {
    setErrors({});

    const payload = {
      id: contactId,
      firstName: nullable(formData.get("firstName")),
      lastName: nullable(formData.get("lastName")),
      email: nullable(formData.get("email")),
      phone: nullable(formData.get("phone")),
      company: nullable(formData.get("company")),
      jobTitle: nullable(formData.get("jobTitle")),
    };

    startTransition(async () => {
      const result = await updateContact(payload);
      if (!result.success) {
        if (result.code === "VALIDATION_ERROR") {
          setErrors({ form: result.error });
        }
        toast.error(result.error);
        return;
      }
      setDirty({});
      toast.success(t("contact.form.saved"));
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Field name="firstName" label={t("contact.form.firstName")} defaultValue={initial.firstName ?? ""} disabled={isPending} onChange={(v) => trackDirty("firstName", v, initial.firstName ?? "")} />
        <Field name="lastName"  label={t("contact.form.lastName")}  defaultValue={initial.lastName ?? ""}  disabled={isPending} onChange={(v) => trackDirty("lastName",  v, initial.lastName  ?? "")} />
        <Field name="email"     label={t("contact.form.email")}     type="email" defaultValue={initial.email ?? ""}     disabled={isPending} onChange={(v) => trackDirty("email",     v, initial.email     ?? "")} />
        <Field name="phone"     label={t("contact.form.phone")}     type="tel"   defaultValue={initial.phone ?? ""}     disabled={isPending} onChange={(v) => trackDirty("phone",     v, initial.phone     ?? "")} />
        <Field name="company"   label={t("contact.form.company")}   defaultValue={initial.company ?? ""}   disabled={isPending} onChange={(v) => trackDirty("company",   v, initial.company   ?? "")} />
        <Field name="jobTitle"  label={t("contact.form.jobTitle")}  defaultValue={initial.jobTitle ?? ""}  disabled={isPending} onChange={(v) => trackDirty("jobTitle",  v, initial.jobTitle  ?? "")} />
      </div>

      {errors.form && (
        <p className="text-xs text-error">{errors.form}</p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span>{t("contact.form.saving")}</span>
            </>
          ) : (
            <>
              <Save size={14} />
              <span>{t("common.save")}</span>
            </>
          )}
        </Button>
      </div>
    </form>
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
        onChange={(e) => onChange?.(e.target.value)}
      />
    </div>
  );
}

function nullable(value: FormDataEntryValue | null): string | null {
  if (value === null) return null;
  const str = String(value).trim();
  return str === "" ? null : str;
}

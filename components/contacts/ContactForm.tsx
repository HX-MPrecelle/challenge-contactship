"use client";

import { useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateContact } from "@/actions/contacts";

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
};

export function ContactForm({ contactId, initial }: Props) {
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

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
      toast.success("Contacto actualizado y sincronizado con HubSpot");
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Field
          name="firstName"
          label="Nombre"
          defaultValue={initial.firstName ?? ""}
          disabled={isPending}
        />
        <Field
          name="lastName"
          label="Apellido"
          defaultValue={initial.lastName ?? ""}
          disabled={isPending}
        />
        <Field
          name="email"
          label="Email"
          type="email"
          defaultValue={initial.email ?? ""}
          disabled={isPending}
        />
        <Field
          name="phone"
          label="Teléfono"
          type="tel"
          defaultValue={initial.phone ?? ""}
          disabled={isPending}
        />
        <Field
          name="company"
          label="Empresa"
          defaultValue={initial.company ?? ""}
          disabled={isPending}
        />
        <Field
          name="jobTitle"
          label="Cargo"
          defaultValue={initial.jobTitle ?? ""}
          disabled={isPending}
        />
      </div>

      {errors.form && (
        <p className="text-xs text-error">{errors.form}</p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span>Guardando en HubSpot...</span>
            </>
          ) : (
            <>
              <Save size={14} />
              <span>Guardar cambios</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  defaultValue,
  type = "text",
  disabled,
}: {
  name: string;
  label: string;
  defaultValue: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name} className="text-xs font-medium text-text-secondary">
        {label}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        disabled={disabled}
        className="h-9"
      />
    </div>
  );
}

function nullable(value: FormDataEntryValue | null): string | null {
  if (value === null) return null;
  const str = String(value).trim();
  return str === "" ? null : str;
}

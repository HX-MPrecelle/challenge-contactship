"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

export function BackButton({
  fallback = "/dashboard",
  label,
}: {
  fallback?: string;
  label?: string;
}) {
  const router = useRouter();
  const { t } = useI18n();

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallback);
    }
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className="mb-6 inline-flex items-center gap-1.5 text-xs text-text-secondary transition-colors hover:text-text-primary"
    >
      <ArrowLeft size={12} />
      {label ?? t("common.back")}
    </button>
  );
}

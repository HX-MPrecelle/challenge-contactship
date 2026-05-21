"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/**
 * History-aware back button. Goes back in browser history if available,
 * otherwise navigates to the fallback URL (default: /dashboard).
 */
export function BackButton({
  fallback = "/dashboard",
  label,
}: {
  fallback?: string;
  label?: string;
}) {
  const router = useRouter();

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
      {label ?? "Volver"}
    </button>
  );
}

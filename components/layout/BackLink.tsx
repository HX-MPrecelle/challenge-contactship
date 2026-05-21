import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function BackLink({
  href = "/dashboard",
  label = "Dashboard",
}: {
  href?: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      className="mb-6 inline-flex items-center gap-1.5 text-xs text-text-secondary transition-colors hover:text-text-primary"
    >
      <ArrowLeft size={12} />
      {label}
    </Link>
  );
}

const PALETTE: Record<string, { bg: string; text: string; dotClass: string }> = {
  synced: {
    bg: "bg-success-subtle",
    text: "text-success",
    dotClass: "bg-success",
  },
  pending: {
    bg: "bg-warning-subtle",
    text: "text-warning",
    dotClass: "bg-warning",
  },
  conflict: {
    bg: "bg-error-subtle",
    text: "text-error",
    dotClass: "bg-error animate-pulse-dot",
  },
  error: {
    bg: "bg-error-subtle",
    text: "text-error",
    dotClass: "bg-error",
  },
};

export function SyncStatusBadge({ status }: { status: string }) {
  const p = PALETTE[status] ?? {
    bg: "bg-bg-subtle",
    text: "text-text-muted",
    dotClass: "bg-text-muted",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${p.bg} ${p.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${p.dotClass}`} />
      {status}
    </span>
  );
}

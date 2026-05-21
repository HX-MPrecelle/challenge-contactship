import { Avatar } from "@/components/ui/avatar";

type ConflictContact = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  company: string | null;
  local_updated_at: string;
};

export function ConflictListItem({
  contact,
  active,
  onClick,
}: {
  contact: ConflictContact;
  active: boolean;
  onClick: () => void;
}) {
  const fullName =
    [contact.first_name, contact.last_name].filter(Boolean).join(" ") || "Sin nombre";

  const relativeTime = formatRelative(contact.local_updated_at);

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex w-full items-start gap-3 border-b border-border-default px-4 py-3.5 text-left transition-colors",
        active
          ? "border-l-2 border-l-brand bg-bg-subtle"
          : "hover:bg-bg-subtle",
      ].join(" ")}
    >
      <Avatar size={32} name={fullName} className="mt-0.5 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium text-text-primary">
            {fullName}
          </span>
          <span className="shrink-0 font-mono text-[10px] text-text-muted">
            {relativeTime}
          </span>
        </div>
        {contact.email && (
          <span className="truncate font-mono text-xs text-text-muted">
            {contact.email}
          </span>
        )}
        {contact.company && (
          <span className="truncate text-xs text-text-secondary">
            {contact.company}
          </span>
        )}
        <span className="mt-1 inline-flex self-start rounded-md bg-error-subtle px-1.5 py-0.5 font-mono text-[10px] font-medium text-error">
          conflicto
        </span>
      </div>
    </button>
  );
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString("es-AR", { dateStyle: "short" });
}

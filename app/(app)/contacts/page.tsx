import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const orgId = user.user_metadata?.org_id as string | undefined;
  if (!orgId) redirect("/login?error=no-org");

  if (!user.user_metadata?.onboarding_complete) {
    redirect("/onboarding");
  }

  const { data: contacts, error } = await supabase
    .from("contacts")
    .select(
      "id, hubspot_id, first_name, last_name, email, company, job_title, lifecycle_stage, sync_status, local_updated_at"
    )
    .eq("org_id", orgId)
    .eq("is_archived", false)
    .order("local_updated_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[contacts page]", error);
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="flex items-center gap-3 pb-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-subtle text-brand">
          <Sparkles size={18} />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-semibold text-text-primary">
            Contactos
          </h1>
          <p className="text-sm text-text-secondary">
            Vista placeholder — la lista pulida llega en el siguiente bloque
            (ContactList + ContactDetail + Realtime).
          </p>
        </div>
      </header>

      <div className="overflow-hidden rounded-xl border border-border-default bg-bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-bg-elevated">
            <tr className="text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
              <th className="px-4 py-2.5">Nombre</th>
              <th className="px-4 py-2.5">Email</th>
              <th className="px-4 py-2.5">Empresa</th>
              <th className="px-4 py-2.5">Cargo</th>
              <th className="px-4 py-2.5">Etapa</th>
              <th className="px-4 py-2.5">Sync</th>
            </tr>
          </thead>
          <tbody className="text-text-primary">
            {(contacts ?? []).length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm text-text-muted"
                >
                  Sin contactos sincronizados todavía.
                </td>
              </tr>
            )}
            {(contacts ?? []).map((c) => (
              <tr
                key={c.id}
                className="border-t border-border-default hover:bg-bg-subtle"
              >
                <td className="px-4 py-2.5">
                  {[c.first_name, c.last_name].filter(Boolean).join(" ") ||
                    "—"}
                </td>
                <td className="px-4 py-2.5 text-text-secondary">
                  {c.email ?? "—"}
                </td>
                <td className="px-4 py-2.5 text-text-secondary">
                  {c.company ?? "—"}
                </td>
                <td className="px-4 py-2.5 text-text-secondary">
                  {c.job_title ?? "—"}
                </td>
                <td className="px-4 py-2.5 text-text-secondary">
                  {c.lifecycle_stage ?? "—"}
                </td>
                <td className="px-4 py-2.5">
                  <SyncBadge status={c.sync_status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function SyncBadge({ status }: { status: string }) {
  const palette: Record<string, string> = {
    synced: "bg-success-subtle text-success",
    pending: "bg-warning-subtle text-warning",
    conflict: "bg-error-subtle text-error",
    error: "bg-error-subtle text-error",
  };
  const klass = palette[status] ?? "bg-bg-elevated text-text-muted";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${klass}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

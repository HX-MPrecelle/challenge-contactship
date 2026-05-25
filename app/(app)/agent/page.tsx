import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Bot } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPendingAgentActions, getAgentStats } from "@/actions/agent";
import { AgentInbox } from "@/components/agent/AgentInbox";
import {
  createT,
  LOCALE_COOKIE,
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  type Locale,
} from "@/lib/i18n/index";

export const dynamic = "force-dynamic";

export default async function AgentPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const orgId = (user.app_metadata?.org_id ?? user.user_metadata?.org_id) as string | undefined;
  if (!orgId) redirect("/login?error=no-org");
  if (!user.user_metadata?.onboarding_complete) redirect("/onboarding");

  const cookieStore = await cookies();
  const rawLocale = cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined;
  const locale: Locale = rawLocale && SUPPORTED_LOCALES.includes(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const t = createT(locale);

  const [actionsResult, statsResult] = await Promise.all([
    getPendingAgentActions(),
    getAgentStats(),
  ]);

  const actions = actionsResult.success ? actionsResult.data : [];
  const stats   = statsResult.success
    ? statsResult.data
    : { pending: 0, approved: 0, dismissed: 0, acted: 0, total: 0, approvalRate: 0 };

  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 py-6 sm:py-8">
      <header className="flex items-center gap-3 pb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-subtle text-brand">
          <Bot size={18} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">{t("agent.title")}</h1>
          <p className="text-sm text-text-secondary">{t("agent.subtitle")}</p>
        </div>
      </header>

      <AgentInbox initialActions={actions} locale={locale} orgId={orgId} stats={stats} />
    </main>
  );
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n/server";
import { BackButton } from "@/components/layout/BackButton";
import { InsightsTabs } from "@/components/insights/InsightsTabs";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!user.user_metadata?.onboarding_complete) redirect("/onboarding");

  const { t } = await getServerT();

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">
      <BackButton />
      <header className="pb-8">
        <h1 className="text-2xl font-semibold text-text-primary">{t("insights.title")}</h1>
        <p className="mt-1 text-sm text-text-secondary">{t("insights.subtitle")}</p>
      </header>

      <InsightsTabs />
    </main>
  );
}

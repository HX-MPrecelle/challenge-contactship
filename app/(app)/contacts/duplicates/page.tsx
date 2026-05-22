import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Copy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { detectDuplicates } from "@/actions/ai";
import { DuplicatesView } from "@/components/contacts/DuplicatesView";
import { BackButton } from "@/components/layout/BackButton";
import {
  createT,
  LOCALE_COOKIE,
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  type Locale,
} from "@/lib/i18n/index";

export const dynamic = "force-dynamic";

export default async function DuplicatesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const orgId = user.user_metadata?.org_id as string | undefined;
  if (!orgId) redirect("/login?error=no-org");
  if (!user.user_metadata?.onboarding_complete) redirect("/onboarding");

  const cookieStore = await cookies();
  const rawLocale = cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined;
  const locale: Locale = rawLocale && SUPPORTED_LOCALES.includes(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const t = createT(locale);

  const result = await detectDuplicates();
  const groups = result.success ? result.data.groups : [];

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <BackButton />
      <header className="flex items-center gap-3 pb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning-subtle text-warning">
          <Copy size={18} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">{t("duplicates.title")}</h1>
          <p className="text-sm text-text-secondary">{t("duplicates.subtitle")}</p>
        </div>
      </header>

      <DuplicatesView initialGroups={groups} />
    </main>
  );
}

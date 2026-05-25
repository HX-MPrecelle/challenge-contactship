import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Users } from "lucide-react";
import { ContactList } from "@/components/contacts/ContactList";
import { createClient } from "@/lib/supabase/server";
import { HubSpotSyncButton } from "./HubSpotSyncButton";
import { DENSITY_COOKIE, getDensityFromCookieValue } from "@/lib/preferences";
import {
  createT,
  LOCALE_COOKIE,
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  type Locale,
} from "@/lib/i18n/index";

export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 15;
const VALID_STATUSES = ["synced", "pending", "conflict", "error"] as const;
const VALID_LIFECYCLES = [
  "subscriber","lead","marketingqualifiedlead","salesqualifiedlead",
  "opportunity","customer","evangelist","other",
] as const;

type SyncStatus = (typeof VALID_STATUSES)[number];

import type { AiFilterClause } from "@/lib/utils/contact-filters";

type Props = {
  searchParams: Promise<{
    page?: string;
    size?: string;
    status?: string;
    lifecycle?: string;
    q?: string;
    aifilters?: string;   // JSON-encoded AI filter clauses
    aiexplain?: string;   // human-readable explanation for the banner
  }>;
};

export default async function ContactsPage({ searchParams }: Props) {
  const params = await searchParams;

  const pageSize = Math.min(50, Math.max(5, parseInt(params.size ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE));
  const page     = Math.max(0, parseInt(params.page ?? "0", 10) || 0);
  const status   = (VALID_STATUSES as readonly string[]).includes(params.status ?? "")
    ? (params.status as SyncStatus) : null;
  const lifecycle = (VALID_LIFECYCLES as readonly string[]).includes(params.lifecycle ?? "")
    ? params.lifecycle! : null;
  const q = (params.q ?? "").trim().slice(0, 200);

  // AI-parsed structured filters — applied server-side so pagination works correctly
  let aiFilters: AiFilterClause[] = [];
  const aiExplain = (params.aiexplain ?? "").slice(0, 300);
  if (params.aifilters) {
    try {
      const parsed = JSON.parse(decodeURIComponent(params.aifilters));
      if (Array.isArray(parsed)) aiFilters = parsed as AiFilterClause[];
    } catch { /* malformed param — ignore */ }
  }

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
  const density = getDensityFromCookieValue(cookieStore.get(DENSITY_COOKIE)?.value);

  // Build the base query — filters applied server-side so the DB does the work
  // regardless of how many total contacts exist.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let baseQuery: any = supabase
    .from("contacts")
    .select(
      "id, first_name, last_name, email, company, job_title, lifecycle_stage, country, sync_status, local_updated_at, is_archived, created_at, city, lead_status",
      { count: "exact" }
    )
    .eq("org_id", orgId)
    .eq("is_archived", false);

  if (status)    baseQuery = baseQuery.eq("sync_status", status);
  if (lifecycle) baseQuery = baseQuery.eq("lifecycle_stage", lifecycle);

  // Apply AI-parsed filters server-side (same PostgREST dynamic filter the
  // summarize action uses). Each clause is field + operator + value.
  const ALLOWED_AI_FIELDS = new Set([
    "first_name","last_name","email","company","job_title",
    "lifecycle_stage","lead_status","country","city",
    "local_updated_at","created_at",
  ]);
  for (const f of aiFilters) {
    if (!ALLOWED_AI_FIELDS.has(f.field)) continue; // whitelist
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    baseQuery = (baseQuery as any).filter(f.field, f.operator, f.value);
  }

  if (q) {
    // ilike across name + email + company — PostgREST OR filter
    baseQuery = baseQuery.or(
      `first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,company.ilike.%${q}%,job_title.ilike.%${q}%,country.ilike.%${q}%`
    );
  }

  const from = page * pageSize;
  const to   = from + pageSize - 1;

  const { data: contacts, count, error } = await baseQuery
    .order("local_updated_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[contacts page]", error);
  }

  const totalCount = count ?? 0;

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">
      <header className="flex items-center justify-between pb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-subtle text-brand">
            <Users size={18} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">
              {t("contacts.title")}
            </h1>
            <p className="text-sm text-text-secondary">
              {t("contacts.subtitle")}
            </p>
          </div>
        </div>
        <HubSpotSyncButton />
      </header>

      <ContactList
        contacts={contacts ?? []}
        orgId={orgId}
        totalCount={totalCount}
        page={page}
        pageSize={pageSize}
        statusFilter={status}
        lifecycleFilter={lifecycle}
        searchQuery={q}
        serverAiFilters={aiFilters}
        serverAiExplain={aiExplain}
        density={density}
      />
    </main>
  );
}

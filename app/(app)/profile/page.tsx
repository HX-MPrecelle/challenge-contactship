import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n/server";
import { BackButton } from "@/components/layout/BackButton";
import { DisplayNameForm } from "./DisplayNameForm";
import { PasswordForm } from "./PasswordForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { t, locale } = await getServerT();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const displayName = (user.user_metadata?.full_name as string | undefined) ?? "";
  const dateLocale = locale === "en" ? "en-US" : "es-AR";
  const memberSince = new Date(user.created_at).toLocaleDateString(dateLocale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const avatarInitial = (displayName || user.email || "?").charAt(0).toUpperCase();

  return (
    <main className="mx-auto max-w-2xl px-4 sm:px-6 py-6 sm:py-8">
      <BackButton />
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text-primary">{t("profile.title")}</h1>
        <p className="mt-1 text-sm text-text-secondary">{t("profile.subtitle")}</p>
      </div>

      <div className="flex flex-col gap-6">
        <section className="rounded-lg border border-border-default bg-bg-surface p-6">
          <h2 className="text-base font-semibold text-text-primary">{t("profile.identity.title")}</h2>
          <p className="mt-0.5 text-sm text-text-secondary">{t("profile.identity.desc")}</p>

          <div className="mt-5 flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xl font-semibold text-brand select-none">
              {avatarInitial}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text-primary">
                {displayName || user.email}
              </p>
              {displayName && (
                <p className="truncate text-xs text-text-muted">{user.email}</p>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-5 border-t border-border-default pt-5">
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-text-secondary">
                {t("profile.displayName.label")}
              </span>
              <DisplayNameForm currentName={displayName} />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-text-secondary">
                {t("profile.email.label")}
              </span>
              <span className="text-sm text-text-primary">{user.email}</span>
              <span className="text-xs text-text-muted">{t("profile.email.desc")}</span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-text-secondary">
                {t("profile.memberSince.label")}
              </span>
              <span className="text-sm text-text-primary">{memberSince}</span>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-border-default bg-bg-surface p-6">
          <h2 className="text-base font-semibold text-text-primary">{t("profile.security.title")}</h2>
          <p className="mt-0.5 text-sm text-text-secondary">{t("profile.security.desc")}</p>
          <div className="mt-5 border-t border-border-default pt-5">
            <PasswordForm />
          </div>
        </section>
      </div>
    </main>
  );
}

import { redirect } from "next/navigation";
import { Suspense } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const orgId = (user.app_metadata?.org_id ?? user.user_metadata?.org_id) as string | undefined;
  const onboardingComplete = Boolean(user.user_metadata?.onboarding_complete);
  const showSidebar = orgId !== undefined && onboardingComplete;

  const { locale } = await getServerT();

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground md:flex-row">
        {showSidebar && (
          <>
            {/* Desktop sidebar — always visible on md+ */}
            <Suspense fallback={<div className="hidden md:block w-[220px] shrink-0 border-r border-border-default bg-bg-surface" />}>
              <div className="hidden md:flex w-[220px] shrink-0">
                <Sidebar userEmail={user.email ?? ""} locale={locale} orgId={orgId} />
              </div>
            </Suspense>

            {/* Mobile top bar + drawer */}
            <MobileNav userEmail={user.email ?? ""} locale={locale} orgId={orgId} />
          </>
        )}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
      {showSidebar && <CommandPalette locale={locale} />}
    </TooltipProvider>
  );
}

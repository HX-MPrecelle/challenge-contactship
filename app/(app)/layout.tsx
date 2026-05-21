import { redirect } from "next/navigation";
import { Suspense } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/layout/Sidebar";
import { createClient } from "@/lib/supabase/server";

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

  const orgId = user.user_metadata?.org_id as string | undefined;
  const onboardingComplete = Boolean(user.user_metadata?.onboarding_complete);

  // The onboarding page renders the same shell but without the sidebar so
  // the stepper takes the full width and isn't distracting. We pass a
  // skipSidebar hint via the layout structure instead — every other route
  // under (app) gets the chrome.
  const showSidebar = orgId !== undefined && onboardingComplete;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        {showSidebar && (
          <Suspense fallback={<div className="w-[220px] shrink-0 border-r border-border-default bg-bg-surface" />}>
            <Sidebar userEmail={user.email ?? ""} />
          </Suspense>
        )}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </TooltipProvider>
  );
}

import { redirect } from "next/navigation";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Middleware already guards every route under /(app), but a defensive
  // re-check here keeps the layout self-contained: if a future routing
  // tweak accidentally exempts (app), we still bounce unauthenticated
  // users instead of leaking the layout shell.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <TooltipProvider delayDuration={150}>
      <div className="min-h-screen bg-background text-foreground">{children}</div>
    </TooltipProvider>
  );
}

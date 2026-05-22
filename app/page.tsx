import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    if (user.user_metadata?.onboarding_complete) {
      redirect("/dashboard");
    }
    redirect("/onboarding");
  }

  redirect("/login");
}

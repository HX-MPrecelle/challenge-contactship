import { redirect } from "next/navigation";
import { ContactsChat } from "@/components/chat/ContactsChat";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!user.user_metadata?.onboarding_complete) {
    redirect("/onboarding");
  }

  return (
    <main className="mx-auto h-screen max-w-3xl px-6 py-8">
      <ContactsChat />
    </main>
  );
}

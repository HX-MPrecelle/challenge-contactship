import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ContactsChat } from "@/components/chat/ContactsChat";

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
    <div className="flex h-screen w-full overflow-hidden">
      <ContactsChat />
    </div>
  );
}

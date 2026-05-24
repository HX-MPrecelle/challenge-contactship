"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Invisible component that subscribes to Supabase Realtime for a specific
 * contact and calls router.refresh() when it changes, causing the parent
 * Server Component to re-fetch fresh data without a full page reload.
 *
 * Uses the org_id filter (same pattern proven to work in ContactList) and
 * checks contact ID in the callback — filtering by primary key directly
 * is unreliable in Supabase Realtime.
 */
export function ContactRealtimeRefresher({
  contactId,
  orgId,
}: {
  contactId: string;
  orgId: string;
}) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`contact-detail-${contactId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "contacts",
          filter: `org_id=eq.${orgId}`,
        },
        (payload) => {
          // Only refresh when THIS contact changed
          if ((payload.new as { id: string }).id === contactId) {
            router.refresh();
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [contactId, orgId, router]);

  return null;
}

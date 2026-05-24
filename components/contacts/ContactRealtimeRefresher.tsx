"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Invisible component that subscribes to Supabase Realtime for a specific
 * contact and calls router.refresh() when it changes — causing the parent
 * Server Component to re-fetch fresh data without a full page reload.
 * Used in /contacts/[id] to reflect webhook-driven HubSpot updates instantly.
 */
export function ContactRealtimeRefresher({ contactId }: { contactId: string }) {
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
          filter: `id=eq.${contactId}`,
        },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [contactId, router]);

  return null;
}

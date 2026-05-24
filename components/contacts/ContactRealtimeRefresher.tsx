"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export function ContactRealtimeRefresher({
  contactId,
  orgId,
  isDirty = false,
}: {
  contactId: string;
  orgId: string;
  isDirty?: boolean;
}) {
  const router = useRouter();
  const isDirtyRef = useRef(isDirty);
  useEffect(() => { isDirtyRef.current = isDirty; }, [isDirty]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`contact-detail-${contactId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "contacts", filter: `org_id=eq.${orgId}` },
        (payload) => {
          if ((payload.new as { id: string }).id !== contactId) return;

          if (isDirtyRef.current) {
            toast.warning(
              "Este contacto fue modificado en HubSpot. Tus cambios sin guardar se actualizaron con los valores nuevos.",
              { duration: 5000 }
            );
          }
          router.refresh();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [contactId, orgId, router]);

  return null;
}

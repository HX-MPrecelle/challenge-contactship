"use client";

import { useState } from "react";
import { ContactForm } from "@/components/contacts/ContactForm";
import { ContactRealtimeRefresher } from "@/components/contacts/ContactRealtimeRefresher";

type Props = {
  contactId: string;
  orgId: string;
  formKey: string;
  initial: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    company: string | null;
    jobTitle: string | null;
    message: string | null;
  };
};

/**
 * Client wrapper that connects ContactForm's dirty-state tracking with
 * ContactRealtimeRefresher so the warning toast fires when a HubSpot
 * webhook update overwrites unsaved edits.
 */
export function ContactFormWrapper({ contactId, orgId, formKey, initial }: Props) {
  const [isDirty, setIsDirty] = useState(false);

  return (
    <>
      <ContactRealtimeRefresher contactId={contactId} orgId={orgId} isDirty={isDirty} />
      <ContactForm
        key={formKey}
        contactId={contactId}
        initial={initial}
        onDirtyChange={setIsDirty}
      />
    </>
  );
}

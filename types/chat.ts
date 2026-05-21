import type { UIMessage } from "ai";

export type ContactCitation = {
  id: string;
  name: string;
  company: string | null;
  similarity: number;
};

/**
 * Custom UIMessage shape for the chat. We extend the default message with a
 * typed `citations` data part so the route can stream "these are the contacts
 * I used as context" alongside the text — the client then renders them as
 * clickable chips below the assistant's response.
 */
export type ChatUIMessage = UIMessage<
  never,
  {
    citations: {
      contacts: ContactCitation[];
    };
  }
>;

import { HubspotClient } from "./client";

export interface HubspotNote {
  id: string;
  properties: {
    hs_note_body?: string | null;
    hs_timestamp?: string | null;
    hubspot_owner_id?: string | null;
    [key: string]: unknown;
  };
  createdAt: string;
  updatedAt: string;
}

const NOTE_PROPERTIES = ["hs_note_body", "hs_timestamp", "hubspot_owner_id"];

export async function listContactNotes(
  client: HubspotClient,
  contactId: string,
): Promise<HubspotNote[]> {
  const assoc = await client.request<{ results: Array<{ id: string }> }>({
    method: "GET",
    path: `/crm/v4/objects/contacts/${encodeURIComponent(contactId)}/associations/notes`,
  });

  const noteIds = assoc.results.map((r) => r.id);
  if (noteIds.length === 0) return [];

  const batch = await client.request<{ results: HubspotNote[] }>({
    method: "POST",
    path: "/crm/v3/objects/notes/batch/read",
    body: {
      properties: NOTE_PROPERTIES,
      inputs: noteIds.map((id) => ({ id })),
    },
  });

  return batch.results;
}

export async function createContactNote(
  client: HubspotClient,
  contactId: string,
  body: string,
): Promise<HubspotNote> {
  const note = await client.request<HubspotNote>({
    method: "POST",
    path: "/crm/v3/objects/notes",
    body: {
      properties: {
        hs_note_body: body,
        hs_timestamp: new Date().toISOString(),
      },
    },
  });

  await client.request({
    method: "PUT",
    path: `/crm/v4/objects/notes/${encodeURIComponent(note.id)}/associations/default/contacts/${encodeURIComponent(contactId)}`,
  });

  return note;
}

import { z } from "zod";
import { HubspotClient } from "./client";

export const HubspotContactPropertiesSchema = z
  .object({
    email: z.string().optional().nullable(),
    firstname: z.string().optional().nullable(),
    lastname: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    company: z.string().optional().nullable(),
    lifecyclestage: z.string().optional().nullable(),
    hubspot_owner_id: z.string().optional().nullable(),
    notes_last_updated: z.string().optional().nullable(),
    lastmodifieddate: z.string().optional().nullable(),
    createdate: z.string().optional().nullable(),
  })
  .passthrough();

export type HubspotContactProperties = z.infer<typeof HubspotContactPropertiesSchema>;

export interface HubspotContact {
  id: string;
  properties: HubspotContactProperties;
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
}

const TRACKED_PROPERTIES = [
  "email",
  "firstname",
  "lastname",
  "phone",
  "company",
  "lifecyclestage",
  "hubspot_owner_id",
  "notes_last_updated",
  "lastmodifieddate",
  "createdate",
];

export interface ListContactsResult {
  contacts: HubspotContact[];
  nextCursor?: string;
}

export async function listContacts(
  client: HubspotClient,
  options: { cursor?: string; limit?: number } = {},
): Promise<ListContactsResult> {
  const response = await client.request<{
    results: HubspotContact[];
    paging?: { next?: { after: string } };
  }>({
    method: "GET",
    path: "/crm/v3/objects/contacts",
    query: {
      limit: options.limit ?? 100,
      after: options.cursor,
      properties: TRACKED_PROPERTIES.join(","),
      archived: false,
    },
  });

  return {
    contacts: response.results,
    nextCursor: response.paging?.next?.after,
  };
}

export async function getContact(
  client: HubspotClient,
  contactId: string,
): Promise<HubspotContact> {
  return client.request<HubspotContact>({
    method: "GET",
    path: `/crm/v3/objects/contacts/${encodeURIComponent(contactId)}`,
    query: { properties: TRACKED_PROPERTIES.join(",") },
  });
}

export interface ContactPatch {
  email?: string;
  firstname?: string;
  lastname?: string;
  phone?: string;
  company?: string;
  lifecyclestage?: string;
  [key: string]: unknown;
}

export async function updateContact(
  client: HubspotClient,
  contactId: string,
  patch: ContactPatch,
): Promise<HubspotContact> {
  return client.request<HubspotContact>({
    method: "PATCH",
    path: `/crm/v3/objects/contacts/${encodeURIComponent(contactId)}`,
    body: { properties: patch },
  });
}

export async function createContact(
  client: HubspotClient,
  properties: ContactPatch,
): Promise<HubspotContact> {
  return client.request<HubspotContact>({
    method: "POST",
    path: "/crm/v3/objects/contacts",
    body: { properties },
  });
}

export async function searchContacts(
  client: HubspotClient,
  query: string,
  options: { limit?: number } = {},
): Promise<HubspotContact[]> {
  const response = await client.request<{ results: HubspotContact[] }>({
    method: "POST",
    path: "/crm/v3/objects/contacts/search",
    body: {
      query,
      limit: options.limit ?? 25,
      properties: TRACKED_PROPERTIES,
      sorts: [{ propertyName: "lastmodifieddate", direction: "DESCENDING" }],
    },
  });
  return response.results;
}

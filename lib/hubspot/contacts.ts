import "server-only";
import type { HubSpotClient } from "@/lib/hubspot/client";

// Properties we always request from HubSpot. Anything outside this list lands
// in `contacts.properties` JSONB without being promoted to a typed column.
export const HUBSPOT_CONTACT_PROPERTIES = [
  "firstname",
  "lastname",
  "email",
  "phone",
  "company",
  "jobtitle",
  "lifecyclestage",
  "hs_lead_status",
  "hubspot_owner_id",
  "website",
  "city",
  "country",
  "hs_lastmodifieddate",
  "createdate",
] as const;

export type HubSpotContact = {
  id: string;
  properties: Record<string, string | null>;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
};

export type HubSpotContactPage = {
  results: HubSpotContact[];
  paging?: { next?: { after: string } };
};

/**
 * Fetch one page of contacts. `after` is the opaque cursor returned by a
 * previous response — pass undefined for the first page.
 */
export async function listContactsPage(
  client: HubSpotClient,
  options: { after?: string; limit?: number; lifecycleStage?: string } = {}
): Promise<HubSpotContactPage> {
  const { after, limit = 100, lifecycleStage } = options;

  // Filtering by lifecyclestage requires the search endpoint — list does
  // not accept filters. We branch so the common "import everything" case
  // hits the cheaper /list endpoint.
  if (lifecycleStage) {
    return searchContacts(client, { after, limit, lifecycleStage });
  }

  const params = new URLSearchParams();
  params.set("limit", String(limit));
  params.set("properties", HUBSPOT_CONTACT_PROPERTIES.join(","));
  params.set("archived", "false");
  if (after) params.set("after", after);

  const res = await client.fetch(
    `/crm/v3/objects/contacts?${params.toString()}`
  );
  if (!res.ok) {
    throw new Error(`HubSpot listContacts failed: HTTP ${res.status}`);
  }
  return (await res.json()) as HubSpotContactPage;
}

async function searchContacts(
  client: HubSpotClient,
  options: { after?: string; limit: number; lifecycleStage: string }
): Promise<HubSpotContactPage> {
  const body = {
    properties: HUBSPOT_CONTACT_PROPERTIES,
    filterGroups: [
      {
        filters: [
          {
            propertyName: "lifecyclestage",
            operator: "EQ",
            value: options.lifecycleStage,
          },
        ],
      },
    ],
    limit: options.limit,
    ...(options.after ? { after: options.after } : {}),
  };

  const res = await client.fetch(`/crm/v3/objects/contacts/search`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`HubSpot searchContacts failed: HTTP ${res.status}`);
  }
  return (await res.json()) as HubSpotContactPage;
}

/**
 * Total contact count for a portal, optionally filtered by lifecycle stage.
 * Used by the onboarding step that previews how many contacts will be
 * imported. Uses the search API which returns a `total` field.
 */
export async function countContacts(
  client: HubSpotClient,
  filter?: { lifecycleStage?: string }
): Promise<number> {
  const body: Record<string, unknown> = { limit: 1 };
  if (filter?.lifecycleStage) {
    body.filterGroups = [
      {
        filters: [
          {
            propertyName: "lifecyclestage",
            operator: "EQ",
            value: filter.lifecycleStage,
          },
        ],
      },
    ];
  }

  const res = await client.fetch(`/crm/v3/objects/contacts/search`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`HubSpot countContacts failed: HTTP ${res.status}`);
  }
  const json = (await res.json()) as { total?: number };
  return json.total ?? 0;
}

/**
 * Update a single contact. Used by Server Actions that edit a contact from
 * our UI; the sync engine mirrors the new state back into Supabase.
 */
export async function updateContact(
  client: HubSpotClient,
  hubspotId: string,
  properties: Record<string, string>
): Promise<HubSpotContact> {
  const res = await client.fetch(
    `/crm/v3/objects/contacts/${hubspotId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ properties }),
    }
  );
  if (!res.ok) {
    const text = await safeText(res);
    throw new Error(
      `HubSpot updateContact failed: HTTP ${res.status} — ${text}`
    );
  }
  return (await res.json()) as HubSpotContact;
}

/**
 * Fetch a single contact by HubSpot ID with all the properties we care about.
 * Used by the webhook handler — events only carry a propertyName + value, so
 * we re-pull the full record before upserting locally.
 */
export async function getContact(
  client: HubSpotClient,
  hubspotId: string
): Promise<HubSpotContact | null> {
  const params = new URLSearchParams();
  params.set("properties", HUBSPOT_CONTACT_PROPERTIES.join(","));

  const res = await client.fetch(
    `/crm/v3/objects/contacts/${hubspotId}?${params.toString()}`
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`HubSpot getContact failed: HTTP ${res.status}`);
  }
  return (await res.json()) as HubSpotContact;
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 500);
  } catch {
    return "";
  }
}

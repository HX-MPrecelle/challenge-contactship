import "server-only";
import type { HubSpotClient } from "@/lib/hubspot/client";

/**
 * Minimum set of properties to request when portal property definitions are
 * unavailable. The full dynamic list is fetched via getPortalContactProperties()
 * in lib/hubspot/properties.ts and passed to listContactsPage/getContact.
 */
export const HUBSPOT_CONTACT_PROPERTIES = [
  // ── Identity ──────────────────────────────────────────────────────────────
  "firstname",
  "lastname",
  "email",
  "phone",
  "company",
  "jobtitle",
  "website",
  "city",
  "country",

  // ── Pipeline & status ─────────────────────────────────────────────────────
  "lifecyclestage",
  "hs_lead_status",
  "hubspot_owner_id",
  "hs_buying_role",          // DECISION_MAKER, BUDGET_HOLDER, etc.

  // ── Company context (huge for AI clustering) ──────────────────────────────
  "industry",                // FinTech, SaaS, Healthcare, etc.
  "numemployees",            // 1-5, 25-50, 100-500, etc.
  "annualrevenue",           // deal size signal

  // ── Engagement & recency signals ──────────────────────────────────────────
  "hs_last_contacted",       // ISO date — last outreach
  "hs_sales_email_last_replied", // date — last reply received
  "hs_email_open_count",     // int — email engagement
  "notes_last_updated",      // date — last note activity

  // ── Free-text notes (gold for semantic search) ────────────────────────────
  "message",                 // contact-level notes / description

  // ── Attribution ───────────────────────────────────────────────────────────
  "hs_analytics_source",     // ORGANIC_SEARCH, PAID_SOCIAL, REFERRALS, etc.

  // ── Timestamps ────────────────────────────────────────────────────────────
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

export async function listContactsPage(
  client: HubSpotClient,
  options: {
    after?: string;
    limit?: number;
    lifecycleStage?: string;
    /** Dynamic property list from getPortalContactProperties(). Falls back to HUBSPOT_CONTACT_PROPERTIES. */
    propertyNames?: string[];
  } = {}
): Promise<HubSpotContactPage> {
  const { after, limit = 100, lifecycleStage, propertyNames } = options;
  const props = propertyNames ?? [...HUBSPOT_CONTACT_PROPERTIES];

  if (lifecycleStage) {
    return searchContacts(client, { after, limit, lifecycleStage, propertyNames: props });
  }

  const params = new URLSearchParams();
  params.set("limit", String(limit));
  params.set("properties", props.join(","));
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
  options: { after?: string; limit: number; lifecycleStage: string; propertyNames?: string[] }
): Promise<HubSpotContactPage> {
  const body = {
    properties: options.propertyNames ?? [...HUBSPOT_CONTACT_PROPERTIES],
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

export async function getContact(
  client: HubSpotClient,
  hubspotId: string,
  propertyNames?: string[]
): Promise<HubSpotContact | null> {
  const props = propertyNames ?? [...HUBSPOT_CONTACT_PROPERTIES];
  const params = new URLSearchParams();
  params.set("properties", props.join(","));

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

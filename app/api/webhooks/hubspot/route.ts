import { after, NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getHubSpotClient } from "@/lib/hubspot/client";
import { getContact } from "@/lib/hubspot/contacts";
import { getPortalContactProperties } from "@/lib/hubspot/properties";
import {
  archiveContact,
  buildContactText,
  normalizeHubSpotContact,
  upsertContactFromHubSpot,
} from "@/lib/hubspot/sync";
import { embedContacts } from "@/lib/ai/embeddings";
import {
  parseWebhookEvents,
  verifyWebhookSignature,
  type HubSpotWebhookEvent,
} from "@/lib/hubspot/webhooks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const fullUri = reconstructFullUri(request);

  // Try verification with both the OAuth client secret AND the private app
  // token — HubSpot signs with whichever app the subscription belongs to.
  // OAuth App (40351812) → signs with HUBSPOT_CLIENT_SECRET
  // Private App (40354107) → signs with HUBSPOT_PRIVATE_APP_TOKEN
  const sig = request.headers.get("x-hubspot-signature-v3");
  const ts  = request.headers.get("x-hubspot-request-timestamp");
  const secrets = [
    process.env.HUBSPOT_CLIENT_SECRET,
    process.env.HUBSPOT_PRIVATE_APP_TOKEN,
  ].filter(Boolean) as string[];

  let verified = false;
  for (const secret of secrets) {
    try {
      verifyWebhookSignature({ method: "POST", fullUri, rawBody, signature: sig, timestamp: ts, clientSecret: secret });
      verified = true;
      break;
    } catch {
      // try next secret
    }
  }
  if (!verified) {
    console.warn("[hubspot webhook] verification failed with all available secrets");
    return new NextResponse("Forbidden", { status: 403 });
  }

  let events: HubSpotWebhookEvent[];
  try {
    events = parseWebhookEvents(rawBody);
  } catch (err) {
    console.warn("[hubspot webhook] parse failed", err);
    return new NextResponse("Bad Request", { status: 400 });
  }

  // HubSpot retries any non-2xx, which would amplify duplicate processing.
  // We deliberately respond 200 first and best-effort process the events;
  // each upsert is idempotent (sync_hash), so a worst-case retry under
  // failure is safe. processEvents catches per-event errors internally so
  // a single broken event can't poison the whole batch.
  void processEvents(events).catch((err) => {
    console.error("[hubspot webhook] processing crashed", err);
  });

  return new NextResponse("OK", { status: 200 });
}

async function processEvents(events: HubSpotWebhookEvent[]): Promise<void> {
  // Bucket by portalId so we look up each org's connection once per portal.
  const byPortal = new Map<number, HubSpotWebhookEvent[]>();
  for (const event of events) {
    const bucket = byPortal.get(event.portalId) ?? [];
    bucket.push(event);
    byPortal.set(event.portalId, bucket);
  }

  const admin = createServiceClient();

  for (const [portalId, portalEvents] of byPortal) {
    const { data: connection } = await admin
      .from("hubspot_connections")
      .select("org_id")
      .eq("portal_id", String(portalId))
      .maybeSingle();

    if (!connection) {
      console.warn(
        `[hubspot webhook] no connection registered for portal ${portalId}`
      );
      continue;
    }

    const orgId = connection.org_id;
    const client = await getHubSpotClient(orgId).catch((err) => {
      console.error(
        `[hubspot webhook] HubSpot client unavailable for org ${orgId}`,
        err
      );
      return null;
    });
    if (!client) continue;

    // Fetch all property definitions once per portal batch
    const portalProps = await getPortalContactProperties(client).catch(() => null);

    for (const event of portalEvents) {
      try {
        await processSingleEvent(admin, orgId, client, event, portalProps);
      } catch (err) {
        console.error(
          `[hubspot webhook] event ${event.eventId} failed`,
          err
        );
      }
    }
  }
}

async function processSingleEvent(
  admin: ReturnType<typeof createServiceClient>,
  orgId: string,
  client: Awaited<ReturnType<typeof getHubSpotClient>>,
  event: HubSpotWebhookEvent,
  portalProps: import("@/lib/hubspot/properties").PortalProperties | null
): Promise<void> {
  const hubspotId = String(event.objectId);

  if (
    event.subscriptionType === "object.deletion" ||
    event.subscriptionType === "contact.deletion"
  ) {
    await archiveContact(admin, orgId, hubspotId);
    return;
  }

  if (
    event.subscriptionType === "object.creation" ||
    event.subscriptionType === "object.propertyChange" ||
    event.subscriptionType === "contact.creation" ||
    event.subscriptionType === "contact.propertyChange"
  ) {
    const contact = await getContact(client, hubspotId, portalProps?.names);
    if (!contact) {
      console.warn(
        `[hubspot webhook] contact ${hubspotId} missing on HubSpot, archiving`
      );
      await archiveContact(admin, orgId, hubspotId);
      return;
    }

    const normalized = normalizeHubSpotContact(contact);
    const text = buildContactText(normalized, portalProps?.labels);

    // Upsert immediately so the local mirror is up to date.
    const result = await upsertContactFromHubSpot(admin, orgId, contact, {
      embedding: null,
    });

    // Regenerate embedding after responding — keeps webhook processing fast.
    after(async () => {
      const embeddings = await embedContacts([{ key: hubspotId, text }]);
      if (embeddings?.[0]) {
        await admin
          .from("contacts")
          .update({ embedding: embeddings[0].embedding as unknown as string })
          .eq("hubspot_id", hubspotId)
          .eq("org_id", orgId);
      }
    });

    void result;
    return;
  }
}

function reconstructFullUri(request: NextRequest): string {
  // HubSpot signs the public URL it was configured with, so when we are
  // behind a tunnel (ngrok) or a proxy (Vercel) we must reconstruct the
  // same scheme/host the world saw, not the loopback the runtime sees.
  const headers = request.headers;
  const forwardedHost = headers.get("x-forwarded-host");
  const forwardedProto = headers.get("x-forwarded-proto");
  const host = forwardedHost ?? headers.get("host") ?? new URL(request.url).host;
  const proto =
    forwardedProto ?? (request.url.startsWith("https") ? "https" : "http");
  const { pathname, search } = new URL(request.url);
  return `${proto}://${host}${pathname}${search}`;
}

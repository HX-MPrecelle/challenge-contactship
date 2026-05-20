import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { WebhookVerificationError } from "@/lib/errors";

const MAX_TIMESTAMP_SKEW_MS = 5 * 60 * 1000;

export type HubSpotWebhookEvent = {
  eventId: number;
  subscriptionId: number;
  portalId: number;
  appId: number;
  occurredAt: number;
  subscriptionType: string;
  attemptNumber: number;
  objectId: number;
  changeFlag?: string;
  changeSource?: string;
  sourceId?: string;
  propertyName?: string;
  propertyValue?: string;
};

/**
 * Validate an inbound webhook against HubSpot's v3 signature scheme.
 *
 *   sourceString = METHOD + fullURI + rawBody + timestamp
 *   expected     = base64(HMAC-SHA256(client_secret, sourceString))
 *
 * Rejects timestamps older than five minutes to make replay attacks
 * expensive, then compares signatures with timingSafeEqual to defeat
 * timing-based oracles. Throws WebhookVerificationError so callers can
 * map cleanly to a 403.
 *
 * `fullUri` must be the full URL as HubSpot saw it (including scheme,
 * host, path, and query string) — typically derived from the request's
 * x-forwarded-* headers when behind ngrok/Vercel.
 */
export function verifyWebhookSignature(params: {
  method: string;
  fullUri: string;
  rawBody: string;
  signature: string | null;
  timestamp: string | null;
  clientSecret: string;
}): void {
  if (!params.signature || !params.timestamp) {
    throw new WebhookVerificationError("missing signature or timestamp header");
  }

  const ts = Number(params.timestamp);
  if (!Number.isFinite(ts)) {
    throw new WebhookVerificationError("malformed timestamp header");
  }
  const skew = Math.abs(Date.now() - ts);
  if (skew > MAX_TIMESTAMP_SKEW_MS) {
    throw new WebhookVerificationError(
      `timestamp skew ${Math.round(skew / 1000)}s exceeds 5 minute window`
    );
  }

  const sourceString =
    params.method + params.fullUri + params.rawBody + params.timestamp;

  const expected = createHmac("sha256", params.clientSecret)
    .update(sourceString, "utf8")
    .digest("base64");

  const expectedBuf = Buffer.from(expected, "base64");
  const providedBuf = Buffer.from(params.signature, "base64");
  if (
    expectedBuf.length !== providedBuf.length ||
    !timingSafeEqual(expectedBuf, providedBuf)
  ) {
    throw new WebhookVerificationError("signature mismatch");
  }
}

/**
 * Parse the raw body of an inbound webhook request into a typed event
 * array. HubSpot sends an array of mixed event types in one POST.
 */
export function parseWebhookEvents(rawBody: string): HubSpotWebhookEvent[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    throw new WebhookVerificationError("body is not valid JSON");
  }
  if (!Array.isArray(parsed)) {
    throw new WebhookVerificationError("expected an array of events");
  }
  return parsed as HubSpotWebhookEvent[];
}

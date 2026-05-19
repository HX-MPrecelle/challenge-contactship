import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

/**
 * HubSpot signs each webhook request with HMAC-SHA256 using the app's client
 * secret. v3 signatures hash: `<method><uri><body><timestamp>`.
 * See: https://developers.hubspot.com/docs/api/webhooks/validating-requests
 */
export interface WebhookSignatureInput {
  clientSecret: string;
  method: string;
  fullUri: string;
  body: string;
  timestamp: string;
  receivedSignature: string;
  maxClockSkewMs?: number;
}

const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

export function verifyWebhookSignatureV3(input: WebhookSignatureInput): boolean {
  const skew = input.maxClockSkewMs ?? MAX_CLOCK_SKEW_MS;
  const ts = Number(input.timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Date.now() - ts) > skew) return false;

  const source = `${input.method}${input.fullUri}${input.body}${input.timestamp}`;
  const expected = createHmac("sha256", input.clientSecret)
    .update(source, "utf8")
    .digest("base64");

  const a = Buffer.from(expected);
  const b = Buffer.from(input.receivedSignature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const WebhookEventSchema = z.object({
  eventId: z.number(),
  subscriptionId: z.number(),
  portalId: z.number(),
  appId: z.number(),
  occurredAt: z.number(),
  subscriptionType: z.string(),
  attemptNumber: z.number().optional(),
  objectId: z.number(),
  changeSource: z.string().optional(),
  changeFlag: z.string().optional(),
  propertyName: z.string().optional(),
  propertyValue: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
});

export type WebhookEvent = z.infer<typeof WebhookEventSchema>;
export const WebhookPayloadSchema = z.array(WebhookEventSchema);

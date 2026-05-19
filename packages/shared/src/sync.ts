import type { SyncContext, SyncSource } from "./types";

/**
 * Window (ms) during which an inbound HubSpot event is considered an echo
 * of a recent outbound write originated locally or by the AI.
 *
 * Reasoning: HubSpot dispatches webhooks within a few seconds of an API write.
 * If our local row was just touched by a `local` / `ai` source and HubSpot's
 * updatedAt sits inside this window relative to our lastSyncedAt, we treat
 * the inbound event as a loop and skip it.
 */
export const LOOP_WINDOW_MS = 10_000;

export interface LoopCheckInput {
  inboundUpdatedAt: Date;
  local: SyncContext;
}

export interface LoopCheckResult {
  isLoop: boolean;
  reason: string;
}

export function isSyncLoop({
  inboundUpdatedAt,
  local,
}: LoopCheckInput): LoopCheckResult {
  if (local.source === "hubspot") {
    return { isLoop: false, reason: "local source is hubspot — no loop possible" };
  }
  if (!local.lastSyncedAt) {
    return { isLoop: false, reason: "no lastSyncedAt — treating as first write" };
  }
  const delta = Math.abs(
    inboundUpdatedAt.getTime() - local.lastSyncedAt.getTime(),
  );
  if (delta <= LOOP_WINDOW_MS) {
    return {
      isLoop: true,
      reason: `inbound updatedAt within ${LOOP_WINDOW_MS}ms of last ${local.source} write (delta=${delta}ms)`,
    };
  }
  return { isLoop: false, reason: `delta ${delta}ms exceeds loop window` };
}

/**
 * Latest-write-wins resolution.
 *
 * Inbound wins iff HubSpot's updatedAt is strictly greater than the local
 * `updated_at`. Otherwise inbound is discarded as stale. This is intentional:
 * we tolerate brief inconsistency in favor of operational simplicity, and we
 * preserve every decision in sync_logs so the trail is auditable.
 */
export function inboundWins(args: {
  inboundUpdatedAt: Date;
  localUpdatedAt: Date;
}): boolean {
  return args.inboundUpdatedAt.getTime() > args.localUpdatedAt.getTime();
}

export function describeSource(source: SyncSource): string {
  switch (source) {
    case "hubspot":
      return "HubSpot";
    case "local":
      return "User";
    case "ai":
      return "AI Copilot";
  }
}

import type { Db } from "@contactship/db";
import type { HubspotClient } from "@contactship/hubspot";

/**
 * Context passed to every AI tool execution. The route handler builds this
 * once per request (after auth + HubSpot token resolution) and shares it
 * across all tool invocations within the same model turn.
 */
export interface ToolContext {
  db: Db;
  hubspot: HubspotClient;
  userId: string;
  hubId: string;
}

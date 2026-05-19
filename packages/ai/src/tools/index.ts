import type { ToolContext } from "../context";

/**
 * Tool factories accept the shared ToolContext (db, hubspot client, userId)
 * and return AI-SDK-compatible tool definitions. The concrete implementations
 * are stubbed below — each will be filled out in apps/web/app/api/copilot
 * once the streaming route handler is wired up.
 */
export interface ToolFactory {
  (context: ToolContext): unknown;
}

export const TOOL_NAMES = [
  "search_contacts",
  "get_contact",
  "list_recent_contacts",
  "create_contact",
  "update_contact",
  "create_note",
  "generate_contact_summary",
  "get_sync_status",
  "get_failed_syncs",
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];

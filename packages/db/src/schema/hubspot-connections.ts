import { sql } from "drizzle-orm";
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { id, timestamps, userIdColumn } from "./_shared";

export const hubspotConnections = pgTable(
  "hubspot_connections",
  {
    id: id(),
    userId: userIdColumn(),
    hubId: text("hub_id").notNull(),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    scopes: text("scopes")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    initialSyncCompletedAt: timestamp("initial_sync_completed_at", {
      withTimezone: true,
    }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("hubspot_connections_user_id_idx").on(table.userId),
    index("hubspot_connections_hub_id_idx").on(table.hubId),
  ],
);

export type HubspotConnection = typeof hubspotConnections.$inferSelect;
export type NewHubspotConnection = typeof hubspotConnections.$inferInsert;

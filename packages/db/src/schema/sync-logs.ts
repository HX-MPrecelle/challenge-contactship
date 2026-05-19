import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import {
  entityTypeEnum,
  id,
  syncDirectionEnum,
  syncSourceEnum,
  syncStatusEnum,
  userIdColumn,
} from "./_shared";

export const syncLogs = pgTable(
  "sync_logs",
  {
    id: id(),
    userId: userIdColumn(),
    entityType: entityTypeEnum("entity_type").notNull(),
    entityId: uuid("entity_id"),
    hubspotId: text("hubspot_id"),
    direction: syncDirectionEnum("direction").notNull(),
    source: syncSourceEnum("source").notNull(),
    status: syncStatusEnum("status").notNull(),
    error: text("error"),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    index("sync_logs_user_created_idx").on(
      table.userId,
      sql`${table.createdAt} desc`,
    ),
    index("sync_logs_status_idx").on(table.status, sql`${table.createdAt} desc`),
    index("sync_logs_entity_idx").on(table.entityType, table.entityId),
  ],
);

export type SyncLog = typeof syncLogs.$inferSelect;
export type NewSyncLog = typeof syncLogs.$inferInsert;

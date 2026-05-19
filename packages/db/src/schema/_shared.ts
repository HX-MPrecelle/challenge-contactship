import { sql } from "drizzle-orm";
import { pgEnum, timestamp, uuid } from "drizzle-orm/pg-core";

export const syncSourceEnum = pgEnum("sync_source", [
  "hubspot",
  "local",
  "ai",
]);

export const syncDirectionEnum = pgEnum("sync_direction", [
  "inbound",
  "outbound",
]);

export const syncStatusEnum = pgEnum("sync_status", [
  "success",
  "failed",
  "skipped_loop",
]);

export const entityTypeEnum = pgEnum("entity_type", ["contact", "note"]);

export const aiRoleEnum = pgEnum("ai_role", ["user", "assistant", "tool"]);

export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
} as const;

export const id = () =>
  uuid("id").primaryKey().default(sql`gen_random_uuid()`);

/**
 * Foreign key to Supabase Auth users. We do not own this table — Supabase
 * manages `auth.users`. We mirror only the id and let Row Level Security do
 * the rest.
 */
export const userIdColumn = () =>
  uuid("user_id").notNull();

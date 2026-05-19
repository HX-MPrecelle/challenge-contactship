import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { id, syncSourceEnum, timestamps, userIdColumn } from "./_shared";

export const contacts = pgTable(
  "contacts",
  {
    id: id(),
    userId: userIdColumn(),
    hubspotId: text("hubspot_id"),

    email: text("email"),
    firstName: text("first_name"),
    lastName: text("last_name"),
    phone: text("phone"),
    company: text("company"),
    lifecycleStage: text("lifecycle_stage"),
    ownerHubspotId: text("owner_hubspot_id"),

    properties: jsonb("properties").$type<Record<string, unknown>>(),

    source: syncSourceEnum("source").notNull().default("hubspot"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    hubspotUpdatedAt: timestamp("hubspot_updated_at", { withTimezone: true }),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),

    aiScore: integer("ai_score"),
    aiSummary: text("ai_summary"),
    aiSummaryGeneratedAt: timestamp("ai_summary_generated_at", {
      withTimezone: true,
    }),

    ...timestamps,
  },
  (table) => [
    uniqueIndex("contacts_user_hubspot_idx").on(table.userId, table.hubspotId),
    index("contacts_user_email_idx").on(table.userId, table.email),
    index("contacts_user_activity_idx").on(
      table.userId,
      sql`${table.lastActivityAt} desc`,
    ),
    index("contacts_user_updated_idx").on(
      table.userId,
      sql`${table.updatedAt} desc`,
    ),
  ],
);

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;

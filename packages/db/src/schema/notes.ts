import {
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { contacts } from "./contacts";
import { id, syncSourceEnum, timestamps, userIdColumn } from "./_shared";

export const notes = pgTable(
  "notes",
  {
    id: id(),
    userId: userIdColumn(),
    contactId: uuid("contact_id").notNull(),
    hubspotId: text("hubspot_id"),
    body: text("body").notNull(),
    source: syncSourceEnum("source").notNull().default("hubspot"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    hubspotUpdatedAt: timestamp("hubspot_updated_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    foreignKey({
      columns: [table.contactId],
      foreignColumns: [contacts.id],
      name: "notes_contact_id_fk",
    }).onDelete("cascade"),
    uniqueIndex("notes_user_hubspot_idx").on(table.userId, table.hubspotId),
    index("notes_contact_id_idx").on(table.contactId),
  ],
);

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;

import {
  foreignKey,
  index,
  jsonb,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { aiRoleEnum, id, timestamps, userIdColumn } from "./_shared";

export const aiConversations = pgTable(
  "ai_conversations",
  {
    id: id(),
    userId: userIdColumn(),
    title: text("title"),
    ...timestamps,
  },
  (table) => [index("ai_conversations_user_idx").on(table.userId)],
);

export const aiMessages = pgTable(
  "ai_messages",
  {
    id: id(),
    conversationId: uuid("conversation_id").notNull(),
    role: aiRoleEnum("role").notNull(),
    content: jsonb("content").$type<unknown>().notNull(),
    ...timestamps,
  },
  (table) => [
    foreignKey({
      columns: [table.conversationId],
      foreignColumns: [aiConversations.id],
      name: "ai_messages_conversation_id_fk",
    }).onDelete("cascade"),
    index("ai_messages_conversation_idx").on(table.conversationId),
  ],
);

export type AiConversation = typeof aiConversations.$inferSelect;
export type NewAiConversation = typeof aiConversations.$inferInsert;
export type AiMessage = typeof aiMessages.$inferSelect;
export type NewAiMessage = typeof aiMessages.$inferInsert;

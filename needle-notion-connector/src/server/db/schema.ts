import { sql } from "drizzle-orm";
import {
  pgTableCreator,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const createTable = pgTableCreator((name) => name);

export const notionPagesTable = createTable("notion_pages", {
  id: serial("id").primaryKey(),
  ndlConnectorId: varchar("ndl_connector_id", { length: 256 }).notNull(),
  ndlFileId: varchar("ndl_file_id", { length: 256 }),
  notionPageId: varchar("notion_page_id", { length: 256 }).notNull(),
  url: text("url").notNull(),
  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdate(() => new Date())
    .notNull(),
});

// export const notionTokensTable = createTable("notion_tokens", {
//   id: serial("id").primaryKey(),
//   ndlConnectorId: varchar("ndl_connector_id", { length: 256 }).notNull(),
//   accessToken: varchar("access_token", { length: 80 }).notNull(),
//   botId: uuid("bot_id").notNull(),
//   workspaceId: uuid("workspace_id").notNull(),
//   workspaceName: varchar("workspace_name", { length: 256 }).notNull(),
//   userId: uuid("user_id").notNull(),
//   userName: varchar("user_name", { length: 256 }).notNull(),
//   createdAt: timestamp("created_at")
//     .default(sql`CURRENT_TIMESTAMP`)
//     .notNull(),
//   updatedAt: timestamp("updated_at")
//     .default(sql`CURRENT_TIMESTAMP`)
//     .$onUpdate(() => new Date())
//     .notNull(),
// });

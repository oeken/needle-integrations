import { sql } from "drizzle-orm";
import {
  pgEnum,
  pgTableCreator,
  serial,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const createTable = pgTableCreator((name) => name);

export const notionObject = pgEnum("notion_object", ["database", "page"]);

export const notionPagesTable = createTable("notion_pages", {
  id: serial("id").primaryKey(),
  ndlConnectorId: varchar("ndl_connector_id", { length: 256 }).notNull(),
  ndlFileId: varchar("ndl_file_id", { length: 256 }).notNull(),
  notionPageId: varchar("notion_page_id", { length: 256 }).notNull(),
  notionPageTitle: varchar("notion_page_title", { length: 256 }).notNull(),
  notionObject: notionObject("notion_object").notNull(),
  notionLastEditedTime: varchar("notion_last_edited_time").notNull(),
  notionUrl: text("notion_url").notNull(),
  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdate(() => new Date())
    .notNull(),
});

export const notionConnectorsTable = createTable("notion_connectors", {
  id: serial("id").primaryKey(),
  ndlConnectorId: varchar("ndl_connector_id", { length: 256 }).notNull(),
  notionWorkspaceId: uuid("notion_workspace_id").notNull(),
  notionWorkspaceName: varchar("notion_workspace_name", {
    length: 256,
  }).notNull(),
  notionUserId: uuid("notion_user_id").notNull(),
  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdate(() => new Date())
    .notNull(),
});

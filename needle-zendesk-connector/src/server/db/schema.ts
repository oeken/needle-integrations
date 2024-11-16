import { sql } from "drizzle-orm";
import {
  pgTableCreator,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const createTable = pgTableCreator((name) => name);

export const filesTable = createTable("files", {
  id: serial("id").primaryKey(),
  ndlConnectorId: varchar("ndl_connector_id", { length: 256 }).notNull(),
  ndlFileId: varchar("ndl_file_id", { length: 256 }),
  url: text("url").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'ticket' or 'article'
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: varchar("status", { length: 50 }),
  priority: varchar("priority", { length: 50 }),
  html_url: text("html_url"), // For articles
  body: text("body"), // For articles
  subject: text("subject"), // For tickets
  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

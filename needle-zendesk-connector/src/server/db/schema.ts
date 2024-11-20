import { sql } from "drizzle-orm";
import {
  pgTableCreator,
  serial,
  text,
  timestamp,
  varchar,
  bigint,
  boolean,
} from "drizzle-orm/pg-core";

export const createTable = pgTableCreator((name) => name);

export const filesTable = createTable("files", {
  id: serial("id").primaryKey(),
  ndlConnectorId: varchar("ndl_connector_id", { length: 256 }).notNull(),
  ndlFileId: varchar("ndl_file_id", { length: 256 }),
  originId: bigint("origin_id", { mode: "number" }).notNull(), // Changed from integer to bigint
  url: text("url").notNull(),
  title: text("title").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'ticket' or 'article' or 'comments'
  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const zendeskConnectorsTable = createTable("zendesk_connectors", {
  connectorId: varchar("connector_id", { length: 256 }).primaryKey(),
  subdomain: varchar("subdomain", { length: 256 }).notNull(),
  orgId: bigint("org_id", { mode: "number" }).notNull(),
  includeTickets: boolean("include_tickets").notNull().default(false),
  includeArticles: boolean("include_articles").notNull().default(false),
});

import { sql } from "drizzle-orm";
import {
  pgTableCreator,
  serial,
  text,
  timestamp,
  varchar,
  bigint,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";

export const createTable = pgTableCreator((name) => name);

export const filesTable = createTable("files", {
  id: serial("id").primaryKey(),
  ndlConnectorId: varchar("ndl_connector_id", { length: 256 }).notNull(),
  ndlFileId: varchar("ndl_file_id", { length: 256 }),
  title: varchar("title", { length: 512 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const slackConnectorsTable = createTable("slack_connectors", {
  connectorId: varchar("connector_id", { length: 256 }).primaryKey(),
  channelInfo: jsonb("channel_info").$type<SlackChannel[]>(), // Add type information
  timezone: text("timezone"),
  lastSyncedAt: timestamp("last_synced_at").defaultNow(),
});

// Type definitions for better type safety
export type FileInsert = typeof filesTable.$inferInsert;
export type FileSelect = typeof filesTable.$inferSelect;
export type SlackConnectorInsert = typeof slackConnectorsTable.$inferInsert;
export type SlackConnectorSelect = typeof slackConnectorsTable.$inferSelect;

// Define the valid file types
export const FileTypes = {
  TICKET: "ticket",
  ARTICLE: "article",
  COMMENTS: "comments",
} as const;

export type FileType = (typeof FileTypes)[keyof typeof FileTypes];

// Slack channel types
export type SlackChannel = {
  id: string;
  name: string;
};

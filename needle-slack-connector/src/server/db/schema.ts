import { sql } from "drizzle-orm";
import {
  pgTableCreator,
  serial,
  text,
  timestamp,
  varchar,
  jsonb,
} from "drizzle-orm/pg-core";

export const createTable = pgTableCreator((name) => name);

export const slackConnectorsTable = createTable("slack_connectors", {
  connectorId: varchar("connector_id", { length: 256 }).primaryKey(),
  channelInfo: jsonb("channel_info").$type<SlackChannel[]>(),
  timezone: text("timezone"),
  lastSyncedAt: timestamp("last_synced_at").defaultNow(),
});

export const slackMessagesTable = createTable("slack_channel_messages", {
  id: serial("id").primaryKey(),
  ndlConnectorId: varchar("ndl_connector_id", { length: 256 })
    .notNull()
    .references(() => slackConnectorsTable.connectorId),
  ndlFileId: varchar("ndl_file_id", { length: 256 }).notNull(),
  channelId: varchar("channel_id", { length: 256 }).notNull(),
  monthStart: varchar("month_start", { length: 32 }).notNull(),
  monthEnd: varchar("month_end", { length: 32 }).notNull(),
  dataType: varchar("data_type", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdate(() => new Date())
    .notNull(),
});

export const slackCanvasesTable = createTable("slack_canvases", {
  id: serial("id").primaryKey(),
  ndlConnectorId: varchar("ndl_connector_id", { length: 256 })
    .notNull()
    .references(() => slackConnectorsTable.connectorId),
  ndlFileId: varchar("ndl_file_id", { length: 256 }).notNull(),
  channelId: varchar("channel_id", { length: 256 }).notNull(),
  originId: varchar("origin_id", { length: 256 }).notNull(),
  url: varchar("url", { length: 2048 }).notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  dataType: varchar("data_type", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdate(() => new Date())
    .notNull(),
});

// Type definitions
export type SlackConnectorInsert = typeof slackConnectorsTable.$inferInsert;
export type SlackConnectorSelect = typeof slackConnectorsTable.$inferSelect;
export type SlackMessageInsert = typeof slackMessagesTable.$inferInsert;
export type SlackMessageSelect = typeof slackMessagesTable.$inferSelect;
export type SlackCanvasInsert = typeof slackCanvasesTable.$inferInsert;
export type SlackCanvasSelect = typeof slackCanvasesTable.$inferSelect;

// Slack channel types
export type SlackChannel = {
  id: string;
  name: string;
  properties?: {
    tabs?: Array<{
      type: string;
      data?: {
        file_id?: string;
      };
    }>;
  };
  canvases?: {
    channelId: string;
    url: string;
    title: string;
    originId: string;
    createdAt: number;
    updatedAt: number;
    dataType: string;
  }[];
};

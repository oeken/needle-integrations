import {
  pgTableCreator,
  serial,
  text,
  timestamp,
  varchar,
  jsonb,
} from "drizzle-orm/pg-core";

export const createTable = pgTableCreator((name) => name);

export interface FileMetadata {
  channelId: string;
  monthStart: string;
  monthEnd: string;
  dataType: string;
}

export interface CanvasFileMetadata {
  channelId: string;
  originId: string;
  url: string;
  title: string;
  dataType: string;
}

export const filesTable = createTable("files", {
  id: serial("id").primaryKey(),
  ndlConnectorId: varchar("ndl_connector_id", { length: 256 }).notNull(),
  ndlFileId: varchar("ndl_file_id", { length: 256 }).notNull(),
  title: varchar("title", { length: 512 }),
  metadata: jsonb("metadata")
    .notNull()
    .$type<FileMetadata | CanvasFileMetadata>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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

// Slack channel types
export type SlackChannel = {
  id: string;
  name: string;
  canvases?: CanvasFileMetadata[];
};

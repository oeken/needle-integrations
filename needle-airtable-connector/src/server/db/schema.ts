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
  tableURL: text("tableURL").notNull(),
  tableName: text("tableName").notNull(),
  // refreshToken: text("refreshToken").notNull(),
  baseId: text("baseId").notNull(),
  tableId: text("tableId").notNull(),
  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});


// export const filesTable = createTable("files", {
//   id: serial("id").primaryKey(),
//   ndlConnectorId: varchar("ndl_connector_id", { length: 256 }).notNull(),
//   ndlFileId: varchar("ndl_file_id", { length: 256 }),
//   url: text("url").notNull(),
//   createdAt: timestamp("created_at")
//     .default(sql`CURRENT_TIMESTAMP`)
//     .notNull(),
// });



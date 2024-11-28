import { db } from "../db";
import {
  type FileInsert,
  filesTable,
  zendeskConnectorsTable,
} from "../db/schema";
import {
  and,
  type DrizzleTypeError,
  eq,
  type ExtractTablesWithRelations,
  inArray,
} from "drizzle-orm";
import { type PgTransaction, type PgQueryResultHKT } from "drizzle-orm/pg-core";
import {
  type FileIdMapping,
  type DiffResult,
  type ZendeskTicket,
  type ZendeskArticle,
  type DbFile,
} from "../zendesk/types";

import type * as Schema from "../db/schema";

export async function getConnectorDetails(connectorId: string) {
  return await db
    .select()
    .from(zendeskConnectorsTable)
    .where(eq(zendeskConnectorsTable.connectorId, connectorId))
    .then((rows) => rows[0]);
}

export async function getCurrentFiles(connectorId: string) {
  return await db
    .select()
    .from(filesTable)
    .where(eq(filesTable.ndlConnectorId, connectorId));
}

export async function handleDatabaseUpdates(
  tx: PgTransaction<
    PgQueryResultHKT,
    typeof Schema,
    ExtractTablesWithRelations<typeof Schema>
  >,
  connectorId: string,
  ticketsDiff: DiffResult,
  articlesDiff: DiffResult,
  fileIdMap: FileIdMapping,
) {
  const createValues: FileInsert[] = [];

  // Handle creates
  for (const ticket of ticketsDiff.create) {
    if ("subject" in ticket) {
      const ticketFileId = fileIdMap.get(`ticket-${ticket.id}`);
      const commentsFileId = fileIdMap.get(`comments-${ticket.id}`);

      if (ticketFileId && commentsFileId) {
        createValues.push(
          createTicketEntry(ticket, connectorId, ticketFileId),
          createCommentsEntry(ticket, connectorId, commentsFileId),
        );
      }
    }
  }

  for (const article of articlesDiff.create) {
    if ("title" in article) {
      const articleFileId = fileIdMap.get(`article-${article.id}`);
      if (articleFileId) {
        createValues.push(
          createArticleEntry(article, connectorId, articleFileId),
        );
      }
    }
  }

  if (createValues.length > 0) {
    await tx.insert(filesTable).values(createValues);
  }

  // Handle updates
  await handleTicketUpdates(
    tx,
    ticketsDiff.update.filter(
      (item): item is ZendeskTicket => "subject" in item,
    ),
  );
  await handleArticleUpdates(
    tx,
    articlesDiff.update.filter(
      (item): item is ZendeskArticle => "title" in item,
    ),
  );

  // Handle deletes
  await handleDeletes(tx, connectorId, ticketsDiff.delete, articlesDiff.delete);
}

function createTicketEntry(
  ticket: ZendeskTicket,
  connectorId: string,
  fileId: string,
): FileInsert {
  return {
    ndlConnectorId: connectorId,
    ndlFileId: fileId,
    originId: ticket.id,
    url: ticket.url,
    title: ticket.subject,
    type: "ticket",
    createdAt: new Date(ticket.created_at),
    updatedAt: new Date(ticket.updated_at),
  };
}

function createCommentsEntry(
  ticket: ZendeskTicket,
  connectorId: string,
  fileId: string,
): FileInsert {
  return {
    ndlConnectorId: connectorId,
    ndlFileId: fileId,
    originId: ticket.id,
    url: ticket.url.replace(".json", "/comments.json"),
    title: `${ticket.subject} - Comments`,
    type: "comments",
    createdAt: new Date(ticket.created_at),
    updatedAt: new Date(ticket.updated_at),
  };
}

function createArticleEntry(
  article: ZendeskArticle,
  connectorId: string,
  fileId: string,
): FileInsert {
  return {
    ndlConnectorId: connectorId,
    ndlFileId: fileId,
    originId: article.id,
    url: article.html_url,
    title: article.title,
    type: "article",
    createdAt: new Date(article.created_at),
    updatedAt: new Date(article.updated_at),
  };
}

async function handleTicketUpdates(
  tx: PgTransaction<
    PgQueryResultHKT,
    typeof Schema,
    ExtractTablesWithRelations<typeof Schema>
  >,
  tickets: ZendeskTicket[],
) {
  for (const ticket of tickets) {
    if ("subject" in ticket) {
      await Promise.all([
        tx
          .update(filesTable)
          .set({
            title: ticket.subject,
            url: ticket.url,
            updatedAt: new Date(ticket.updated_at),
          })
          .where(
            and(
              eq(filesTable.originId, ticket.id),
              eq(filesTable.type, "ticket"),
            ),
          ),
        tx
          .update(filesTable)
          .set({
            title: `${ticket.subject} - Comments`,
            url: ticket.url.replace(".json", "/comments.json"),
            updatedAt: new Date(ticket.updated_at),
          })
          .where(
            and(
              eq(filesTable.originId, ticket.id),
              eq(filesTable.type, "comments"),
            ),
          ),
      ]);
    }
  }
}

async function handleArticleUpdates(
  tx: PgTransaction<
    PgQueryResultHKT,
    typeof Schema,
    ExtractTablesWithRelations<typeof Schema>
  >,
  articles: ZendeskArticle[],
) {
  for (const article of articles) {
    if ("title" in article) {
      await tx
        .update(filesTable)
        .set({
          title: article.title,
          url: article.html_url,
          updatedAt: new Date(article.updated_at),
        })
        .where(
          and(
            eq(filesTable.originId, article.id),
            eq(filesTable.type, "article"),
          ),
        );
    }
  }
}

async function handleDeletes(
  tx: PgTransaction<
    PgQueryResultHKT,
    typeof Schema,
    ExtractTablesWithRelations<typeof Schema>
  >,
  connectorId: string,
  ticketsToDelete: DbFile[],
  articlesToDelete: DbFile[],
) {
  const deleteIds = [
    ...ticketsToDelete.map((t) => t.originId),
    ...articlesToDelete.map((a) => a.originId),
  ];

  if (deleteIds.length > 0) {
    await tx
      .delete(filesTable)
      .where(
        and(
          eq(filesTable.ndlConnectorId, connectorId),
          inArray(filesTable.originId, deleteIds),
        ),
      );
  }
}

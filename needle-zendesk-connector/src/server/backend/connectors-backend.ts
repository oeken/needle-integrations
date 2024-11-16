import type {
  ConnectorRequest,
  CreateConnectorRequest,
} from "~/models/connectors-models";
import {
  createConnector,
  getConnector,
  listConnectors,
  deleteConnector,
  publishConnectorRun,
  createNeedleFileId,
  type Session,
  type ConnectorRunDescriptor,
} from "@needle-ai/needle-sdk";

import { db } from "../db";
import { filesTable } from "../db/schema";
import { eq } from "drizzle-orm";

export async function createZendeskConnector(
  {
    collectionId,
    name,
    credentials,
    selectedTickets,
    selectedArticles,
  }: CreateConnectorRequest,
  session: Session,
) {
  const connector = await createConnector(
    {
      name,
      cronJob: "0 0 * * *",
      cronJobTimezone: "Europe/Berlin",
      collectionIds: [collectionId],
      credentials,
    },
    session.id,
  );

  const filesToInsert = [
    // Add tickets with full metadata
    ...selectedTickets.map((ticket) => ({
      ndlConnectorId: connector.id,
      url: ticket.url,
      type: "ticket",
      title: ticket.subject,
      description: ticket.description,
      status: ticket.status,
      createdAt: new Date(ticket.created_at),
      priority: ticket.priority,
      // id: ticket.id,
      // All available fields from ZendeskTicket
      subject: ticket.subject,
      created_at: ticket.created_at,
    })),
    // Add articles with full metadata
    ...selectedArticles.map((article) => ({
      ndlConnectorId: connector.id,
      url: article.html_url,
      type: "article",
      title: article.title,
      description: article.body,
      createdAt: new Date(article.created_at),
      // id: article.id,
      // All available fields from ZendeskArticle
      html_url: article.html_url,
      body: article.body,
      created_at: article.created_at,
    })),
  ];

  // console.log({ selectedArticles, selectedTickets, filesToInsert });

  await db.insert(filesTable).values(filesToInsert);

  await runZendeskConnector({ connectorId: connector.id });

  return connector;
}

export async function listZendeskConnectors(session: Session) {
  return await listConnectors(session.id);
}

export async function getZendeskConnector(
  { connectorId }: ConnectorRequest,
  session: Session,
) {
  const connector = await getConnector(connectorId, session.id);

  const files = await db
    .select()
    .from(filesTable)
    .where(eq(filesTable.ndlConnectorId, connectorId));

  return { ...connector, files };
}

export async function deleteZendeskConnector(
  { connectorId }: ConnectorRequest,
  session: Session,
) {
  const connector = await deleteConnector(connectorId, session.id);
  await db.delete(filesTable).where(eq(filesTable.ndlConnectorId, connectorId));
  return connector;
}

export async function runZendeskConnector(
  { connectorId }: ConnectorRequest,
  session?: Session,
) {
  // acts as access validation
  if (session) {
    await getConnector(connectorId, session.id);
  }

  const files = await db
    .select()
    .from(filesTable)
    .where(eq(filesTable.ndlConnectorId, connectorId));

  const descriptor: ConnectorRunDescriptor = {
    create: [],
    update: [],
    delete: [],
  };

  // Article html olucak, ticket text/plain
  for (const file of files) {
    if (file.ndlFileId) {
      descriptor.update.push({ id: file.ndlFileId });
    } else {
      descriptor.create.push({
        id: createNeedleFileId(),
        url: file.url,
        type: "text/plain",
      });
    }
  }

  await publishConnectorRun(connectorId, descriptor);
}

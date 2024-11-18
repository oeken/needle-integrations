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
    ...selectedTickets.map((ticket) => ({
      ndlConnectorId: connector.id,
      originId: ticket.id,
      url: ticket.url,
      title: ticket.subject,
      type: "ticket",
      createdAt: new Date(ticket.created_at),
    })),
    ...selectedArticles.map((article) => ({
      ndlConnectorId: connector.id,
      originId: article.id,
      url: article.html_url,
      title: article.title,
      type: "article",
      createdAt: new Date(article.created_at),
    })),
  ];

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

  for (const file of files) {
    if (file.ndlFileId) {
      descriptor.update.push({ id: file.ndlFileId });
    } else {
      descriptor.create.push({
        id: createNeedleFileId(),
        url: file.url,
        type: file.type === "article" ? "text/html" : "text/plain",
      });
    }
  }

  await publishConnectorRun(connectorId, descriptor);
}

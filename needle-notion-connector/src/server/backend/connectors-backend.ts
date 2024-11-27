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
import { eq } from "drizzle-orm";
import { notionConnectorsTable, notionPagesTable } from "../db/schema";

export async function createNotionConnector(
  request: CreateConnectorRequest,
  session: Session,
) {
  const connector = await createConnector(
    {
      name: "Test Connector",
      cronJob: "0 0 * * *",
      cronJobTimezone: "Europe/Berlin",
      collectionIds: [request.collectionId],
      credentials: request.notionToken.access_token,
    },
    session.id,
  );

  const pagesToInsert = request.notionPages.map((p) => ({
    ndlConnectorId: connector.id,
    ndlFileId: createNeedleFileId(),
    notionUrl: p.url,
    notionPageId: p.id,
    notionLastEditedTime: p.last_edited_time,
  }));
  await db.insert(notionPagesTable).values(pagesToInsert);

  const connectorsToInsert = request.notionPages.map((p) => ({
    ndlConnectorId: connector.id,
    notionWorkspaceId: request.notionToken.workspace_id,
    notionWorkspaceName: request.notionToken.workspace_name,
    notionUserId: request.notionToken.owner.user.id,
    notionPageId: p.id,
  }));
  await db.insert(notionConnectorsTable).values(connectorsToInsert);

  await runNotionConnector({ connectorId: connector.id });

  return connector;
}

export async function listNotionConnectors(session: Session) {
  return await listConnectors(session.id);
}

export async function getNotionConnector(
  { connectorId }: ConnectorRequest,
  session: Session,
) {
  const connector = await getConnector(connectorId, session.id);

  const files = await db
    .select()
    .from(notionPagesTable)
    .where(eq(notionPagesTable.ndlConnectorId, connectorId));

  return { ...connector, files };
}

export async function deleteNotionConnector(
  { connectorId }: ConnectorRequest,
  session: Session,
) {
  const connector = await deleteConnector(connectorId, session.id);
  await db
    .delete(notionPagesTable)
    .where(eq(notionPagesTable.ndlConnectorId, connectorId));
  await db
    .delete(notionConnectorsTable)
    .where(eq(notionConnectorsTable.ndlConnectorId, connectorId));
  return connector;
}

export async function runNotionConnector(
  { connectorId }: ConnectorRequest,
  session?: Session,
) {
  // acts as access validation
  if (session) {
    await getConnector(connectorId, session.id);
  }

  const pages = await db
    .select()
    .from(notionPagesTable)
    .where(eq(notionPagesTable.ndlConnectorId, connectorId));

  const descriptor: ConnectorRunDescriptor = {
    create: [],
    update: [],
    delete: [],
  };

  for (const page of pages) {
    if (page.ndlFileId) {
      descriptor.update.push({ id: page.ndlFileId });
    } else {
      descriptor.create.push({
        id: createNeedleFileId(),
        url: page.notionUrl,
        type: "text/plain",
      });
    }
  }

  await publishConnectorRun(connectorId, descriptor);
}

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

export async function createWebConnector(
  { urls, collectionId }: CreateConnectorRequest,
  session: Session,
) {
  const connector = await createConnector(
    {
      name: "Test Connector",
      cronJob: "0 0 * * *",
      cronJobTimezone: "Europe/Berlin",
      collectionIds: [collectionId],
      credentials: "test credentials",
    },
    session.id,
  );

  const filesToInsert = urls.map((url) => ({
    ndlConnectorId: connector.id,
    url,
  }));
  await db.insert(filesTable).values(filesToInsert);

  await runWebConnector({ connectorId: connector.id });

  return connector;
}

export async function listWebConnectors(session: Session) {
  return await listConnectors(session.id);
}

export async function getWebConnector(
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

export async function deleteWebConnector(
  { connectorId }: ConnectorRequest,
  session: Session,
) {
  const connector = await deleteConnector(connectorId, session.id);
  await db.delete(filesTable).where(eq(filesTable.ndlConnectorId, connectorId));
  return connector;
}

export async function runWebConnector(
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

  for (const file of files) {
    if (file.ndlFileId) {
      descriptor.update.push({ id: file.ndlFileId });
    } else {
      descriptor.create.push({
        id: createNeedleFileId(),
        url: file.url,
        type: "text/html",
      });
    }
  }

  await publishConnectorRun(connectorId, descriptor);
}

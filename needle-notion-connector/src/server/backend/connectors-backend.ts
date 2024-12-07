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
import { Client as NotionClient } from "@notionhq/client";
import type {
  DatabaseObjectResponse,
  PageObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";

export async function createNotionConnector(
  request: CreateConnectorRequest,
  session: Session,
) {
  const connector = await createConnector(
    {
      name: request.name,
      cronJob: request.cronJob,
      cronJobTimezone: request.cronJobTimezone,
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
    notionPageTitle: p.title,
    notionObject: p.object,
    notionLastEditedTime: p.last_edited_time,
  }));
  await db.insert(notionPagesTable).values(pagesToInsert);

  const connectorsToInsert = {
    ndlConnectorId: connector.id,
    notionWorkspaceId: request.notionToken.workspace_id,
    notionWorkspaceName: request.notionToken.workspace_name,
    notionUserId: request.notionToken.owner.user.id,
  };
  await db.insert(notionConnectorsTable).values(connectorsToInsert);

  await runNotionConnector({ connectorId: connector.id }, session);

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
  let connector;
  if (session) {
    connector = await getConnector(connectorId, session.id);
  }
  if (!connector?.credentials) {
    throw new Error("notion access token is not found");
  }

  const notion = new NotionClient({ auth: connector.credentials });
  const notionSearchResponse = await notion.search({});
  const notionResults = notionSearchResponse.results as (
    | PageObjectResponse
    | DatabaseObjectResponse
  )[];

  const ndlPages = await db
    .select()
    .from(notionPagesTable)
    .where(eq(notionPagesTable.ndlConnectorId, connectorId));

  const pagesToCreate = notionResults.filter((r) => {
    const ndlPage = ndlPages.find((p) => p.notionPageId === r.id);
    return ndlPage === undefined;
  });

  const pagesToUpdate = notionResults.reduce(
    (acc, r) => {
      const ndlPage = ndlPages.find((p) => p.notionPageId === r.id);
      if (!ndlPage) {
        return acc;
      }
      if (ndlPage.notionLastEditedTime === r.last_edited_time) {
        return acc;
      }
      acc.push(ndlPage);
      return acc;
    },
    [] as typeof ndlPages,
  );

  const pagesToDelete = ndlPages.filter((p) => {
    const page = notionResults.find((r) => r.id === p.notionPageId);
    return page === undefined;
  });

  const descriptor: ConnectorRunDescriptor = {
    create: pagesToCreate.map((p) => ({
      id: createNeedleFileId(),
      url: p.url,
      type: "text/plain",
    })),
    update: pagesToUpdate.map((p) => ({ id: p.ndlFileId })),
    delete: pagesToDelete.map((p) => ({ id: p.ndlFileId })),
  };

  await publishConnectorRun(connectorId, descriptor);
}

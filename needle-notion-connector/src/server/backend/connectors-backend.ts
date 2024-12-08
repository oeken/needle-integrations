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
import { eq, inArray } from "drizzle-orm";
import { notionConnectorsTable, notionPagesTable } from "../db/schema";
import { isFullPageOrDatabase, Client as NotionClient } from "@notionhq/client";
import { getDescriptorDiff } from "./connector-utils";
import { getPageTitle } from "~/utils/notion-utils";

export async function createNotionConnector(
  request: CreateConnectorRequest,
  session: Session,
) {
  const connector = await createConnector(
    {
      name: request.name,
      cronJob: request.cronJob,
      cronJobTimezone: request.cronJobTimezone,
      collectionIds: request.collectionIds,
      credentials: request.notionToken.access_token,
    },
    session.id,
  );

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

  const workspaces = await db
    .select()
    .from(notionConnectorsTable)
    .where(eq(notionConnectorsTable.ndlConnectorId, connectorId));

  return {
    ...connector,
    files,
    workspaces: workspaces.map((w) => ({
      id: w.id,
      name: w.notionWorkspaceName,
      userId: w.notionUserId,
    })),
  };
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
  if (!session) {
    return;
  }

  const connector = await getConnector(connectorId, session.id);
  if (!connector?.credentials) {
    throw new Error("notion access token is not found");
  }

  const notion = new NotionClient({ auth: connector.credentials });
  const notionSearchResponse = await notion.search({});
  const livePages = notionSearchResponse.results.filter(isFullPageOrDatabase);

  const currentPages = await db
    .select()
    .from(notionPagesTable)
    .where(eq(notionPagesTable.ndlConnectorId, connectorId));

  const diff = getDescriptorDiff(currentPages, livePages);

  await db.transaction(async (tx) => {
    if (diff.pagesToCreate.length > 0) {
      const valuesToCreate = diff.pagesToCreate.map((p) => ({
        ndlConnectorId: connector.id,
        ndlFileId: createNeedleFileId(),
        notionUrl: p.url,
        notionPageId: p.id,
        notionPageTitle: getPageTitle(p),
        notionObject: p.object,
        notionLastEditedTime: p.last_edited_time,
      }));

      await tx.insert(notionPagesTable).values(valuesToCreate);
    }

    if (diff.pagesToUpdate.length > 0) {
      for (const page of diff.pagesToUpdate) {
        const valuesToUpdate = {
          notionUrl: page.url,
          notionPageId: page.id,
          notionPageTitle: getPageTitle(page),
          notionObject: page.object,
          notionLastEditedTime: page.last_edited_time,
        };

        await tx
          .update(notionPagesTable)
          .set(valuesToUpdate)
          .where(eq(notionPagesTable.notionPageId, page.id));
      }
    }

    if (diff.pagesToDelete.length > 0) {
      const valuesToDelete = diff.pagesToDelete.map((p) => p.notionPageId);

      await tx
        .delete(notionPagesTable)
        .where(inArray(notionPagesTable.notionPageId, valuesToDelete));
    }
  });

  const descriptor: ConnectorRunDescriptor = {
    create: diff.pagesToCreate.map((p) => ({
      id: createNeedleFileId(),
      url: p.url,
      type: "text/plain",
    })),
    update: diff.pagesToUpdate.map((p) => ({ id: p.ndlFileId })),
    delete: diff.pagesToDelete.map((p) => ({ id: p.ndlFileId })),
  };

  await publishConnectorRun(connectorId, descriptor);
}

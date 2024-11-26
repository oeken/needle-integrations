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
import { filesTable, zendeskConnectorsTable } from "../db/schema";
import { eq } from "drizzle-orm";
import { createZendeskService } from "../zendesk/service";
import {
  getConnectorDetails,
  getCurrentFiles,
  handleDatabaseUpdates,
} from "./zendesk-db";
import { computeDiff } from "./diff-utils";

export async function createZendeskConnector(
  params: CreateConnectorRequest,
  session: Session,
) {
  const connector = await createConnector(
    {
      name: params.name,
      cronJob: params.cronJob,
      cronJobTimezone: params.cronJobTimezone,
      collectionIds: [params.collectionId],
      credentials: params.credentials,
    },
    session.id,
  );

  await db.insert(zendeskConnectorsTable).values({
    connectorId: connector.id,
    subdomain: params.subdomain,
    orgId: params.organizationId,
    includeTickets: params.selectedTickets.length > 0,
    includeArticles: params.selectedArticles.length > 0,
  });

  await runZendeskConnector({ connectorId: connector.id }, session);

  return connector;
}

export async function runZendeskConnector(
  { connectorId }: { connectorId: string },
  session?: Session,
) {
  let accessToken = "";
  if (session) {
    const { credentials } = await getConnector(connectorId, session.id);
    accessToken = credentials ?? "";
  }

  const connectorDetails = await getConnectorDetails(connectorId);
  if (!connectorDetails) {
    throw new Error(`No Zendesk connector found for ID: ${connectorId}`);
  }

  const currentFiles = await getCurrentFiles(connectorId);
  const currentTickets = currentFiles.filter(
    (f) => f.type === "ticket" || f.type === "comments",
  );
  const currentArticles = currentFiles.filter((f) => f.type === "article");

  const zendeskService = createZendeskService(
    accessToken,
    connectorDetails.subdomain,
  );
  const { tickets: liveTickets, articles: liveArticles } =
    await zendeskService.searchByOrganization(
      connectorDetails.orgId.toString(),
      {
        fetchTickets: connectorDetails.includeTickets,
        fetchArticles: connectorDetails.includeArticles,
      },
    );

  const ticketsDiff = liveTickets
    ? computeDiff(currentTickets, liveTickets.items)
    : { create: [], update: [], delete: currentTickets };
  const articlesDiff = liveArticles
    ? computeDiff(currentArticles, liveArticles.items)
    : { create: [], update: [], delete: currentArticles };

  const descriptor: ConnectorRunDescriptor = {
    create: [],
    update: [],
    delete: [],
  };
  const fileIdMap = new Map<string, string>();

  const createItems = [
    ...ticketsDiff.create.map((item) => ({ type: "ticket", data: item })),
    ...articlesDiff.create.map((item) => ({ type: "article", data: item })),
  ];

  for (const { type, data } of createItems) {
    if (type === "ticket" && "subject" in data) {
      const ticketFileId = createNeedleFileId();
      const commentsFileId = createNeedleFileId();
      fileIdMap.set(`ticket-${data.id}`, ticketFileId);
      fileIdMap.set(`comments-${data.id}`, commentsFileId);

      descriptor.create.push(
        {
          id: ticketFileId,
          url: data.url,
          type: "text/plain",
        },
        {
          id: commentsFileId,
          url: data.url.replace(".json", "/comments.json"),
          type: "text/plain",
        },
      );
    } else if (type === "article" && "title" in data) {
      const articleFileId = createNeedleFileId();
      fileIdMap.set(`article-${data.id}`, articleFileId);

      descriptor.create.push({
        id: articleFileId,
        url: data.html_url,
        type: "text/html",
      });
    }
  }

  for (const item of [...ticketsDiff.update, ...articlesDiff.update]) {
    const dbFiles = currentFiles.filter((f) => f.originId === item.id);
    for (const dbFile of dbFiles) {
      if (dbFile.ndlFileId) {
        descriptor.update.push({ id: dbFile.ndlFileId });
        // Maintain fileIdMap for updates
        fileIdMap.set(`${dbFile.type}-${item.id}`, dbFile.ndlFileId);
      }
    }
  }

  const filesToDelete = currentFiles.filter((file) =>
    file.type === "ticket" || file.type === "comments"
      ? ticketsDiff.delete.some((t) => t.originId === file.originId)
      : articlesDiff.delete.some((a) => a.originId === file.originId),
  );

  filesToDelete
    .filter(
      (file): file is typeof file & { ndlFileId: string } =>
        file.ndlFileId !== null,
    )
    .forEach((file) => descriptor.delete.push({ id: file.ndlFileId }));

  await publishConnectorRun(connectorId, descriptor);

  await db.transaction(async (tx) => {
    await handleDatabaseUpdates(
      tx,
      connectorId,
      ticketsDiff,
      articlesDiff,
      fileIdMap,
    );
  });
}

export async function listZendeskConnectors(session: Session) {
  return await listConnectors(session.id);
}

export async function getZendeskConnector(
  { connectorId }: ConnectorRequest,
  session: Session,
) {
  const connector = await getConnector(connectorId, session.id);

  const [zendeskMetadata] = await db
    .select()
    .from(zendeskConnectorsTable)
    .where(eq(zendeskConnectorsTable.connectorId, connectorId));

  const files = await db
    .select()
    .from(filesTable)
    .where(eq(filesTable.ndlConnectorId, connectorId));

  return {
    ...connector,
    files,
    subdomain: zendeskMetadata?.subdomain,
    organizationId: zendeskMetadata?.orgId,
    includeTickets: zendeskMetadata?.includeTickets,
    includeArticles: zendeskMetadata?.includeArticles,
  };
}

export async function deleteZendeskConnector(
  { connectorId }: ConnectorRequest,
  session: Session,
) {
  const connector = await deleteConnector(connectorId, session.id);

  await db.transaction(async (tx) => {
    await tx
      .delete(filesTable)
      .where(eq(filesTable.ndlConnectorId, connectorId));
    await tx
      .delete(zendeskConnectorsTable)
      .where(eq(zendeskConnectorsTable.connectorId, connectorId));
  });

  return connector;
}

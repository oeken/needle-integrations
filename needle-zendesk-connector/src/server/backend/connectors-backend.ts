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
import { type DbFile } from "../zendesk/types";
import { computeDiff } from "./diff-utils";

export async function createZendeskConnector(
  params: CreateConnectorRequest,
  session: Session,
) {
  const connector = await createConnector(
    {
      name: params.name,
      cronJob: "0 0 * * *",
      cronJobTimezone: "Europe/Berlin",
      collectionIds: [params.collectionId],
      credentials: params.credentials,
    },
    session.id,
  );

  const descriptor: ConnectorRunDescriptor = {
    create: [],
    update: [],
    delete: [],
  };
  const fileIdMap = new Map<string, string>();

  // Process tickets
  for (const ticket of params.selectedTickets) {
    const ticketFileId = createNeedleFileId();
    const commentsFileId = createNeedleFileId();

    fileIdMap.set(`ticket-${ticket.id}`, ticketFileId);
    fileIdMap.set(`comments-${ticket.id}`, commentsFileId);

    descriptor.create.push(
      {
        id: ticketFileId,
        url: ticket.url,
        type: "text/plain",
      },
      {
        id: commentsFileId,
        url: ticket.url.replace(".json", "/comments.json"),
        type: "text/plain",
      },
    );
  }

  // Process articles
  for (const article of params.selectedArticles) {
    const articleFileId = createNeedleFileId();
    fileIdMap.set(`article-${article.id}`, articleFileId);

    descriptor.create.push({
      id: articleFileId,
      url: article.html_url,
      type: "text/html",
    });
  }

  await db.transaction(async (tx) => {
    await tx.insert(zendeskConnectorsTable).values({
      connectorId: connector.id,
      subdomain: params.subdomain,
      orgId: params.organizationId,
      includeTickets: params.selectedTickets.length > 0,
      includeArticles: params.selectedArticles.length > 0,
    });

    await handleDatabaseUpdates(
      tx,
      connector.id,
      { create: params.selectedTickets, update: [], delete: [] },
      { create: params.selectedArticles, update: [], delete: [] },
      fileIdMap,
    );
  });

  await publishConnectorRun(connector.id, descriptor);
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
  ) as DbFile[];
  const currentArticles = currentFiles.filter(
    (f) => f.type === "article",
  ) as DbFile[];

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

  // Process creates
  for (const ticket of ticketsDiff.create) {
    if ("subject" in ticket) {
      const ticketFileId = createNeedleFileId();
      const commentsFileId = createNeedleFileId();
      fileIdMap.set(`ticket-${ticket.id}`, ticketFileId);
      fileIdMap.set(`comments-${ticket.id}`, commentsFileId);

      descriptor.create.push(
        {
          id: ticketFileId,
          url: ticket.url,
          type: "text/plain",
        },
        {
          id: commentsFileId,
          url: ticket.url.replace(".json", "/comments.json"),
          type: "text/plain",
        },
      );
    }
  }

  for (const article of articlesDiff.create) {
    if ("title" in article) {
      const articleFileId = createNeedleFileId();
      fileIdMap.set(`article-${article.id}`, articleFileId);

      descriptor.create.push({
        id: articleFileId,
        url: article.html_url,
        type: "text/html",
      });
    }
  }

  // Process updates
  for (const item of [...ticketsDiff.update, ...articlesDiff.update]) {
    const dbFiles = currentFiles.filter((f) => f.originId === item.id);
    for (const dbFile of dbFiles) {
      if (dbFile.ndlFileId) {
        descriptor.update.push({ id: dbFile.ndlFileId });
      }
    }
  }

  // Process deletes
  const filesToDelete = currentFiles.filter((file) =>
    file.type === "ticket" || file.type === "comments"
      ? ticketsDiff.delete.some((t) => t.originId === file.originId)
      : articlesDiff.delete.some((a) => a.originId === file.originId),
  );

  for (const file of filesToDelete) {
    if (file.ndlFileId) {
      descriptor.delete.push({ id: file.ndlFileId });
    }
  }

  try {
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
  } catch (error) {
    console.error("Failed to process connector run:", error);
    throw error;
  }
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

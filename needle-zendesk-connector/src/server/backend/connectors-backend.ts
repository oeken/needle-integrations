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
import { and, eq, inArray } from "drizzle-orm";
import { createZendeskService } from "../zendesk/service";
import { type ZendeskArticle, type ZendeskTicket } from "../zendesk/types";

// Define types for diffing
type DbFile = {
  id: number;
  ndlConnectorId: string;
  ndlFileId: string | null;
  originId: number;
  url: string;
  title: string;
  type: "ticket" | "article";
  createdAt: Date;
};

// Modify computeDiff to handle both DB and Zendesk types
function computeDiff(
  current: DbFile[],
  live: (ZendeskTicket | ZendeskArticle)[],
) {
  const currentMap = new Map(current.map((item) => [item.originId, item]));
  const liveMap = new Map(live.map((item) => [item.id, item]));

  const create: (ZendeskTicket | ZendeskArticle)[] = [];
  const update: (ZendeskTicket | ZendeskArticle)[] = [];
  const delete_: DbFile[] = [];

  // Find items to create
  for (const item of live) {
    if (!currentMap.has(item.id)) {
      create.push(item);
    }
  }

  // Find items to update or delete
  for (const item of current) {
    if (!liveMap.has(item.originId)) {
      delete_.push(item);
    } else {
      const liveItem = liveMap.get(item.originId)!;
      const currentTitle = item.title;
      const liveTitle =
        "subject" in liveItem ? liveItem.subject : liveItem.title;

      if (currentTitle !== liveTitle) {
        update.push(liveItem);
      }
    }
  }

  return { create, update, delete: delete_ };
}

// Type for database insertion
type FileInsert = {
  ndlConnectorId: string;
  originId: number;
  url: string;
  title: string;
  type: "ticket" | "article";
  createdAt: Date;
  organizationId: number;
};

export async function createZendeskConnector(
  {
    collectionId,
    name,
    credentials,
    selectedTickets,
    selectedArticles,
    organizationId,
    subdomain,
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

  const filesToInsert: FileInsert[] = [
    ...selectedTickets.map((ticket) => ({
      ndlConnectorId: connector.id,
      originId: ticket.id,
      url: ticket.url,
      title: ticket.subject,
      type: "ticket" as const,
      createdAt: new Date(ticket.created_at),
      organizationId,
    })),
    ...selectedArticles.map((article) => ({
      ndlConnectorId: connector.id,
      originId: article.id,
      url: article.html_url,
      title: article.title,
      type: "article" as const,
      createdAt: new Date(article.created_at),
      organizationId,
    })),
  ];

  // Wrap all DB operations in a transaction
  await db.transaction(async (tx) => {
    // Insert connector details into zendeskConnectorsTable
    await tx.insert(zendeskConnectorsTable).values({
      connectorId: connector.id,
      subdomain,
      orgId: organizationId,
    });

    // Insert files
    await tx.insert(filesTable).values(filesToInsert);
  });

  await runZendeskConnector(
    {
      connectorId: connector.id,
    },
    session,
  );

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
  { connectorId }: { connectorId: string },
  session?: Session,
) {
  // Get credentials if session exists
  let accessToken = "";

  if (session) {
    const { credentials } = await getConnector(connectorId, session.id);
    accessToken = credentials ?? "";
  }

  // Get connector details from zendeskConnectorsTable
  const connectorDetails = await db
    .select()
    .from(zendeskConnectorsTable)
    .where(eq(zendeskConnectorsTable.connectorId, connectorId))
    .then((rows) => rows[0]);

  if (!connectorDetails) {
    throw new Error(`No Zendesk connector found for ID: ${connectorId}`);
  }

  const { orgId: organizationId, subdomain } = connectorDetails;

  console.log({ organizationId, accessToken, subdomain });

  // Rest of the function remains the same...
  const currentFiles = await db
    .select()
    .from(filesTable)
    .where(eq(filesTable.ndlConnectorId, connectorId));

  const currentTickets = currentFiles.filter(
    (f) => f.type === "ticket",
  ) as DbFile[];
  const currentArticles = currentFiles.filter(
    (f) => f.type === "article",
  ) as DbFile[];

  // 2. Get live data from Zendesk
  const zendeskService = createZendeskService(accessToken, subdomain);
  const { tickets: liveTickets, articles: liveArticles } =
    await zendeskService.searchByOrganization(organizationId.toString());

  // 3. Compute diffs
  const ticketsDiff = liveTickets
    ? computeDiff(currentTickets, liveTickets.items)
    : { create: [], update: [], delete: currentTickets };

  const articlesDiff = liveArticles
    ? computeDiff(currentArticles, liveArticles.items)
    : { create: [], update: [], delete: currentArticles };

  // 4. Execute database operations
  // 4a. Create new entries
  if (ticketsDiff.create.length || articlesDiff.create.length) {
    await db.insert(filesTable).values([
      ...ticketsDiff.create.map((ticket) => ({
        ndlConnectorId: connectorId,
        originId: (ticket as ZendeskTicket).id,
        url: (ticket as ZendeskTicket).url,
        title: (ticket as ZendeskTicket).subject,
        type: "ticket" as const,
        createdAt: new Date((ticket as ZendeskTicket).created_at),
        organizationId,
      })),
      ...articlesDiff.create.map((article) => ({
        ndlConnectorId: connectorId,
        originId: (article as ZendeskArticle).id,
        url: (article as ZendeskArticle).html_url,
        title: (article as ZendeskArticle).title,
        type: "article" as const,
        createdAt: new Date((article as ZendeskArticle).created_at),
        organizationId,
      })),
    ]);
  }

  // 4b. Update changed entries
  for (const ticket of ticketsDiff.update) {
    if ("subject" in ticket) {
      await db
        .update(filesTable)
        .set({
          title: ticket.subject,
          url: ticket.url,
        })
        .where(eq(filesTable.originId, ticket.id));
    }
  }

  for (const article of articlesDiff.update) {
    if ("title" in article) {
      await db
        .update(filesTable)
        .set({
          title: article.title,
          url: article.html_url,
        })
        .where(eq(filesTable.originId, article.id));
    }
  }

  // 4c. Delete removed entries
  const deleteIds = [
    ...ticketsDiff.delete.map((t) => t.originId),
    ...articlesDiff.delete.map((a) => a.originId),
  ];

  if (deleteIds.length > 0) {
    await db
      .delete(filesTable)
      .where(
        and(
          eq(filesTable.ndlConnectorId, connectorId),
          inArray(filesTable.originId, deleteIds),
        ),
      );
  }

  // 5. Send RunDescriptor to Needle
  const descriptor: ConnectorRunDescriptor = {
    create: [],
    update: [],
    delete: [],
  };

  // Add new files
  for (const file of [...ticketsDiff.create, ...articlesDiff.create]) {
    descriptor.create.push({
      id: createNeedleFileId(),
      url: "subject" in file ? file.url : file.html_url,
      type: "subject" in file ? "text/plain" : "text/html",
    });
  }

  // Add updated files
  for (const file of [...ticketsDiff.update, ...articlesDiff.update]) {
    const dbFile = currentFiles.find((f) => f.originId === file.id);
    if (dbFile?.ndlFileId) {
      descriptor.update.push({ id: dbFile.ndlFileId });
    }
  }

  // Add deleted files
  for (const file of ticketsDiff.delete.concat(articlesDiff.delete)) {
    if (file.ndlFileId) {
      descriptor.delete.push({ id: file.ndlFileId });
    }
  }

  await publishConnectorRun(connectorId, descriptor);
}

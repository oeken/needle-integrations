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
  type: "ticket" | "article" | "comments"; // Add "comments" type
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
  type: "ticket" | "article" | "comments";
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
    // For each ticket, create two entries: ticket and comments
    ...selectedTickets.flatMap((ticket) => [
      {
        ndlConnectorId: connector.id,
        ndlFileId: createNeedleFileId(),
        originId: ticket.id,
        url: ticket.url,
        title: ticket.subject,
        type: "ticket" as const,
        createdAt: new Date(ticket.created_at),
        organizationId,
      },
      {
        ndlConnectorId: connector.id,
        ndlFileId: createNeedleFileId(),
        originId: ticket.id,
        url: ticket.url.replace(".json", "/comments.json"),
        title: `${ticket.subject} - Comments`,
        type: "comments" as const,
        createdAt: new Date(ticket.created_at),
        organizationId,
      },
    ]),
    // Articles remain unchanged
    ...selectedArticles.map((article) => ({
      ndlConnectorId: connector.id,
      ndlFileId: createNeedleFileId(),
      originId: article.id,
      url: article.html_url,
      title: article.title,
      type: "article" as const,
      createdAt: new Date(article.created_at),
      organizationId,
    })),
  ];

  console.log({ filesToInsert });

  // Wrap all DB operations in a transaction
  await db.transaction(async (tx) => {
    // Insert connector details into zendeskConnectorsTable
    await tx.insert(zendeskConnectorsTable).values({
      connectorId: connector.id,
      subdomain,
      orgId: organizationId,
      includeTickets: selectedTickets.length > 0,
      includeArticles: selectedArticles.length > 0,
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
  console.log("Starting runZendeskConnector with connectorId:", connectorId);

  // Get credentials if session exists
  let accessToken = "";

  if (session) {
    console.log("Session found, getting credentials");
    const { credentials } = await getConnector(connectorId, session.id);
    accessToken = credentials ?? "";
    console.log("Got access token:", accessToken ? "Present" : "Missing");
  }

  // Get connector details from zendeskConnectorsTable
  console.log("Fetching connector details from DB");
  const connectorDetails = await db
    .select()
    .from(zendeskConnectorsTable)
    .where(eq(zendeskConnectorsTable.connectorId, connectorId))
    .then((rows) => rows[0]);

  if (!connectorDetails) {
    console.error(`No Zendesk connector found for ID: ${connectorId}`);
    throw new Error(`No Zendesk connector found for ID: ${connectorId}`);
  }

  const {
    orgId: organizationId,
    subdomain,
    includeTickets,
    includeArticles,
  } = connectorDetails;
  console.log("Found connector details:", { organizationId, subdomain });
  console.log("Using access token:", accessToken ? "Present" : "Missing");

  // Rest of the function remains the same...
  console.log("Fetching current files from DB");
  const currentFiles = await db
    .select()
    .from(filesTable)
    .where(eq(filesTable.ndlConnectorId, connectorId));

  const currentTickets = currentFiles.filter(
    (f) => f.type === "ticket" || f.type === "comments",
  ) as DbFile[];
  const currentArticles = currentFiles.filter(
    (f) => f.type === "article",
  ) as DbFile[];
  console.log("Current files count:", {
    tickets: currentTickets.length,
    articles: currentArticles.length,
  });

  // 2. Get live data from Zendesk
  console.log("Creating Zendesk service and fetching live data");
  const zendeskService = createZendeskService(accessToken, subdomain);
  const { tickets: liveTickets, articles: liveArticles } =
    await zendeskService.searchByOrganization(organizationId.toString(), {
      fetchTickets: includeTickets,
      fetchArticles: includeArticles,
    });
  console.log("Live data count:", {
    tickets: liveTickets?.items.length ?? 0,
    articles: liveArticles?.items.length ?? 0,
  });

  // 3. Compute diffs
  console.log("Computing diffs");
  const ticketsDiff = liveTickets
    ? computeDiff(currentTickets, liveTickets.items)
    : { create: [], update: [], delete: currentTickets };

  const articlesDiff = liveArticles
    ? computeDiff(currentArticles, liveArticles.items)
    : { create: [], update: [], delete: currentArticles };

  console.log("Diff results:", {
    tickets: {
      create: ticketsDiff.create.length,
      update: ticketsDiff.update.length,
      delete: ticketsDiff.delete.length,
    },
    articles: {
      create: articlesDiff.create.length,
      update: articlesDiff.update.length,
      delete: articlesDiff.delete.length,
    },
  });

  // 4. Execute database operations
  // 4a. Create new entries
  if (ticketsDiff.create.length || articlesDiff.create.length) {
    console.log("Creating new entries in DB");
    await db.insert(filesTable).values([
      // For each new ticket, create both ticket and comments entries
      ...ticketsDiff.create.flatMap((ticket) => [
        {
          ndlConnectorId: connectorId,
          ndlFileId: createNeedleFileId(),
          originId: (ticket as ZendeskTicket).id,
          url: (ticket as ZendeskTicket).url,
          title: (ticket as ZendeskTicket).subject,
          type: "ticket" as const,
          createdAt: new Date((ticket as ZendeskTicket).created_at),
          organizationId,
        },
        {
          ndlConnectorId: connectorId,
          ndlFileId: createNeedleFileId(),
          originId: (ticket as ZendeskTicket).id,
          url: (ticket as ZendeskTicket).url.replace(".json", "/comments.json"),
          title: `${(ticket as ZendeskTicket).subject} - Comments`,
          type: "comments" as const,
          createdAt: new Date((ticket as ZendeskTicket).created_at),
          organizationId,
        },
      ]),
      // Articles remain unchanged
      ...articlesDiff.create.map((article) => ({
        ndlConnectorId: connectorId,
        ndlFileId: createNeedleFileId(),
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
  console.log("Updating changed entries");
  for (const ticket of ticketsDiff.update) {
    if ("subject" in ticket) {
      // Wrap both updates in a transaction
      await db.transaction(async (tx) => {
        // Update ticket entry
        await tx
          .update(filesTable)
          .set({
            title: ticket.subject,
            url: ticket.url,
          })
          .where(
            and(
              eq(filesTable.originId, ticket.id),
              eq(filesTable.type, "ticket"),
            ),
          );

        // Update comments entry
        await tx
          .update(filesTable)
          .set({
            title: `${ticket.subject} - Comments`,
            url: ticket.url.replace(".json", "/comments.json"),
          })
          .where(
            and(
              eq(filesTable.originId, ticket.id),
              eq(filesTable.type, "comments"),
            ),
          );
      });
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
    console.log(`Deleting ${deleteIds.length} entries`);
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
  console.log("Preparing connector run descriptor");
  const descriptor: ConnectorRunDescriptor = {
    create: [],
    update: [],
    delete: [],
  };

  // 5. Update descriptor creation
  for (const file of [...ticketsDiff.create, ...articlesDiff.create]) {
    if ("subject" in file) {
      // For tickets, create two entries
      descriptor.create.push(
        {
          id: createNeedleFileId(),
          url: file.url,
          type: "text/plain",
        },
        {
          id: createNeedleFileId(),
          url: file.url.replace(".json", "/comments.json"),
          type: "text/plain",
        },
      );
    } else {
      // For articles, create one entry
      descriptor.create.push({
        id: createNeedleFileId(),
        url: file.html_url,
        type: "text/html",
      });
    }
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

  console.log("Final descriptor:", {
    create: descriptor.create.length,
    update: descriptor.update.length,
    delete: descriptor.delete.length,
  });

  console.log("Publishing connector run");
  await publishConnectorRun(connectorId, descriptor);
  console.log("Connector run completed successfully");
}

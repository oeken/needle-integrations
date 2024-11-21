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

import { type FileInsert } from "../db/schema";

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
  updatedAt: Date; // Add this field
};

// Modify computeDiff to handle both DB and Zendesk types
function computeDiff(
  current: DbFile[],
  live: (ZendeskTicket | ZendeskArticle)[],
) {
  console.log("Starting computeDiff with:", {
    currentCount: current.length,
    liveCount: live.length,
  });

  // Separate maps for tickets and articles
  const currentTickets = new Map(
    current
      .filter((item) => item.type === "ticket" || item.type === "comments") // 🔴 Changed: include comments
      .map((item) => [item.originId, item]),
  );

  const currentArticles = new Map(
    current
      .filter((item) => item.type === "article")
      .map((item) => [item.originId, item]),
  );

  // Track processed IDs to avoid deleting updated items
  const processedIds = new Set<number>();

  const create: (ZendeskTicket | ZendeskArticle)[] = [];
  const update: (ZendeskTicket | ZendeskArticle)[] = [];
  const delete_: DbFile[] = [];

  // Find items to create or update
  for (const item of live) {
    if ("subject" in item) {
      // It's a ticket
      const currentTicket = currentTickets.get(item.id);
      console.log(`Processing ticket ${item.id}:`, {
        exists: !!currentTicket,
        updatedAt: item.updated_at,
        currentUpdatedAt: currentTicket?.updatedAt,
      });

      if (!currentTicket) {
        create.push(item);
      } else if (
        new Date(item.updated_at) > new Date(currentTicket.updatedAt)
      ) {
        update.push(item);
      }
      processedIds.add(item.id);
    } else {
      // It's an article
      const currentArticle = currentArticles.get(item.id);
      if (!currentArticle) {
        create.push(item);
      } else if (
        new Date(item.updated_at) > new Date(currentArticle.updatedAt)
      ) {
        update.push(item);
      }
      processedIds.add(item.id);
    }
  }

  // Find items to delete - but exclude processed IDs
  for (const item of current) {
    if (!processedIds.has(item.originId)) {
      console.log(`Marking for deletion:`, {
        id: item.originId,
        type: item.type,
        wasProcessed: processedIds.has(item.originId),
      });
      delete_.push(item);
    }
  }

  console.log("Diff results:", {
    create: create.length,
    update: update.length,
    delete: delete_.length,
    processedIds: Array.from(processedIds),
  });

  return { create, update, delete: delete_ };
}

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
  console.log("Starting createZendeskConnector with params:", {
    collectionId,
    name,
    selectedTickets: selectedTickets.length,
    selectedArticles: selectedArticles.length,
    organizationId,
    subdomain,
  });

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
  console.log("Created connector:", connector.id);

  // Create initial descriptor
  const descriptor: ConnectorRunDescriptor = {
    create: [],
    update: [],
    delete: [],
  };

  const filesToInsert: FileInsert[] = [];

  // Process tickets with proper type assertions
  console.log(`Processing ${selectedTickets.length} tickets`);
  for (const ticket of selectedTickets) {
    const typedTicket = ticket as ZendeskTicket;
    const ticketNdlFileId = createNeedleFileId();
    const commentsNdlFileId = createNeedleFileId();

    console.log(`Processing ticket ${typedTicket.id}:`, {
      subject: typedTicket.subject,
      url: typedTicket.url,
    });

    // Add to descriptor
    descriptor.create.push(
      {
        id: ticketNdlFileId,
        url: typedTicket.url,
        type: "text/plain",
      },
      {
        id: commentsNdlFileId,
        url: typedTicket.url.replace(".json", "/comments.json"),
        type: "text/plain",
      },
    );

    // Add to database inserts
    filesToInsert.push(
      {
        ndlConnectorId: connector.id,
        ndlFileId: ticketNdlFileId,
        originId: typedTicket.id,
        url: typedTicket.url,
        title: typedTicket.subject,
        type: "ticket" as const,
        createdAt: new Date(typedTicket.created_at),
        updatedAt: new Date(typedTicket.updated_at),
      },
      {
        ndlConnectorId: connector.id,
        ndlFileId: commentsNdlFileId,
        originId: typedTicket.id,
        url: typedTicket.url.replace(".json", "/comments.json"),
        title: `${typedTicket.subject} - Comments`,
        type: "comments" as const,
        createdAt: new Date(typedTicket.created_at),
        updatedAt: new Date(typedTicket.updated_at),
      },
    );
  }

  // Process articles with proper type assertions
  console.log(`Processing ${selectedArticles.length} articles`);
  for (const article of selectedArticles) {
    const typedArticle = article as ZendeskArticle;
    const articleNdlFileId = createNeedleFileId();

    console.log(`Processing article ${typedArticle.id}:`, {
      title: typedArticle.title,
      url: typedArticle.html_url,
    });

    // Add to descriptor
    descriptor.create.push({
      id: articleNdlFileId,
      url: typedArticle.html_url,
      type: "text/html",
    });

    // Add to database inserts
    filesToInsert.push({
      ndlConnectorId: connector.id,
      ndlFileId: articleNdlFileId,
      originId: typedArticle.id,
      url: typedArticle.html_url,
      title: typedArticle.title,
      type: "article" as const,
      createdAt: new Date(typedArticle.created_at),
      updatedAt: new Date(typedArticle.updated_at),
    });
  }

  console.log("Starting database transaction");
  console.log("Files to insert:", filesToInsert.length);

  // Wrap all DB operations in a transaction
  await db.transaction(async (tx) => {
    await tx.insert(zendeskConnectorsTable).values({
      connectorId: connector.id,
      subdomain,
      orgId: organizationId,
      includeTickets: selectedTickets.length > 0,
      includeArticles: selectedArticles.length > 0,
    });

    await tx.insert(filesTable).values(filesToInsert);
  });
  console.log("Database transaction completed");
  console.log("Descriptor details: ", descriptor);

  // Publish the initial descriptor
  console.log("Publishing connector run with descriptor:", {
    create: descriptor.create.length,
    update: descriptor.update.length,
    delete: descriptor.delete.length,
  });
  await publishConnectorRun(connector.id, descriptor);
  console.log("Connector run published successfully");

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

  // 1. Get credentials and connector details
  let accessToken = "";
  if (session) {
    console.log("Getting connector credentials for session:", session.id);
    const { credentials } = await getConnector(connectorId, session.id);
    accessToken = credentials ?? "";
    console.log("Retrieved access token:", accessToken ? "Present" : "Empty");
  }

  console.log("Fetching connector details from database");
  const connectorDetails = await db
    .select()
    .from(zendeskConnectorsTable)
    .where(eq(zendeskConnectorsTable.connectorId, connectorId))
    .then((rows) => rows[0]);

  if (!connectorDetails) {
    console.error("No connector details found for ID:", connectorId);
    throw new Error(`No Zendesk connector found for ID: ${connectorId}`);
  }

  console.log("Found connector details:", {
    orgId: connectorDetails.orgId,
    subdomain: connectorDetails.subdomain,
    includeTickets: connectorDetails.includeTickets,
    includeArticles: connectorDetails.includeArticles,
  });

  const {
    orgId: organizationId,
    subdomain,
    includeTickets,
    includeArticles,
  } = connectorDetails;

  // 2. Get current state from DB
  console.log("Fetching current files from database");
  const currentFiles = await db
    .select()
    .from(filesTable)
    .where(eq(filesTable.ndlConnectorId, connectorId));
  console.log(`Found ${currentFiles.length} total files`);
  console.log("Current files in database:", currentFiles);

  const currentTickets = currentFiles.filter(
    (f) => f.type === "ticket" || f.type === "comments",
  ) as DbFile[];
  const currentArticles = currentFiles.filter(
    (f) => f.type === "article",
  ) as DbFile[];
  console.log(
    `Current state: ${currentTickets.length} tickets, ${currentArticles.length} articles`,
  );
  console.log("Current tickets:", currentTickets);
  console.log("Current articles:", currentArticles);

  // 3. Get live data from Zendesk
  console.log("Fetching live data from Zendesk");
  const zendeskService = createZendeskService(accessToken, subdomain);
  const { tickets: liveTickets, articles: liveArticles } =
    await zendeskService.searchByOrganization(organizationId.toString(), {
      fetchTickets: includeTickets,
      fetchArticles: includeArticles,
    });
  console.log(`Retrieved live data:`, {
    tickets: liveTickets?.items.length ?? 0,
    articles: liveArticles?.items.length ?? 0,
  });
  console.log("Live tickets:", liveTickets?.items);
  console.log("Live articles:", liveArticles?.items);

  // 4. Compute diffs
  console.log("Computing diffs between current and live data");
  const ticketsDiff = liveTickets
    ? computeDiff(currentTickets, liveTickets.items)
    : { create: [], update: [], delete: currentTickets };
  const articlesDiff = liveArticles
    ? computeDiff(currentArticles, liveArticles.items)
    : { create: [], update: [], delete: currentArticles };

  console.log("Detailed diff results for tickets:", ticketsDiff);
  console.log("Detailed diff results for articles:", articlesDiff);
  console.log("Summary diff results:", {
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

  // 5. Prepare the descriptor for Needle
  const descriptor: ConnectorRunDescriptor = {
    create: [],
    update: [],
    delete: [],
  };

  // Track new file IDs for database insertion
  const fileIdMap = new Map<string, string>();

  // Handle creates in descriptor
  console.log("Processing creates for descriptor");
  for (const ticket of ticketsDiff.create) {
    if ("subject" in ticket) {
      console.log(`Processing new ticket: ${ticket.id} - ${ticket.subject}`);
      console.log("Full ticket data:", ticket);
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
      console.log(`Created descriptor entries for ticket ${ticket.id}:`, {
        ticketFile: { id: ticketFileId, url: ticket.url },
        commentsFile: {
          id: commentsFileId,
          url: ticket.url.replace(".json", "/comments.json"),
        },
      });
    }
  }

  for (const article of articlesDiff.create) {
    if ("title" in article) {
      console.log(`Processing new article: ${article.id} - ${article.title}`);
      console.log("Full article data:", article);
      const articleFileId = createNeedleFileId();
      fileIdMap.set(`article-${article.id}`, articleFileId);

      descriptor.create.push({
        id: articleFileId,
        url: article.html_url,
        type: "text/html",
      });
      console.log(`Created descriptor entry for article ${article.id}:`, {
        id: articleFileId,
        url: article.html_url,
      });
    }
  }

  // Handle updates in descriptor
  console.log("Processing updates for descriptor");
  for (const item of [...ticketsDiff.update, ...articlesDiff.update]) {
    const dbFiles = currentFiles.filter((f) => f.originId === item.id);
    console.log(
      `Processing update for item ${item.id}, found ${dbFiles.length} related files`,
    );
    console.log("Files to update:", dbFiles);
    for (const dbFile of dbFiles) {
      if (dbFile.ndlFileId) {
        descriptor.update.push({ id: dbFile.ndlFileId });
        console.log(`Added update to descriptor for file: ${dbFile.ndlFileId}`);
      }
    }
  }

  // Handle deletes in descriptor
  console.log("Processing deletes for descriptor");
  const filesToDelete = currentFiles.filter((file) =>
    file.type === "ticket" || file.type === "comments"
      ? ticketsDiff.delete.some((t) => t.originId === file.originId)
      : articlesDiff.delete.some((a) => a.originId === file.originId),
  );

  console.log(`Found ${filesToDelete.length} files to delete:`, filesToDelete);
  for (const file of filesToDelete) {
    if (file.ndlFileId) {
      descriptor.delete.push({ id: file.ndlFileId });
      console.log(`Added delete to descriptor for file: ${file.ndlFileId}`);
    }
  }

  console.log("Final descriptor:", JSON.stringify(descriptor, null, 2));

  try {
    // 6. First publish to Needle
    console.log("Publishing to Needle with descriptor:", {
      create: descriptor.create.length,
      update: descriptor.update.length,
      delete: descriptor.delete.length,
    });
    await publishConnectorRun(connectorId, descriptor);
    console.log("Successfully published to Needle");

    // 7. Then update our database
    console.log("Starting database transaction");
    await db.transaction(async (tx) => {
      // Handle creates
      const createValues: FileInsert[] = [];

      // Add new tickets and their comments
      console.log("Processing database creates for tickets");
      for (const ticket of ticketsDiff.create) {
        if ("subject" in ticket) {
          console.log(`Creating database entries for ticket: ${ticket.id}`);
          const ticketFileId = fileIdMap.get(`ticket-${ticket.id}`);
          const commentsFileId = fileIdMap.get(`comments-${ticket.id}`);

          if (ticketFileId && commentsFileId) {
            const ticketEntry = {
              ndlConnectorId: connectorId,
              ndlFileId: ticketFileId,
              originId: ticket.id,
              url: ticket.url,
              title: ticket.subject,
              type: "ticket",
              createdAt: new Date(ticket.created_at),
              updatedAt: new Date(ticket.updated_at),
            };
            const commentsEntry = {
              ndlConnectorId: connectorId,
              ndlFileId: commentsFileId,
              originId: ticket.id,
              url: ticket.url.replace(".json", "/comments.json"),
              title: `${ticket.subject} - Comments`,
              type: "comments",
              createdAt: new Date(ticket.created_at),
              updatedAt: new Date(ticket.updated_at),
            };
            createValues.push(ticketEntry, commentsEntry);
            console.log("Created database entries:", {
              ticketEntry,
              commentsEntry,
            });
          }
        }
      }

      // Add new articles
      console.log("Processing database creates for articles");
      for (const article of articlesDiff.create) {
        if ("title" in article) {
          console.log(`Creating database entry for article: ${article.id}`);
          const articleFileId = fileIdMap.get(`article-${article.id}`);

          if (articleFileId) {
            const articleEntry = {
              ndlConnectorId: connectorId,
              ndlFileId: articleFileId,
              originId: article.id,
              url: article.html_url,
              title: article.title,
              type: "article",
              createdAt: new Date(article.created_at),
              updatedAt: new Date(article.updated_at),
            };
            createValues.push(articleEntry);
            console.log("Created database entry:", articleEntry);
          }
        }
      }

      if (createValues.length > 0) {
        console.log(
          `Inserting ${createValues.length} new files into database:`,
          createValues,
        );
        await tx.insert(filesTable).values(createValues);
      }

      // Handle updates
      console.log("Processing database updates");
      for (const ticket of ticketsDiff.update) {
        if ("subject" in ticket) {
          console.log(`Updating database entries for ticket: ${ticket.id}`);
          const updates = [
            tx
              .update(filesTable)
              .set({
                title: ticket.subject,
                url: ticket.url,
                updatedAt: new Date(ticket.updated_at),
              })
              .where(
                and(
                  eq(filesTable.originId, ticket.id),
                  eq(filesTable.type, "ticket"),
                ),
              ),
            tx
              .update(filesTable)
              .set({
                title: `${ticket.subject} - Comments`,
                url: ticket.url.replace(".json", "/comments.json"),
                updatedAt: new Date(ticket.updated_at),
              })
              .where(
                and(
                  eq(filesTable.originId, ticket.id),
                  eq(filesTable.type, "comments"),
                ),
              ),
          ];
          await Promise.all(updates);
          console.log(`Updated ticket ${ticket.id} in database`);
        }
      }

      for (const article of articlesDiff.update) {
        if ("title" in article) {
          console.log(`Updating database entry for article: ${article.id}`);
          await tx
            .update(filesTable)
            .set({
              title: article.title,
              url: article.html_url,
              updatedAt: new Date(article.updated_at),
            })
            .where(
              and(
                eq(filesTable.originId, article.id),
                eq(filesTable.type, "article"),
              ),
            );
          console.log(`Updated article ${article.id} in database`);
        }
      }

      // Handle deletes
      console.log("Processing database deletes");
      const deleteIds = [
        ...ticketsDiff.delete.map((t) => t.originId),
        ...articlesDiff.delete.map((a) => a.originId),
      ];

      if (deleteIds.length > 0) {
        console.log(`Deleting files with IDs from database:`, deleteIds);
        await tx
          .delete(filesTable)
          .where(
            and(
              eq(filesTable.ndlConnectorId, connectorId),
              inArray(filesTable.originId, deleteIds),
            ),
          );
      }
    });

    console.log("Connector run completed successfully");
  } catch (error) {
    console.error("Failed to process connector run:", error);
    throw error;
  }
}

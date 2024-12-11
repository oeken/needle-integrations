import { db } from "../db";
import {
  type FileInsert,
  type FileMetadata,
  type CanvasFileMetadata,
  filesTable,
  slackConnectorsTable,
  type SlackChannel,
} from "../db/schema";
import { and, eq, inArray } from "drizzle-orm";

export async function getConnectorDetails(connectorId: string) {
  return await db
    .select()
    .from(slackConnectorsTable)
    .where(eq(slackConnectorsTable.connectorId, connectorId))
    .then((rows) => rows[0]);
}

export async function getCurrentFiles(connectorId: string) {
  return await db
    .select()
    .from(filesTable)
    .where(eq(filesTable.ndlConnectorId, connectorId));
}

export async function updateLastSynced(connectorId: string) {
  await db
    .update(slackConnectorsTable)
    .set({ lastSyncedAt: new Date() })
    .where(eq(slackConnectorsTable.connectorId, connectorId));
}

export async function handleDatabaseUpdates(
  connectorId: string,
  createFiles: {
    id: string;
    metadata: FileMetadata | CanvasFileMetadata;
    title: string;
  }[],
  updateFiles: {
    id: string;
    metadata: FileMetadata | CanvasFileMetadata;
    title?: string;
  }[],
  deleteFiles: { id: string }[],
) {
  // Handle creates
  if (createFiles.length > 0) {
    const filesToInsert: FileInsert[] = createFiles.map((file) => ({
      ndlConnectorId: connectorId,
      ndlFileId: file.id,
      metadata: {
        ...file.metadata,
        // Ensure canvas metadata includes all required fields
        ...(file.metadata.dataType === "canvas"
          ? {
              title: file.title,
            }
          : {}),
      },
      title: file.title,
    }));

    await db.insert(filesTable).values(filesToInsert);
  }

  // Handle updates
  for (const file of updateFiles) {
    await db
      .update(filesTable)
      .set({
        metadata: {
          ...file.metadata,
          // Ensure canvas metadata includes all required fields
          ...(file.metadata.dataType === "canvas"
            ? {
                title: file.title,
              }
            : {}),
        },
        ...(file.title ? { title: file.title } : {}),
      })
      .where(
        and(
          eq(filesTable.ndlConnectorId, connectorId),
          eq(filesTable.ndlFileId, file.id),
        ),
      );
  }

  // Handle deletes
  if (deleteFiles.length > 0) {
    const fileIds = deleteFiles.map((f) => f.id);
    await db
      .delete(filesTable)
      .where(
        and(
          eq(filesTable.ndlConnectorId, connectorId),
          inArray(filesTable.ndlFileId, fileIds),
        ),
      );
  }
}

export async function updateChannelInfo(
  connectorId: string,
  channelInfo: SlackChannel[],
) {
  await db
    .update(slackConnectorsTable)
    .set({ channelInfo })
    .where(eq(slackConnectorsTable.connectorId, connectorId));
}

export async function createSlackConnectorRecord(
  connectorId: string,
  channelInfo: SlackChannel[],
  timezone: string,
) {
  await db.insert(slackConnectorsTable).values({
    connectorId,
    channelInfo,
    timezone: timezone ?? "UTC",
    lastSyncedAt: new Date(),
  });
}

export async function deleteSlackConnectorRecords(connectorId: string) {
  await db.transaction(async (tx) => {
    await tx
      .delete(filesTable)
      .where(eq(filesTable.ndlConnectorId, connectorId));
    await tx
      .delete(slackConnectorsTable)
      .where(eq(slackConnectorsTable.connectorId, connectorId));
  });
}

export async function getSlackConnectorWithFiles(connectorId: string) {
  const [slackMetadata] = await db
    .select()
    .from(slackConnectorsTable)
    .where(eq(slackConnectorsTable.connectorId, connectorId));

  const files = await db
    .select()
    .from(filesTable)
    .where(eq(filesTable.ndlConnectorId, connectorId));

  return {
    files,
    channelInfo: slackMetadata?.channelInfo,
    lastSyncedAt: slackMetadata?.lastSyncedAt,
  };
}

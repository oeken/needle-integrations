import { db } from "../db";
import {
  slackMessagesTable,
  slackCanvasesTable,
  slackConnectorsTable,
  type SlackChannel,
} from "../db/schema";
import { and, eq, inArray } from "drizzle-orm";

// Define types for our file operations
interface BaseFileData {
  ndlFileId: string;
  ndlConnectorId: string;
  dataType: string;
}

export interface MessageFileData extends BaseFileData {
  dataType: string;
  channelId: string;
  monthStart: string;
  monthEnd: string;
  title: string | null;
}

export interface CanvasFileData extends BaseFileData {
  dataType: string;
  channelId: string;
  originId: string;
  url: string;
  title: string;
}

export type FileData = MessageFileData | CanvasFileData;

export async function getConnectorDetails(connectorId: string) {
  return await db
    .select()
    .from(slackConnectorsTable)
    .where(eq(slackConnectorsTable.connectorId, connectorId))
    .then((rows) => rows[0]);
}

export async function getCurrentFiles(
  connectorId: string,
): Promise<FileData[]> {
  const messages = await db
    .select()
    .from(slackMessagesTable)
    .where(eq(slackMessagesTable.ndlConnectorId, connectorId));

  const canvases = await db
    .select()
    .from(slackCanvasesTable)
    .where(eq(slackCanvasesTable.ndlConnectorId, connectorId));

  return [
    ...messages.map(
      (msg): MessageFileData => ({
        ndlFileId: msg.ndlFileId,
        ndlConnectorId: msg.ndlConnectorId,
        dataType: "slack_messages",
        channelId: msg.channelId,
        monthStart: msg.monthStart,
        monthEnd: msg.monthEnd,
        title: null,
      }),
    ),
    ...canvases.map(
      (canvas): CanvasFileData => ({
        ndlFileId: canvas.ndlFileId,
        ndlConnectorId: canvas.ndlConnectorId,
        dataType: "canvas",
        channelId: canvas.channelId,
        originId: canvas.originId,
        url: canvas.url,
        title: canvas.title,
      }),
    ),
  ];
}

export async function updateLastSynced(connectorId: string) {
  await db
    .update(slackConnectorsTable)
    .set({ lastSyncedAt: new Date() })
    .where(eq(slackConnectorsTable.connectorId, connectorId));
}

export async function handleDatabaseUpdates(
  connectorId: string,
  createFiles: FileData[],
  updateFiles: FileData[],
  deleteFiles: { id: string }[],
  deletedChannelIds?: Set<string>,
) {
  await db.transaction(async (tx) => {
    // Clean up deleted channels first
    if (deletedChannelIds && deletedChannelIds.size > 0) {
      const channelIds = Array.from(deletedChannelIds);
      console.log(
        "[handleDatabaseUpdates] Cleaning up deleted channels:",
        channelIds,
      );

      // Delete all messages from deleted channels
      await tx
        .delete(slackMessagesTable)
        .where(
          and(
            eq(slackMessagesTable.ndlConnectorId, connectorId),
            inArray(slackMessagesTable.channelId, channelIds),
          ),
        );

      // Delete all canvases from deleted channels
      await tx
        .delete(slackCanvasesTable)
        .where(
          and(
            eq(slackCanvasesTable.ndlConnectorId, connectorId),
            inArray(slackCanvasesTable.channelId, channelIds),
          ),
        );
    }

    // Handle deletes
    if (deleteFiles.length > 0) {
      const fileIds = deleteFiles.map((f) => f.id);
      console.log("[handleDatabaseUpdates] Deleting files by ID:", fileIds);

      await tx
        .delete(slackMessagesTable)
        .where(
          and(
            eq(slackMessagesTable.ndlConnectorId, connectorId),
            inArray(slackMessagesTable.ndlFileId, fileIds),
          ),
        );
      await tx
        .delete(slackCanvasesTable)
        .where(
          and(
            eq(slackCanvasesTable.ndlConnectorId, connectorId),
            inArray(slackCanvasesTable.ndlFileId, fileIds),
          ),
        );
    }

    // Handle creates
    if (createFiles.length > 0) {
      const messageFiles = createFiles.filter(
        (f): f is MessageFileData => f.dataType === "slack_messages",
      );
      const canvasFiles = createFiles.filter(
        (f): f is CanvasFileData => f.dataType === "canvas",
      );

      if (messageFiles.length > 0) {
        await tx.insert(slackMessagesTable).values(
          messageFiles.map((file) => ({
            ndlConnectorId: connectorId,
            ndlFileId: file.ndlFileId,
            channelId: file.channelId,
            monthStart: file.monthStart,
            monthEnd: file.monthEnd,
            dataType: file.dataType,
          })),
        );
      }

      if (canvasFiles.length > 0) {
        await tx.insert(slackCanvasesTable).values(
          canvasFiles.map((file) => ({
            ndlConnectorId: connectorId,
            ndlFileId: file.ndlFileId,
            channelId: file.channelId,
            originId: file.originId,
            url: file.url,
            title: file.title,
            dataType: file.dataType,
          })),
        );
      }
    }
  });
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
      .delete(slackMessagesTable)
      .where(eq(slackMessagesTable.ndlConnectorId, connectorId));
    await tx
      .delete(slackCanvasesTable)
      .where(eq(slackCanvasesTable.ndlConnectorId, connectorId));
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

  const messages = await db
    .select()
    .from(slackMessagesTable)
    .where(eq(slackMessagesTable.ndlConnectorId, connectorId));

  const canvases = await db
    .select()
    .from(slackCanvasesTable)
    .where(eq(slackCanvasesTable.ndlConnectorId, connectorId));

  return {
    messages,
    canvases,
    channelInfo: slackMetadata?.channelInfo,
    lastSyncedAt: slackMetadata?.lastSyncedAt,
  };
}

export async function cleanupDeletedChannels(
  connectorId: string,
  deletedChannelIds: string[],
) {
  if (!deletedChannelIds.length) return;

  console.log(
    "[cleanupDeletedChannels] Starting cleanup for channels:",
    deletedChannelIds,
  );

  await db.transaction(async (tx) => {
    // Delete all messages from deleted channels
    const deletedMessages = await tx
      .delete(slackMessagesTable)
      .where(
        and(
          eq(slackMessagesTable.ndlConnectorId, connectorId),
          inArray(slackMessagesTable.channelId, deletedChannelIds),
        ),
      )
      .returning();

    // Delete all canvases from deleted channels
    const deletedCanvases = await tx
      .delete(slackCanvasesTable)
      .where(
        and(
          eq(slackCanvasesTable.ndlConnectorId, connectorId),
          inArray(slackCanvasesTable.channelId, deletedChannelIds),
        ),
      )
      .returning();

    console.log("[cleanupDeletedChannels] Cleanup results:", {
      deletedMessages: deletedMessages.length,
      deletedCanvases: deletedCanvases.length,
    });
  });
}

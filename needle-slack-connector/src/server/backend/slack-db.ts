import { db } from "../db";
import {
  slackMessagesTable,
  slackCanvasesTable,
  slackConnectorsTable,
  type SlackChannel,
} from "../db/schema";
import { and, eq, inArray } from "drizzle-orm";

// Define types for our file operations
export interface BaseFileData {
  ndlFileId: string;
  ndlConnectorId: string;
  dataType: string;
  updatedAt: Date;
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
        updatedAt: msg.updatedAt,
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
        updatedAt: canvas.updatedAt,
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
    // Handle deletions
    if (deletedChannelIds && deletedChannelIds.size > 0) {
      const channelIds = Array.from(deletedChannelIds);

      await tx
        .delete(slackMessagesTable)
        .where(
          and(
            eq(slackMessagesTable.ndlConnectorId, connectorId),
            inArray(slackMessagesTable.channelId, channelIds),
          ),
        );

      await tx
        .delete(slackCanvasesTable)
        .where(
          and(
            eq(slackCanvasesTable.ndlConnectorId, connectorId),
            inArray(slackCanvasesTable.channelId, channelIds),
          ),
        );
    }

    if (deleteFiles.length > 0) {
      const fileIds = deleteFiles.map((f) => f.id);

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
            updatedAt: file.updatedAt,
          })),
        );
      }
    }

    // Handle canvas updates only
    const canvasUpdates = updateFiles.filter(
      (f): f is CanvasFileData => f.dataType === "canvas",
    );

    if (canvasUpdates.length > 0) {
      for (const canvas of canvasUpdates) {
        await tx
          .update(slackCanvasesTable)
          .set({
            url: canvas.url,
            title: canvas.title,
            updatedAt: canvas.updatedAt,
          })
          .where(
            and(
              eq(slackCanvasesTable.ndlConnectorId, connectorId),
              eq(slackCanvasesTable.ndlFileId, canvas.ndlFileId),
            ),
          );
      }
    }
  });
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

export async function updateConnectorChannelInfo(
  connectorId: string,
  channelInfo: SlackChannel[],
) {
  await db
    .update(slackConnectorsTable)
    .set({ channelInfo })
    .where(eq(slackConnectorsTable.connectorId, connectorId));
}

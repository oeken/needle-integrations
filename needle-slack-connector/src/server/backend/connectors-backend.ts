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
  type Session,
  type ConnectorRunDescriptor,
  createNeedleFileId,
} from "@needle-ai/needle-sdk";
import { slackConnectorsTable } from "../db/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";
import {
  getConnectorDetails,
  getCurrentFiles,
  handleDatabaseUpdates,
  updateLastSynced,
  createSlackConnectorRecord,
  deleteSlackConnectorRecords,
  getSlackConnectorWithFiles,
  cleanupDeletedChannels,
} from "./slack-db";
import {
  computeCanvasDiff,
  createNewFiles,
  processExistingFiles,
} from "./diff-utils";
import { createSlackService } from "../slack/service";
import { type ExistingFile } from "../slack/types";
import {
  type MessageFileData,
  type CanvasFileData,
  type FileData,
} from "./slack-db";

export async function createSlackConnector(
  params: CreateConnectorRequest,
  session: Session,
) {
  console.log(
    "[createSlackConnector] Starting connector creation with params:",
    {
      name: params.name,
      channels: params.channels.length,
      timezone: params.timezone,
    },
  );

  if (!params.channels.length) {
    throw new Error("At least one channel must be provided");
  }

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

  console.log("[createSlackConnector] Created connector:", {
    connector,
    params,
  });

  await createSlackConnectorRecord(
    connector.id,
    params.channels,
    params.timezone,
  );

  await runSlackConnector({ connectorId: connector.id }, session);
  return connector;
}

export async function runSlackConnector(
  { connectorId, simulateDate }: { connectorId: string; simulateDate?: Date },
  session?: Session,
) {
  console.log("[runSlackConnector] Starting connector run:", {
    connectorId,
    simulateDate: simulateDate?.toISOString(),
  });

  const effectiveDate = simulateDate ?? new Date();

  if (!session) {
    throw new Error("Session required for connector run");
  }

  const [connector, connectorDetails] = await Promise.all([
    getConnector(connectorId, session.id),
    getConnectorDetails(connectorId),
  ]);

  if (!connector) throw new Error(`No connector found for ID: ${connectorId}`);
  if (!connectorDetails)
    throw new Error(`No Slack connector found for ID: ${connectorId}`);

  const initialFiles = await getCurrentFiles(connectorId);
  console.log("[runSlackConnector] Retrieved initial files:", {
    files: initialFiles,
  });

  // Get current channel list from Slack to verify channel existence
  const slackService = createSlackService(connector.credentials ?? "");
  const channelsResponse = (await slackService.getChannels()) as {
    ok: boolean;
    channels?: { id: string; name: string }[];
  };

  if (!channelsResponse.ok || !channelsResponse.channels) {
    throw new Error("Failed to fetch channels from Slack");
  }

  // Filter out deleted channels from connector's channelInfo
  const existingChannelIds = new Set(
    channelsResponse.channels.map((c) => c.id),
  );
  const updatedChannelInfo =
    connectorDetails.channelInfo?.filter((channel) =>
      existingChannelIds.has(channel.id),
    ) ?? [];

  // Get list of deleted channel IDs
  const deletedChannelIds = new Set(
    (connectorDetails.channelInfo ?? [])
      .filter((channel) => !existingChannelIds.has(channel.id))
      .map((channel) => channel.id),
  );

  console.log("[runSlackConnector] Channel status:", {
    totalChannels: channelsResponse.channels,
    activeChannels: updatedChannelInfo,
    deletedChannels: Array.from(deletedChannelIds),
  });

  // Clean up deleted channels first
  if (deletedChannelIds.size > 0) {
    console.log("[runSlackConnector] Cleaning up deleted channels");
    await cleanupDeletedChannels(connectorId, Array.from(deletedChannelIds));
  }

  // Update connector's channelInfo if channels were removed
  if (
    updatedChannelInfo.length !== (connectorDetails.channelInfo?.length ?? 0)
  ) {
    await db
      .update(slackConnectorsTable)
      .set({ channelInfo: updatedChannelInfo })
      .where(eq(slackConnectorsTable.connectorId, connectorId));

    connectorDetails.channelInfo = updatedChannelInfo;
  }

  // Get current files again after cleanup
  const remainingFiles = await getCurrentFiles(connectorId);

  // Add files from deleted channels to the delete list (if any still exist)
  const deletedChannelFiles = remainingFiles
    .filter((file) => deletedChannelIds.has(file.channelId))
    .map((file) => ({ id: file.ndlFileId }));

  if (deletedChannelFiles.length > 0) {
    console.log(
      "[runSlackConnector] Warning: Found files from deleted channels after cleanup:",
      {
        files: deletedChannelFiles,
      },
    );
  }

  // Process only files from active channels
  const activeFiles = remainingFiles.filter(
    (file) => !deletedChannelIds.has(file.channelId),
  );

  // Improved file type separation
  const { messageFiles, canvasFiles } = activeFiles.reduce(
    (
      acc: {
        messageFiles: MessageFileData[];
        canvasFiles: CanvasFileData[];
      },
      file,
    ) => {
      if (file.dataType === "slack_messages") {
        acc.messageFiles.push(file as MessageFileData);
      } else if (file.dataType === "canvas") {
        acc.canvasFiles.push(file as CanvasFileData);
      }
      return acc;
    },
    {
      messageFiles: [],
      canvasFiles: [],
    },
  );

  console.log("[runSlackConnector] File type breakdown:", {
    messageFiles: messageFiles.length,
    canvasFiles: canvasFiles.length,
  });

  // Process regular message files
  const {
    update,
    delete: deleteFiles,
    filesToUpdate,
    filesToDelete,
  } = processExistingFiles(
    messageFiles,
    effectiveDate,
    connectorId,
    connectorDetails.timezone ?? "UTC",
  );

  const { create, filesToCreate } = createNewFiles(
    updatedChannelInfo,
    messageFiles as ExistingFile[],
    effectiveDate,
    connectorId,
    connectorDetails.timezone ?? "UTC",
  );

  console.log("[runSlackConnector] Message file operations:", {
    create: create,
    update: update,
    delete: [...deleteFiles, ...deletedChannelFiles],
  });

  // Process canvas files
  const liveCanvases = [];
  for (const channel of updatedChannelInfo) {
    const canvasResponse = await slackService.getCanvases(channel.id);
    if (canvasResponse.ok && canvasResponse.files) {
      const canvases = canvasResponse.files.map((file) => ({
        originId: file.id,
        channelId: channel.id,
        url: file.url_private,
        title: file.title,
        createdAt: file.created,
        updatedAt: file.updated,
        dataType: "canvas" as const,
      }));
      liveCanvases.push(...canvases);
    }
  }

  console.log("[runSlackConnector] Retrieved live canvases:", {
    total: liveCanvases,
  });

  // Compute canvas differences excluding deleted channels
  const canvasDiff = computeCanvasDiff(
    canvasFiles
      .filter((file) => existingChannelIds.has(file.channelId))
      .map((file) => ({
        ndlFileId: file.ndlFileId,
        channelId: file.channelId,
        originId: file.originId,
        url: file.url,
        title: file.title,
        dataType: file.dataType,
        updatedAt: new Date(),
      })),
    liveCanvases,
  );

  const canvasFileMap = new Map(
    canvasFiles.map((file) => [
      `${file.channelId}-${file.originId}`,
      file.ndlFileId,
    ]),
  );

  // Prepare canvas operations
  const canvasFilesToCreate = canvasDiff.create.map((canvas) => ({
    ndlFileId: createNeedleFileId(),
    ndlConnectorId: connectorId,
    channelId: canvas.channelId,
    originId: canvas.originId,
    url: canvas.url,
    title: canvas.title,
    dataType: canvas.dataType,
  }));

  const canvasFilesToUpdate = canvasDiff.update.map((canvas) => {
    const existingFileId = canvasFileMap.get(
      `${canvas.channelId}-${canvas.originId}`,
    );
    if (!existingFileId)
      throw new Error(
        `No existing file ID found for canvas ${canvas.originId}`,
      );
    return {
      ndlFileId: existingFileId,
      ndlConnectorId: connectorId,
      channelId: canvas.channelId,
      originId: canvas.originId,
      url: canvas.url,
      title: canvas.title,
      dataType: canvas.dataType,
    };
  });

  const canvasFilesToDelete = canvasDiff.delete.map((canvas) => {
    const existingFileId = canvasFileMap.get(
      `${canvas.channelId}-${canvas.originId}`,
    );
    if (!existingFileId)
      throw new Error(
        `No existing file ID found for canvas ${canvas.originId}`,
      );
    return { id: existingFileId };
  });

  console.log("[runSlackConnector] Canvas file operations:", {
    create: canvasFilesToCreate,
    update: canvasFilesToUpdate,
    delete: canvasFilesToDelete,
  });

  // Publish connector run with all operations
  const descriptor: ConnectorRunDescriptor = {
    create: [
      ...create.map((file) => ({
        id: file.id,
        url: typeof file.url === "string" ? file.url : "",
        type: "text/plain" as const,
      })),
      ...canvasFilesToCreate.map((file) => ({
        id: file.ndlFileId,
        url: file.url,
        type: "text/plain" as const,
      })),
    ],
    update: [
      ...update.map((file) => ({
        id: file.id,
      })),
      ...canvasFilesToUpdate.map((file) => ({
        id: file.ndlFileId,
      })),
    ],
    delete: [...deleteFiles, ...canvasFilesToDelete, ...deletedChannelFiles],
  };

  console.log("[runSlackConnector] Publishing connector run with operations:", {
    descriptor,
  });

  await publishConnectorRun(connectorId, descriptor);

  await handleDatabaseUpdates(
    connectorId,
    [...filesToCreate, ...canvasFilesToCreate] as FileData[],
    [...filesToUpdate, ...canvasFilesToUpdate] as FileData[],
    [...filesToDelete, ...canvasFilesToDelete, ...deletedChannelFiles],
    deletedChannelIds,
  );

  await updateLastSynced(connectorId);

  // Update channelInfo in the database if needed
  await db
    .update(slackConnectorsTable)
    .set({ channelInfo: connectorDetails.channelInfo })
    .where(eq(slackConnectorsTable.connectorId, connectorId));

  console.log("[runSlackConnector] Completed connector run successfully");
}

export async function listSlackConnectors(session: Session) {
  console.log(
    "[listSlackConnectors] Fetching connectors for session:",
    session.id,
  );
  return await listConnectors(session.id);
}

export async function getSlackConnector(
  { connectorId }: ConnectorRequest,
  session: Session,
) {
  console.log("[getSlackConnector] Fetching connector:", {
    connectorId,
    sessionId: session.id,
  });

  const connector = await getConnector(connectorId, session.id);
  if (!connector) {
    throw new Error(`No connector found for ID: ${connectorId}`);
  }

  const slackData = await getSlackConnectorWithFiles(connectorId);

  return {
    ...connector,
    ...slackData,
  };
}

export async function deleteSlackConnector(
  { connectorId }: ConnectorRequest,
  session: Session,
) {
  console.log("[deleteSlackConnector] Deleting connector:", {
    connectorId,
    sessionId: session.id,
  });

  const connector = await deleteConnector(connectorId, session.id);
  await deleteSlackConnectorRecords(connectorId);
  return connector;
}

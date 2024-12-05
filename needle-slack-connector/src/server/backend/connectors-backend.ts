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
import { type CanvasFileMetadata, slackConnectorsTable } from "../db/schema";
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
} from "./slack-db";
import {
  computeCanvasDiff,
  createNewFiles,
  processExistingFiles,
} from "./dif-utils";
import { createSlackService } from "../slack/service";
import { type ExistingFile } from "../slack/types";

export async function createSlackConnector(
  params: CreateConnectorRequest,
  session: Session,
) {
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

  try {
    await createSlackConnectorRecord(
      connector.id,
      params.channels,
      params.timezone,
    );
    await runSlackConnector({ connectorId: connector.id }, session);
    return connector;
  } catch (error) {
    await deleteConnector(connector.id, session.id);
    throw error;
  }
}

export async function runSlackConnector(
  { connectorId, simulateDate }: { connectorId: string; simulateDate?: Date },
  session: Session,
) {
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

  console.log("Connector details:", connectorDetails);

  const currentFiles = await getCurrentFiles(connectorId);
  console.log("Current files:", currentFiles);

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

  // Improved file type separation
  const { messageFiles, canvasFiles } = currentFiles.reduce(
    (acc, file) => {
      if (file.metadata.dataType === "slack_messages") {
        acc.messageFiles.push(file);
      } else if (file.metadata.dataType === "canvas") {
        acc.canvasFiles.push(file);
      }
      return acc;
    },
    { messageFiles: [], canvasFiles: [] } as {
      messageFiles: typeof currentFiles;
      canvasFiles: typeof currentFiles;
    },
  );

  // Find files from deleted channels
  const deletedChannelFiles = currentFiles.filter((file) => {
    const channelId =
      file.metadata.dataType === "canvas"
        ? (file.metadata as CanvasFileMetadata).channelId
        : file.metadata.channelId;
    return !existingChannelIds.has(channelId);
  });

  // Process regular message files
  const {
    update,
    delete: deleteFiles,
    filesToUpdate,
    filesToDelete,
  } = processExistingFiles(
    messageFiles.filter((file) =>
      existingChannelIds.has(file.metadata.channelId),
    ) as ExistingFile[],
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

  // Compute canvas differences excluding deleted channels
  const canvasDiff = computeCanvasDiff(
    canvasFiles
      .filter((file) =>
        existingChannelIds.has((file.metadata as CanvasFileMetadata).channelId),
      )
      .map((file) => ({
        ndlFileId: file.ndlFileId,
        metadata: file.metadata as CanvasFileMetadata,
        updatedAt: file.updatedAt,
      })),
    liveCanvases.map((canvas) => ({
      channelId: canvas.channelId,
      originId: canvas.originId,
      url: canvas.url,
      title: canvas.title,
      createdAt: canvas.createdAt,
      updatedAt: canvas.updatedAt,
      dataType: "canvas" as const,
    })),
  );

  const canvasFileMap = new Map(
    canvasFiles.map((file) => [
      `${(file.metadata as CanvasFileMetadata).channelId}-${(file.metadata as CanvasFileMetadata).originId}`,
      file.ndlFileId,
    ]),
  );

  // Prepare canvas operations
  const [canvasFilesToCreate, canvasFilesToUpdate, canvasFilesToDelete] = [
    canvasDiff.create.map((canvas) => ({
      id: createNeedleFileId(),
      metadata: {
        channelId: canvas.channelId,
        dataType: "canvas" as const,
        originId: canvas.originId,
        title: canvas.title,
        url: canvas.url,
      },
      title: canvas.title,
    })),
    canvasDiff.update.map((canvas) => ({
      id: canvasFileMap.get(`${canvas.channelId}-${canvas.originId}`)!,
      metadata: {
        channelId: canvas.channelId,
        dataType: "canvas" as const,
        originId: canvas.originId,
        title: canvas.title,
        url: canvas.url,
      },
      title: canvas.title,
    })),
    [
      ...canvasDiff.delete.map((canvas) => ({
        id: canvasFileMap.get(`${canvas.channelId}-${canvas.originId}`)!,
      })),
      ...deletedChannelFiles.map((file) => ({ id: file.ndlFileId })),
    ],
  ];

  // Merge message and canvas operations into a single descriptor
  const descriptor: ConnectorRunDescriptor = {
    create: [
      ...create,
      ...canvasFilesToCreate.map((canvas) => ({
        id: canvas.id,
        url: canvas.metadata.url,
        type: "text/html" as const,
      })),
    ],
    update: [
      ...update,
      ...canvasFilesToUpdate.map((canvas) => ({ id: canvas.id })),
    ],
    delete: [
      ...deleteFiles,
      ...canvasFilesToDelete.map((canvas) => ({ id: canvas.id })),
    ],
  };
  console.log("Final descriptor:", descriptor);
  await publishConnectorRun(connectorId, descriptor);

  await handleDatabaseUpdates(
    connectorId,
    [...filesToCreate, ...canvasFilesToCreate],
    [...filesToUpdate, ...canvasFilesToUpdate],
    [...filesToDelete, ...canvasFilesToDelete],
  );

  await updateLastSynced(connectorId);

  // Update channelInfo in the database if needed
  await db
    .update(slackConnectorsTable)
    .set({ channelInfo: connectorDetails.channelInfo })
    .where(eq(slackConnectorsTable.connectorId, connectorId));
}

export async function listSlackConnectors(session: Session) {
  return await listConnectors(session.id);
}

export async function getSlackConnector(
  { connectorId }: ConnectorRequest,
  session: Session,
) {
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
  const connector = await deleteConnector(connectorId, session.id);
  await deleteSlackConnectorRecords(connectorId);
  return connector;
}

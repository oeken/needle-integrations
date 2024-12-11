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
import {
  getConnectorDetails,
  getCurrentFiles,
  handleDatabaseUpdates,
  updateLastSynced,
  createSlackConnectorRecord,
  deleteSlackConnectorRecords,
  getSlackConnectorWithFiles,
  updateConnectorChannelInfo,
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
  const effectiveDate = simulateDate ?? new Date();

  if (!session) {
    throw new Error("Session required for connector run");
  }

  // Get connector and its details
  const [connector, connectorDetails] = await Promise.all([
    getConnector(connectorId, session.id),
    getConnectorDetails(connectorId),
  ]);

  if (!connector) throw new Error(`No connector found for ID: ${connectorId}`);
  if (!connectorDetails)
    throw new Error(`No Slack connector found for ID: ${connectorId}`);

  // Get current Slack channels and identify deleted ones
  const slackService = createSlackService(connector.credentials ?? "");
  const slackChannels = await slackService.getChannels();

  if (!slackChannels.ok || !slackChannels.channels) {
    throw new Error("Failed to fetch channels from Slack");
  }

  const liveChannelIds = new Set(slackChannels.channels.map((c) => c.id));
  const activeConfiguredChannels =
    connectorDetails.channelInfo?.filter((channel) =>
      liveChannelIds.has(channel.id),
    ) ?? [];
  const deletedChannelIds = new Set(
    (connectorDetails.channelInfo ?? [])
      .filter((channel) => !liveChannelIds.has(channel.id))
      .map((channel) => channel.id),
  );

  // Get all current files and separate by type
  const allFiles = await getCurrentFiles(connectorId);
  const { messageFiles, canvasFiles } = allFiles.reduce(
    (
      acc: { messageFiles: MessageFileData[]; canvasFiles: CanvasFileData[] },
      file,
    ) => {
      if (file.dataType === "slack_messages") {
        acc.messageFiles.push(file as MessageFileData);
      } else if (file.dataType === "canvas") {
        acc.canvasFiles.push(file as CanvasFileData);
      }
      return acc;
    },
    { messageFiles: [], canvasFiles: [] },
  );

  // Process message files
  const messageChanges = processExistingFiles(
    messageFiles,
    effectiveDate,
    connectorId,
    connectorDetails.timezone ?? "UTC",
    deletedChannelIds,
  );

  const newMessages = createNewFiles(
    activeConfiguredChannels,
    messageFiles as ExistingFile[],
    effectiveDate,
    connectorId,
    connectorDetails.timezone ?? "UTC",
  );

  // Get current canvas files from Slack
  const liveCanvases = [];
  for (const channel of activeConfiguredChannels) {
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

  // Process canvas files
  const canvasChanges = computeCanvasDiff(
    canvasFiles.map((file) => ({
      ndlFileId: file.ndlFileId,
      channelId: file.channelId,
      originId: file.originId,
      url: file.url,
      title: file.title,
      dataType: file.dataType,
      updatedAt: file.updatedAt,
    })),
    liveCanvases,
  );

  // Prepare database operations for canvases
  const dbCanvasesToCreate = canvasChanges.create.map((canvas) => ({
    ndlFileId: createNeedleFileId(),
    ndlConnectorId: connectorId,
    channelId: canvas.channelId,
    originId: canvas.originId,
    url: canvas.url,
    title: canvas.title,
    dataType: canvas.dataType,
    updatedAt: new Date(canvas.updatedAt * 1000),
  }));

  const canvasIdMap = new Map(
    canvasFiles.map((file) => [
      `${file.channelId}-${file.originId}`,
      file.ndlFileId,
    ]),
  );

  const dbCanvasesToUpdate = canvasChanges.update.map((canvas) => {
    const existingFileId = canvasIdMap.get(
      `${canvas.channelId}-${canvas.originId}`,
    );
    if (!existingFileId) {
      throw new Error(
        `No existing file ID found for canvas ${canvas.originId}`,
      );
    }
    return {
      ndlFileId: existingFileId,
      ndlConnectorId: connectorId,
      channelId: canvas.channelId,
      originId: canvas.originId,
      url: canvas.url,
      title: canvas.title,
      dataType: canvas.dataType,
      updatedAt: new Date(canvas.updatedAt * 1000),
    };
  });

  const dbCanvasesToDelete = canvasChanges.delete.map((canvas) => {
    const existingFileId = canvasIdMap.get(
      `${canvas.channelId}-${canvas.originId}`,
    );
    if (!existingFileId) {
      throw new Error(
        `No existing file ID found for canvas ${canvas.originId}`,
      );
    }
    return { id: existingFileId };
  });

  // Prepare connector run descriptor (minimal data needed for the connector)
  const descriptor: ConnectorRunDescriptor = {
    create: [
      ...newMessages.create.map((file) => ({
        id: file.id,
        url: typeof file.url === "string" ? file.url : "",
        type: "text/plain" as const,
      })),
      ...dbCanvasesToCreate.map((file) => ({
        id: file.ndlFileId,
        url: file.url,
        type: "text/plain" as const,
      })),
    ],
    update: [
      ...messageChanges.update.map((file) => ({ id: file.id })),
      ...dbCanvasesToUpdate.map((file) => ({ id: file.ndlFileId })),
    ],
    delete: [...messageChanges.delete, ...dbCanvasesToDelete],
  };

  console.log("[runSlackConnector] Canvas changes:", {
    create: dbCanvasesToCreate,
    update: dbCanvasesToUpdate,
    delete: dbCanvasesToDelete,
  });

  console.log("[runSlackConnector] Message changes:", {
    create: newMessages.create,
    update: messageChanges.update,
    delete: messageChanges.delete,
  });

  console.log("[runSlackConnector] Publishing connector run:", {
    descriptor,
  });

  await publishConnectorRun(connectorId, descriptor);

  await handleDatabaseUpdates(
    connectorId,
    [...newMessages.filesToCreate, ...dbCanvasesToCreate] as FileData[],
    [...messageChanges.filesToUpdate, ...dbCanvasesToUpdate] as FileData[],
    [...messageChanges.filesToDelete, ...dbCanvasesToDelete],
    deletedChannelIds,
  );

  await updateLastSynced(connectorId);

  // Update channel info if needed
  await updateConnectorChannelInfo(
    connectorId,
    connectorDetails.channelInfo ?? [],
  );
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

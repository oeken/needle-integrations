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
} from "@needle-ai/needle-sdk";
import {
  getCurrentFiles,
  handleDatabaseUpdates,
  updateLastSynced,
  createSlackConnectorRecord,
  deleteSlackConnectorRecords,
  getSlackConnectorWithFiles,
  updateConnectorChannelInfo,
} from "./slack-db";
import { type FileData } from "./slack-db";
import {
  fetchLiveCanvases,
  initializeChannels,
  initializeConnector,
  processCanvases,
  processMessages,
  separateFilesByType,
} from "./connector-utils";

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
  const { connectorDetails, slackService } = await initializeConnector(
    connectorId,
    session.id,
  );

  // Get current Slack channels and identify deleted ones
  const { activeConfiguredChannels, deletedChannelIds } =
    await initializeChannels(slackService, connectorDetails);

  // Get all current files and separate by type
  const allFiles = await getCurrentFiles(connectorId);
  const { messageFiles, canvasFiles } = separateFilesByType(allFiles);

  // Process message files
  const { messageChanges, newMessages } = await processMessages(
    messageFiles,
    effectiveDate,
    connectorId,
    connectorDetails.timezone ?? "UTC",
    deletedChannelIds,
    activeConfiguredChannels,
  );

  // Get current canvas files from Slack
  const liveCanvases = await fetchLiveCanvases(
    slackService,
    activeConfiguredChannels,
  );

  // Process canvas files and prepare database operations
  const { dbCanvasesToCreate, dbCanvasesToUpdate, dbCanvasesToDelete } =
    processCanvases(canvasFiles, liveCanvases, connectorId);

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
    (connectorDetails.channelInfo ?? []).filter(
      (channel) => !deletedChannelIds.has(channel.id),
    ),
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

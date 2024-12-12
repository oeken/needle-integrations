import { createNeedleFileId, getConnector } from "@needle-ai/needle-sdk";
import { type SlackChannel, type SlackConnectorSelect } from "../db/schema";
import { type ExistingFile, type LiveCanvas } from "../slack/types";
import { createNewFiles, processExistingFiles } from "./diff-utils";
import { computeCanvasDiff } from "./diff-utils";
import {
  type CanvasFileData,
  type FileData,
  getConnectorDetails,
  type MessageFileData,
} from "./slack-db";
import { createSlackService } from "../slack/service";

export function separateFilesByType(allFiles: FileData[]) {
  return allFiles.reduce(
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
}

export async function initializeConnector(
  connectorId: string,
  sessionId: string,
) {
  const [connector, connectorDetails] = await Promise.all([
    getConnector(connectorId, sessionId),
    getConnectorDetails(connectorId),
  ]);

  if (!connector) throw new Error(`No connector found for ID: ${connectorId}`);
  if (!connectorDetails)
    throw new Error(`No Slack connector found for ID: ${connectorId}`);

  const slackService = createSlackService(connector.credentials ?? "");
  return { connectorDetails, slackService };
}

export async function initializeChannels(
  slackService: ReturnType<typeof createSlackService>,
  connectorDetails: SlackConnectorSelect,
) {
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

  return { activeConfiguredChannels, deletedChannelIds };
}

export async function fetchLiveCanvases(
  slackService: ReturnType<typeof createSlackService>,
  activeConfiguredChannels: SlackChannel[],
) {
  const liveCanvases = [];
  for (const channel of activeConfiguredChannels) {
    const canvasResponse = await slackService.getCanvases(channel.id);
    if (canvasResponse.ok && canvasResponse.files) {
      const canvases = canvasResponse.files.map((file) => {
        // If updated is undefined, use created timestamp
        const updatedAt = file.updated ?? file.created;

        return {
          originId: file.id,
          channelId: channel.id,
          url: file.url_private,
          title: file.title,
          createdAt: file.created,
          updatedAt, // Use our processed timestamp
          dataType: "canvas" as const,
        };
      });
      liveCanvases.push(...canvases);
    }
  }
  return liveCanvases;
}

export async function processMessages(
  messageFiles: MessageFileData[],
  effectiveDate: Date,
  connectorId: string,
  timezone: string,
  deletedChannelIds: Set<string>,
  activeConfiguredChannels: SlackChannel[],
) {
  const messageChanges = processExistingFiles(
    messageFiles,
    effectiveDate,
    connectorId,
    timezone,
    deletedChannelIds,
  );

  const newMessages = createNewFiles(
    activeConfiguredChannels,
    messageFiles as ExistingFile[],
    effectiveDate,
    connectorId,
    timezone,
  );

  return { messageChanges, newMessages };
}

export function processCanvases(
  canvasFiles: CanvasFileData[],
  liveCanvases: LiveCanvas[],
  connectorId: string,
) {
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
  const dbCanvasesToCreate = canvasChanges.create.map((canvas) => {
    // If updatedAt is undefined, use createdAt or current timestamp
    const timestamp =
      canvas.updatedAt ?? canvas.createdAt ?? Math.floor(Date.now() / 1000);
    return {
      ndlFileId: createNeedleFileId(),
      ndlConnectorId: connectorId,
      channelId: canvas.channelId,
      originId: canvas.originId,
      url: canvas.url,
      title: canvas.title,
      dataType: canvas.dataType,
      updatedAt: new Date(timestamp * 1000),
    };
  });

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
    // If updatedAt is undefined, use createdAt or current timestamp
    const timestamp =
      canvas.updatedAt ?? canvas.createdAt ?? Math.floor(Date.now() / 1000);
    return {
      ndlFileId: existingFileId,
      ndlConnectorId: connectorId,
      channelId: canvas.channelId,
      originId: canvas.originId,
      url: canvas.url,
      title: canvas.title,
      dataType: canvas.dataType,
      updatedAt: new Date(timestamp * 1000),
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

  return { dbCanvasesToCreate, dbCanvasesToUpdate, dbCanvasesToDelete };
}

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
import { filesTable, slackConnectorsTable } from "../db/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";
import {
  getConnectorDetails,
  getCurrentFiles,
  handleDatabaseUpdates,
  updateLastSynced,
} from "./slack-db";
import { TIME_CONSTANTS } from "~/utils/slack";
import {
  calculateAgeInMonths,
  formatDate,
  generateMonthRanges,
} from "./dif-utils";

export interface FileMetadata {
  channelId: string;
  monthStart: string;
  monthEnd: string;
  dataType: string;
}

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
    await db.insert(slackConnectorsTable).values({
      connectorId: connector.id,
      channelInfo: params.channels,
      timezone: params.timezone ?? "UTC",
      lastSyncedAt: new Date(),
    });

    await runSlackConnector({ connectorId: connector.id }, session);
    return connector;
  } catch (error) {
    await deleteConnector(connector.id, session.id);
    throw error;
  }
}

export async function runSlackConnector(
  { connectorId, simulateDate }: { connectorId: string; simulateDate?: Date },
  session?: Session,
) {
  const effectiveDate = simulateDate ?? new Date();

  if (!session) {
    throw new Error("Session required for connector run");
  }

  const connector = await getConnector(connectorId, session.id);
  if (!connector) {
    throw new Error(`No connector found for ID: ${connectorId}`);
  }

  const connectorDetails = await getConnectorDetails(connectorId);
  if (!connectorDetails) {
    throw new Error(`No Slack connector found for ID: ${connectorId}`);
  }

  const currentFiles = await getCurrentFiles(connectorId);
  const channelInfo = connectorDetails.channelInfo;
  if (!channelInfo?.length) {
    throw new Error(`No channels found for connector ID: ${connectorId}`);
  }

  const descriptor: ConnectorRunDescriptor = {
    create: [],
    update: [],
    delete: [],
  };

  const filesToCreate: { id: string; metadata: FileMetadata; title: string }[] =
    [];
  const filesToUpdate: { id: string; metadata: FileMetadata }[] = [];
  const filesToDelete: { id: string }[] = [];

  // First, handle existing files
  for (const existingFile of currentFiles) {
    const metadata = existingFile.metadata as FileMetadata;
    const fileDate = new Date(metadata.monthStart);
    const monthDifference = calculateAgeInMonths(effectiveDate, fileDate);

    if (
      Math.abs(monthDifference) >=
      TIME_CONSTANTS.SYNC_THRESHOLDS.DELETE_AFTER_MONTHS
    ) {
      descriptor.delete.push({ id: existingFile.ndlFileId });
      filesToDelete.push({ id: existingFile.ndlFileId });
    } else if (
      Math.abs(monthDifference) <=
      TIME_CONSTANTS.SYNC_THRESHOLDS.UPDATE_WITHIN_MONTHS
    ) {
      const fileDescriptor = {
        id: existingFile.ndlFileId,
        url: `slack://messages?channel=${metadata.channelId}&start_time=${metadata.monthStart}&end_time=${metadata.monthEnd}&timezone=${encodeURIComponent(connectorDetails.timezone ?? "UTC")}`,
        type: "text/plain",
        title: existingFile.title,
        metadata: {
          ...metadata,
          connectorId,
        },
      };
      descriptor.update.push(fileDescriptor);
      filesToUpdate.push({
        id: existingFile.ndlFileId,
        metadata: metadata,
      });
    }
  }

  // Then handle creation of new files
  const monthRanges = generateMonthRanges(
    connectorDetails.timezone ?? "UTC",
    effectiveDate,
  );

  for (const channel of channelInfo) {
    for (const { start, end } of monthRanges) {
      const fileId = createNeedleFileId();
      const ageInMonths = calculateAgeInMonths(start, effectiveDate);

      const existingFile = currentFiles.find((f) => {
        const metadata = f.metadata as FileMetadata;
        return (
          metadata.channelId === channel.id &&
          metadata.monthStart === start.toISOString()
        );
      });

      // Only process files within our keeping window
      if (ageInMonths <= TIME_CONSTANTS.SYNC_THRESHOLDS.CREATE_WITHIN_MONTHS) {
        const title = `#${channel.name}_${formatDate(start)}`.replace(
          /\s+/g,
          "_",
        );

        const fileMetadata = {
          channelId: channel.id,
          monthStart: start.toISOString(),
          monthEnd: end.toISOString(),
          dataType: "slack_messages",
        };

        const fileDescriptor = {
          id: existingFile?.ndlFileId ?? fileId,
          url: `slack://messages?channel=${channel.id}&start_time=${start.toISOString()}&end_time=${end.toISOString()}&timezone=${encodeURIComponent(connectorDetails.timezone ?? "UTC")}`,
          type: "text/plain" as const,
          title,
          metadata: {
            ...fileMetadata,
            connectorId,
          },
        };

        if (
          existingFile &&
          ageInMonths <= TIME_CONSTANTS.SYNC_THRESHOLDS.UPDATE_WITHIN_MONTHS &&
          existingFile?.ndlFileId
        ) {
          descriptor.update.push(fileDescriptor);
          filesToUpdate.push({
            id: existingFile.ndlFileId,
            metadata: fileMetadata,
          });
        } else if (!existingFile) {
          descriptor.create.push(fileDescriptor);
          filesToCreate.push({
            id: fileId,
            metadata: fileMetadata,
            title,
          });
        }
      }
    }
  }

  await publishConnectorRun(connectorId, descriptor);
  await handleDatabaseUpdates(
    connectorId,
    filesToCreate,
    filesToUpdate,
    filesToDelete,
  );
  await updateLastSynced(connectorId);
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

  const [slackMetadata] = await db
    .select()
    .from(slackConnectorsTable)
    .where(eq(slackConnectorsTable.connectorId, connectorId));

  const files = await db
    .select()
    .from(filesTable)
    .where(eq(filesTable.ndlConnectorId, connectorId));

  return {
    ...connector,
    files,
    channelInfo: slackMetadata?.channelInfo,
    lastSyncedAt: slackMetadata?.lastSyncedAt,
  };
}

export async function deleteSlackConnector(
  { connectorId }: ConnectorRequest,
  session: Session,
) {
  const connector = await deleteConnector(connectorId, session.id);

  await db
    .delete(slackConnectorsTable)
    .where(eq(slackConnectorsTable.connectorId, connectorId));

  return connector;
}

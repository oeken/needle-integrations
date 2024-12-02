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

interface SlackConnectorRequest extends CreateConnectorRequest {
  channels: { id: string; name: string }[]; // Changed from channelIds
  timezone: string;
}

// Add the allowed MIME types
type AllowedMimeType =
  | "text/plain"
  | "application/vnd.google-apps.document"
  | "application/vnd.google-apps.presentation"
  | "application/vnd.google-apps.spreadsheet"
  | "application/pdf"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  | "text/calendar";

// Update interfaces to match database schema
export interface FileMetadata {
  channelId: string;
  monthStart: string; // changed from weekStart
  monthEnd: string; // changed from weekEnd
  dataType: string;
}

interface FileDescriptor {
  id: string;
  url: string;
  type: AllowedMimeType;
  title: string; // Add this field
  metadata: {
    channelId: string;
    monthStart: string; // changed from weekStart
    monthEnd: string; // changed from weekEnd
    dataType: string;
    connectorId: string;
  };
}

// Time-related business constants
const TIME_CONSTANTS = {
  // DEFAULT_TIMEZONE: "UTC",
  HISTORY_MONTHS: 2, // How many months of history to maintain
  SYNC_THRESHOLDS: {
    DELETE_AFTER_MONTHS: 2, // Delete files older than n months
    UPDATE_WITHIN_MONTHS: 1, // Update files less than n month old
    CREATE_WITHIN_MONTHS: 2, // Create files up to n months old
  },
  MONTH: {
    MAX_DURATION_MS: 31 * 24 * 60 * 60 * 1000, // ~31 days in milliseconds
  },
  MS_PER_MONTH: 1000 * 60 * 60 * 24 * 30, // Approximate milliseconds per month
} as const;

function generateMonthRanges(
  months = TIME_CONSTANTS.HISTORY_MONTHS,
  timezone: string,
  referenceDate?: Date,
): { start: Date; end: Date }[] {
  const monthRanges = [];
  const now = referenceDate ?? new Date();

  // Calculate start date
  const startDate = new Date(now);
  startDate.setMonth(now.getMonth() - months);

  // Convert dates to specified timezone
  const currentDate = new Date(
    startDate.toLocaleString("en-US", { timeZone: timezone }),
  );
  const endDate = new Date(now.toLocaleString("en-US", { timeZone: timezone }));

  // Set to start of month
  currentDate.setDate(1);
  currentDate.setHours(0, 0, 0, 0);

  while (currentDate <= endDate) {
    const monthStart = new Date(currentDate);
    const monthEnd = new Date(currentDate);
    // Set to last day of current month
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    monthEnd.setDate(0);
    monthEnd.setHours(23, 59, 59, 999);

    monthRanges.push({
      start: monthStart,
      end: monthEnd,
    });

    // Move to first day of next month
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  return monthRanges;
}
// Add this new function near the other date formatting functions
function formatDate(date: Date): string {
  return date
    .toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    })
    .replace(/\s+/g, "_");
}

function calculateAgeInMonths(date: Date): number {
  return (Date.now() - date.getTime()) / TIME_CONSTANTS.MS_PER_MONTH;
}

export async function createSlackConnector(
  params: SlackConnectorRequest,
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
      channelInfo: params.channels, // Store the full channel info
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

  const monthRanges = generateMonthRanges(
    TIME_CONSTANTS.HISTORY_MONTHS,
    connectorDetails.timezone ?? "UTC",
    effectiveDate,
  );

  const descriptor: ConnectorRunDescriptor = {
    create: [],
    update: [],
    delete: [],
  };

  const filesToCreate: { id: string; metadata: FileMetadata; title: string }[] =
    [];
  const filesToUpdate: { id: string; metadata: FileMetadata }[] = [];
  const filesToDelete: { id: string }[] = [];

  const now = new Date();

  for (const channel of channelInfo) {
    for (const { start, end } of monthRanges) {
      const fileId = createNeedleFileId();
      const ageInMonths = calculateAgeInMonths(start);

      const existingFile = currentFiles.find((f) => {
        const metadata = f.metadata as FileMetadata | null;
        return (
          metadata?.channelId === channel.id &&
          metadata?.monthStart === start.toISOString()
        );
      });

      const currentFileId = existingFile?.ndlFileId ?? fileId;

      // Use channel name in title
      const title = `#${channel.name}_${formatDate(start)}`.replace(
        /\s+/g,
        "_",
      );

      const fileMetadata: FileMetadata = {
        channelId: channel.id,
        monthStart: start.toISOString(),
        monthEnd: end.toISOString(),
        dataType: "slack_messages",
      };

      const fileDescriptor: FileDescriptor = {
        id: currentFileId,
        url: `slack://messages?channel=${channel.id}&start_time=${start.toISOString()}&end_time=${end.toISOString()}&timezone=${encodeURIComponent(connectorDetails.timezone ?? "UTC")}`,
        type: "text/plain",
        title,
        metadata: {
          ...fileMetadata,
          connectorId,
        },
      };

      if (
        ageInMonths > TIME_CONSTANTS.SYNC_THRESHOLDS.DELETE_AFTER_MONTHS &&
        existingFile
      ) {
        descriptor.delete.push({ id: currentFileId });
        filesToDelete.push({ id: currentFileId });
      } else if (
        ageInMonths <= TIME_CONSTANTS.SYNC_THRESHOLDS.UPDATE_WITHIN_MONTHS
      ) {
        if (existingFile) {
          descriptor.update.push(fileDescriptor);
          filesToUpdate.push({
            id: currentFileId,
            metadata: fileMetadata,
          });
        } else {
          descriptor.create.push(fileDescriptor);
          filesToCreate.push({
            id: currentFileId,
            metadata: fileMetadata,
            title: title, // Add this line
          });
        }
      } else if (
        !existingFile &&
        ageInMonths <= TIME_CONSTANTS.SYNC_THRESHOLDS.CREATE_WITHIN_MONTHS
      ) {
        descriptor.create.push(fileDescriptor);
        filesToCreate.push({
          id: currentFileId,
          metadata: fileMetadata,
          title: title, // Add this line
        });
      }
    }
  }

  // Add some debugging logs
  console.log("Files to create:", filesToCreate.length);
  console.log("Files to update:", filesToUpdate.length);
  console.log("Files to delete:", filesToDelete.length);

  console.log("descriptor", descriptor);

  // Publish all descriptors at once
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
    channelInfo: slackMetadata?.channelInfo, // Return full channel info
    lastSyncedAt: slackMetadata?.lastSyncedAt,
  };
}

export async function deleteSlackConnector(
  { connectorId }: ConnectorRequest,
  session: Session,
) {
  const connector = await deleteConnector(connectorId, session.id);

  // Clean up our database records
  await db
    .delete(slackConnectorsTable)
    .where(eq(slackConnectorsTable.connectorId, connectorId));

  return connector;
}

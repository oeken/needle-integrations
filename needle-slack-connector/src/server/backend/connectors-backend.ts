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
  metadata: {
    channelIds: string[];
  };
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
  weekStart: string;
  weekEnd: string;
  dataType: string;
}

interface DatabaseFile {
  id: number;
  ndlConnectorId: string;
  ndlFileId: string | null;
  metadata: unknown;
  createdAt: Date | null;
  title: string;
  updatedAt: Date | null;
}

interface FileDescriptor {
  id: string;
  url: string;
  type: AllowedMimeType;
  title: string; // Add this field
  metadata: {
    channelId: string;
    weekStart: string;
    weekEnd: string;
    dataType: string;
    connectorId: string;
  };
}

const CHUNK_SIZE = 50;
const MAX_RETRIES = 3;

function generateWeekRanges(
  months = 6,
  timezone = "UTC",
  referenceDate?: Date,
): { start: Date; end: Date }[] {
  const weeks = [];
  const now = referenceDate ?? new Date();

  // Calculate start date (6 months ago)
  const startDate = new Date(now);
  startDate.setMonth(now.getMonth() - months);

  // Convert dates to specified timezone
  const currentDate = new Date(
    startDate.toLocaleString("en-US", { timeZone: timezone }),
  );
  const endDate = new Date(now.toLocaleString("en-US", { timeZone: timezone }));

  // Rest of the function remains the same
  currentDate.setDate(currentDate.getDate() - currentDate.getDay() + 1);
  currentDate.setHours(0, 0, 0, 0);

  while (currentDate <= endDate) {
    const weekStart = new Date(currentDate);
    const weekEnd = new Date(currentDate);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    weeks.push({
      start: weekStart,
      end: weekEnd,
    });

    currentDate.setDate(currentDate.getDate() + 7);
  }

  return weeks;
}
// Add this new function near the other date formatting functions
function formatDate(date: Date): string {
  return date
    .toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
    .replace(/,/g, "");
}

function formatDateRange(start: Date, end: Date): string {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };
  return `${formatDate(start)}_${formatDate(end)}`;
}

function formatDateForError(date: Date): string {
  return date.toISOString();
}

function isValidDateRange(start: Date, end: Date): boolean {
  return (
    start < end && end.getTime() - start.getTime() <= 7 * 24 * 60 * 60 * 1000 // Max 7 days
  );
}

function calculateAgeInMonths(date: Date): number {
  return (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 30);
}

export async function createSlackConnector(
  params: SlackConnectorRequest,
  session: Session,
) {
  if (!params.metadata.channelIds.length) {
    throw new Error("At least one channel ID must be provided");
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
      channelIds: params.metadata.channelIds,
      lastSyncedAt: new Date(),
    });

    await runSlackConnector({ connectorId: connector.id }, session);
    return connector;
  } catch (error) {
    // Cleanup if database insert fails
    await deleteConnector(connector.id, session.id);
    throw error;
  }
}

export async function runSlackConnector(
  { connectorId, simulateDate }: { connectorId: string; simulateDate?: Date },
  session?: Session,
) {
  const TIMEZONE = "UTC";
  const effectiveDate = simulateDate ?? new Date(); // Use simulated date if provided

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
  const channelIds = connectorDetails.channelIds;
  if (!channelIds?.length) {
    throw new Error(`No channels found for connector ID: ${connectorId}`);
  }

  const weekRanges = generateWeekRanges(6, TIMEZONE, effectiveDate);

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

  for (const channelId of channelIds) {
    for (const { start, end } of weekRanges) {
      // Generate fileId only if we don't have an existing file
      const fileId = createNeedleFileId();
      const dateKey = formatDateRange(start, end);
      const ageInMonths =
        (effectiveDate.getTime() - start.getTime()) /
        (1000 * 60 * 60 * 24 * 30);

      const existingFile = currentFiles.find((f) => {
        if (!f.title) {
          throw new Error(
            `File ${f.id} has no title - this should never happen`,
          );
        }
        const metadata = f.metadata as FileMetadata | null;
        return (
          metadata?.channelId === channelId &&
          metadata?.weekStart === start.toISOString()
        );
      });

      // Use the existing file ID if available, otherwise use the new fileId
      const currentFileId = existingFile?.ndlFileId ?? fileId;

      // Format the title as requested
      const title =
        `#${channelId}_week-of_${formatDate(start)}-${formatDate(end)}`.replace(
          /\s+/g,
          "_",
        );

      const fileMetadata: FileMetadata = {
        channelId,
        weekStart: start.toISOString(),
        weekEnd: end.toISOString(),
        dataType: "slack_messages",
      };

      const fileDescriptor: FileDescriptor = {
        id: currentFileId, // Use consistent ID
        url: `slack://messages/${channelId}/${dateKey}`,
        type: "text/plain",
        title, // Add the title here
        metadata: {
          ...fileMetadata,
          connectorId,
        },
      };

      if (ageInMonths > 6 && existingFile) {
        descriptor.delete.push({ id: currentFileId });
        filesToDelete.push({ id: currentFileId });
      } else if (ageInMonths <= 1) {
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
      } else if (!existingFile && ageInMonths <= 6) {
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
    channelIds: slackMetadata?.channelIds,
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

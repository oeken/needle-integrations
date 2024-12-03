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
import { filesTable, slackConnectorsTable } from "../db/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";
import {
  getConnectorDetails,
  getCurrentFiles,
  handleDatabaseUpdates,
  updateLastSynced,
} from "./slack-db";
import { createNewFiles, processExistingFiles } from "./dif-utils";

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

  const {
    update,
    delete: deleteFiles,
    filesToUpdate,
    filesToDelete,
  } = processExistingFiles(
    currentFiles,
    effectiveDate,
    connectorId,
    connectorDetails.timezone ?? "UTC",
  );

  const { create, filesToCreate } = createNewFiles(
    channelInfo,
    currentFiles,
    effectiveDate,
    connectorId,
    connectorDetails.timezone ?? "UTC",
  );

  const descriptor: ConnectorRunDescriptor = {
    create,
    update,
    delete: deleteFiles,
  };

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

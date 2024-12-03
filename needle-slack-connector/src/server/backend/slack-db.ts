import { db } from "../db";
import {
  type FileInsert,
  type FileMetadata,
  filesTable,
  slackConnectorsTable,
} from "../db/schema";
import { and, eq, inArray } from "drizzle-orm";

export async function getConnectorDetails(connectorId: string) {
  return await db
    .select()
    .from(slackConnectorsTable)
    .where(eq(slackConnectorsTable.connectorId, connectorId))
    .then((rows) => rows[0]);
}

export async function getCurrentFiles(connectorId: string) {
  return await db
    .select()
    .from(filesTable)
    .where(eq(filesTable.ndlConnectorId, connectorId));
}

export async function updateLastSynced(connectorId: string) {
  await db
    .update(slackConnectorsTable)
    .set({ lastSyncedAt: new Date() })
    .where(eq(slackConnectorsTable.connectorId, connectorId));
}

export async function handleDatabaseUpdates(
  connectorId: string,
  createFiles: { id: string; metadata: FileMetadata; title: string }[],
  updateFiles: { id: string; metadata: FileMetadata }[],
  deleteFiles: { id: string }[],
) {
  // Handle creates
  if (createFiles.length > 0) {
    console.log(`Creating ${createFiles.length} files...`);
    const filesToInsert: FileInsert[] = createFiles.map((file) => ({
      ndlConnectorId: connectorId,
      ndlFileId: file.id,
      metadata: file.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
      title: file.title, // Now this will work because we're passing title in createFiles
    }));

    await db.insert(filesTable).values(filesToInsert);
  }

  // Handle updates
  for (const file of updateFiles) {
    await db
      .update(filesTable)
      .set({
        metadata: file.metadata,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(filesTable.ndlConnectorId, connectorId),
          eq(filesTable.ndlFileId, file.id),
        ),
      );
  }

  // Handle deletes
  if (deleteFiles.length > 0) {
    const fileIds = deleteFiles.map((f) => f.id);
    await db
      .delete(filesTable)
      .where(
        and(
          eq(filesTable.ndlConnectorId, connectorId),
          inArray(filesTable.ndlFileId, fileIds),
        ),
      );
  }
}

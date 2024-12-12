import { TIME_CONSTANTS } from "~/utils/slack";
import { type SlackChannel } from "../db/schema";
import { createNeedleFileId } from "@needle-ai/needle-sdk";
import {
  type ExistingFile,
  type ProcessedFiles,
  type NewFiles,
  type DbCanvasFile,
  type LiveCanvas,
} from "../slack/types";

export function generateMonthRanges(
  timezone: string,
  referenceDate: Date,
): { start: Date; end: Date }[] {
  const monthRanges = [];
  const effectiveDate = referenceDate;

  // Start from CREATE_WITHIN_MONTHS ago to include update window
  const startDate = new Date(effectiveDate);
  startDate.setMonth(
    startDate.getMonth() - TIME_CONSTANTS.SYNC_THRESHOLDS.CREATE_WITHIN_MONTHS,
  );
  startDate.setDate(1);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(effectiveDate);
  endDate.setDate(1); // First day of the reference month

  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const monthStart = new Date(currentDate);
    const monthEnd = new Date(currentDate);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    monthEnd.setDate(0);
    monthEnd.setHours(23, 59, 59, 999);

    monthRanges.push({ start: monthStart, end: monthEnd });
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  return monthRanges;
}

export function formatDate(date: Date): string {
  return date
    .toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    })
    .replace(/\s+/g, "_");
}

export function calculateAgeInMonths(
  referenceDate: Date,
  fileDate: Date,
): number {
  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth();
  const fileYear = fileDate.getFullYear();
  const fileMonth = fileDate.getMonth();

  return (fileYear - refYear) * 12 + (fileMonth - refMonth);
}

export function processExistingFiles(
  currentFiles: ExistingFile[],
  effectiveDate: Date,
  connectorId: string,
  timezone: string,
  deletedChannelIds: Set<string>,
): ProcessedFiles {
  // For database operations - full file data
  const dbFilesToDelete: { id: string }[] = [];
  const dbFilesToUpdate: {
    ndlFileId: string;
    channelId: string;
    monthStart: string;
    monthEnd: string;
    dataType: string;
  }[] = [];

  for (const file of currentFiles) {
    // Handle deleted channels first
    if (deletedChannelIds.has(file.channelId)) {
      dbFilesToDelete.push({ id: file.ndlFileId });
      continue;
    }

    const fileDate = new Date(file.monthStart);
    const monthDifference = calculateAgeInMonths(effectiveDate, fileDate);

    // Handle old files
    if (
      Math.abs(monthDifference) >=
      TIME_CONSTANTS.SYNC_THRESHOLDS.DELETE_AFTER_MONTHS
    ) {
      dbFilesToDelete.push({ id: file.ndlFileId });
      continue;
    }

    // Handle files to update
    if (
      Math.abs(monthDifference) <=
      TIME_CONSTANTS.SYNC_THRESHOLDS.UPDATE_WITHIN_MONTHS
    ) {
      dbFilesToUpdate.push({
        ndlFileId: file.ndlFileId,
        channelId: file.channelId,
        monthStart: file.monthStart,
        monthEnd: file.monthEnd,
        dataType: file.dataType,
      });
    }
  }

  // For connector descriptor - only IDs needed
  const descriptorUpdates = dbFilesToUpdate.map((file) => ({
    id: file.ndlFileId,
  }));

  return {
    update: descriptorUpdates,
    delete: dbFilesToDelete,
    filesToUpdate: dbFilesToUpdate,
    filesToDelete: dbFilesToDelete,
  };
}

export function createNewFiles(
  channelInfo: SlackChannel[],
  currentFiles: ExistingFile[],
  effectiveDate: Date,
  connectorId: string,
  timezone: string,
): NewFiles {
  // For database operations - full file data
  const dbFilesToCreate: {
    ndlFileId: string;
    channelId: string;
    monthStart: string;
    monthEnd: string;
    dataType: string;
    title?: string;
    ndlConnectorId: string;
  }[] = [];

  const monthRanges = generateMonthRanges(timezone, effectiveDate);

  for (const channel of channelInfo) {
    for (const { start, end } of monthRanges) {
      const fileId = createNeedleFileId();
      const ageInMonths = calculateAgeInMonths(start, effectiveDate);

      const fileExistsInChannel = currentFiles.find(
        (f) =>
          f.channelId === channel.id && f.monthStart === start.toISOString(),
      );

      if (
        ageInMonths <= TIME_CONSTANTS.SYNC_THRESHOLDS.CREATE_WITHIN_MONTHS &&
        !fileExistsInChannel
      ) {
        const title = `#${channel.name}_${formatDate(start)}`.replace(
          /\s+/g,
          "_",
        );

        dbFilesToCreate.push({
          ndlFileId: fileId,
          channelId: channel.id,
          monthStart: start.toISOString(),
          monthEnd: end.toISOString(),
          dataType: "slack_messages",
          title,
          ndlConnectorId: connectorId,
        });
      }
    }
  }

  // For connector descriptor - only IDs and minimal info needed
  const descriptorCreates = dbFilesToCreate.map((file) => ({
    id: file.ndlFileId,
    url: `slack://messages?channel=${file.channelId}&start_time=${file.monthStart}&end_time=${file.monthEnd}&timezone=${encodeURIComponent(timezone)}`,
    type: "text/plain" as const,
  }));

  return {
    create: descriptorCreates,
    filesToCreate: dbFilesToCreate,
  };
}

export function computeCanvasDiff(
  currentFiles: DbCanvasFile[],
  liveCanvases: LiveCanvas[],
) {
  const create: LiveCanvas[] = [];
  const update: LiveCanvas[] = [];
  const delete_: { channelId: string; originId: string }[] = [];

  // Check for new and updated canvases
  for (const liveCanvas of liveCanvases) {
    const currentCanvas = currentFiles.find(
      (f) =>
        f.channelId === liveCanvas.channelId &&
        f.originId === liveCanvas.originId,
    );

    if (!currentCanvas) {
      create.push(liveCanvas);
    } else {
      // Convert both timestamps to seconds for comparison
      const liveTimestamp = liveCanvas.updatedAt; // Already in seconds
      const currentTimestamp = Math.floor(
        currentCanvas.updatedAt.getTime() / 1000,
      ); // Convert ms to seconds

      if (liveTimestamp > currentTimestamp) {
        update.push(liveCanvas);
      }
    }
  }

  // Check for deleted canvases
  for (const currentFile of currentFiles) {
    const exists = liveCanvases.some(
      (lc) =>
        lc.channelId === currentFile.channelId &&
        lc.originId === currentFile.originId,
    );

    if (!exists) {
      delete_.push({
        channelId: currentFile.channelId,
        originId: currentFile.originId,
      });
    }
  }

  return { create, update, delete: delete_ };
}

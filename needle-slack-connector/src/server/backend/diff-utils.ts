import { TIME_CONSTANTS } from "~/utils/slack";
import { type SlackChannel } from "../db/schema";
import {
  createNeedleFileId,
  type ConnectorRunDescriptor,
} from "@needle-ai/needle-sdk";
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
  console.log("[generateMonthRanges] Input:", { timezone, referenceDate });
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

  console.log("[generateMonthRanges] Output:", monthRanges);
  return monthRanges;
}

export function formatDate(date: Date): string {
  console.log("[formatDate] Input:", date);
  const formatted = date
    .toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    })
    .replace(/\s+/g, "_");
  console.log("[formatDate] Output:", formatted);
  return formatted;
}

export function calculateAgeInMonths(
  referenceDate: Date,
  fileDate: Date,
): number {
  console.log("[calculateAgeInMonths] Input:", { referenceDate, fileDate });
  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth();
  const fileYear = fileDate.getFullYear();
  const fileMonth = fileDate.getMonth();

  const monthDifference = (fileYear - refYear) * 12 + (fileMonth - refMonth);

  console.log("[calculateAgeInMonths] Output:", monthDifference);
  return monthDifference;
}

export function processExistingFiles(
  currentFiles: ExistingFile[],
  effectiveDate: Date,
  connectorId: string,
  timezone: string,
): ProcessedFiles {
  console.log("[processExistingFiles] Input:", {
    currentFiles,
    effectiveDate,
    connectorId,
    timezone,
  });

  const update: ConnectorRunDescriptor["update"] = [];
  const deleteFiles: ConnectorRunDescriptor["delete"] = [];
  const filesToUpdate: {
    ndlFileId: string;
    channelId: string;
    monthStart: string;
    monthEnd: string;
    dataType: string;
  }[] = [];
  const filesToDelete: { id: string }[] = [];

  for (const file of currentFiles) {
    const fileDate = new Date(file.monthStart);
    const monthDifference = calculateAgeInMonths(effectiveDate, fileDate);

    console.log("[processExistingFiles] Processing file:", {
      file,
      monthDifference,
    });

    if (
      Math.abs(monthDifference) >=
      TIME_CONSTANTS.SYNC_THRESHOLDS.DELETE_AFTER_MONTHS
    ) {
      deleteFiles.push({ id: file.ndlFileId });
      filesToDelete.push({ id: file.ndlFileId });
    } else if (
      Math.abs(monthDifference) <=
      TIME_CONSTANTS.SYNC_THRESHOLDS.UPDATE_WITHIN_MONTHS
    ) {
      const fileDescriptor = {
        id: file.ndlFileId,
        url: `slack://messages?channel=${file.channelId}&start_time=${file.monthStart}&end_time=${file.monthEnd}&timezone=${encodeURIComponent(timezone)}`,
        type: "text/plain" as const,
        title: file.title,
        channelId: file.channelId,
        monthStart: file.monthStart,
        monthEnd: file.monthEnd,
        dataType: file.dataType,
      };
      update.push(fileDescriptor);
      filesToUpdate.push({
        ndlFileId: file.ndlFileId,
        channelId: file.channelId,
        monthStart: file.monthStart,
        monthEnd: file.monthEnd,
        dataType: file.dataType,
      });
    }
  }

  const result = { update, delete: deleteFiles, filesToUpdate, filesToDelete };
  console.log("[processExistingFiles] Output:", result);
  return result;
}

export function createNewFiles(
  channelInfo: SlackChannel[],
  currentFiles: ExistingFile[],
  effectiveDate: Date,
  connectorId: string,
  timezone: string,
): NewFiles {
  console.log("[createNewFiles] Input:", {
    channelInfo,
    currentFiles,
    effectiveDate,
    connectorId,
    timezone,
  });

  const create: ConnectorRunDescriptor["create"] = [];
  const filesToCreate: {
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
    console.log("[createNewFiles] Processing channel:", channel);

    for (const { start, end } of monthRanges) {
      const fileId = createNeedleFileId();
      const ageInMonths = calculateAgeInMonths(start, effectiveDate);

      const existingFile = currentFiles.find(
        (f) =>
          f.channelId === channel.id && f.monthStart === start.toISOString(),
      );

      console.log("[createNewFiles] Processing month range:", {
        start,
        end,
        ageInMonths,
        existingFile,
      });

      if (ageInMonths <= TIME_CONSTANTS.SYNC_THRESHOLDS.CREATE_WITHIN_MONTHS) {
        const title = `#${channel.name}_${formatDate(start)}`.replace(
          /\s+/g,
          "_",
        );

        if (!existingFile) {
          const fileDescriptor = {
            id: fileId,
            url: `slack://messages?channel=${channel.id}&start_time=${start.toISOString()}&end_time=${end.toISOString()}&timezone=${encodeURIComponent(timezone)}`,
            type: "text/plain" as const,
            title,
            channelId: channel.id,
            monthStart: start.toISOString(),
            monthEnd: end.toISOString(),
            dataType: "slack_messages" as const,
            ndlConnectorId: connectorId,
          };

          create.push(fileDescriptor);
          filesToCreate.push({
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
  }

  const result = { create, filesToCreate };
  console.log("[createNewFiles] Output:", result);
  return result;
}

export function computeCanvasDiff(
  currentFiles: DbCanvasFile[],
  liveCanvases: LiveCanvas[],
) {
  console.log("[computeCanvasDiff] Input:", { currentFiles, liveCanvases });

  const create: LiveCanvas[] = [];
  const update: LiveCanvas[] = [];
  const delete_: { channelId: string; originId: string }[] = [];

  // Check for new and updated canvases
  for (const liveCanvas of liveCanvases) {
    console.log("[computeCanvasDiff] Processing live canvas:", liveCanvas);

    const currentCanvas = currentFiles.find(
      (f) =>
        f.channelId === liveCanvas.channelId &&
        f.originId === liveCanvas.originId,
    );

    if (!currentCanvas) {
      create.push(liveCanvas);
    } else {
      if (liveCanvas.updatedAt > currentCanvas.updatedAt.getTime() / 1000) {
        update.push(liveCanvas);
      }
    }
  }

  // Check for deleted canvases
  for (const currentFile of currentFiles) {
    console.log(
      "[computeCanvasDiff] Checking for deleted canvas:",
      currentFile,
    );

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

  const result = { create, update, delete: delete_ };
  console.log("[computeCanvasDiff] Output:", result);
  return result;
}

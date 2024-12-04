import { TIME_CONSTANTS } from "~/utils/slack";
import {
  type CanvasFileMetadata,
  type FileMetadata,
  type SlackChannel,
} from "../db/schema";
import {
  createNeedleFileId,
  type ConnectorRunDescriptor,
} from "@needle-ai/needle-sdk";

export interface ExistingFile {
  ndlFileId: string;
  title: string | null;
  metadata: FileMetadata;
}

interface ProcessedFiles {
  update: ConnectorRunDescriptor["update"];
  delete: ConnectorRunDescriptor["delete"];
  filesToUpdate: { id: string; metadata: FileMetadata }[];
  filesToDelete: { id: string }[];
}

interface NewFiles {
  create: ConnectorRunDescriptor["create"];
  filesToCreate: { id: string; metadata: FileMetadata; title: string }[];
}

interface DbCanvasFile {
  ndlFileId: string;
  metadata: CanvasFileMetadata;
  updatedAt: Date;
}

export interface LiveCanvas {
  originId: string;
  channelId: string;
  url: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  dataType: "canvas";
}

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

  const monthDifference = (fileYear - refYear) * 12 + (fileMonth - refMonth);

  return monthDifference;
}

export function processExistingFiles(
  currentFiles: ExistingFile[],
  effectiveDate: Date,
  connectorId: string,
  timezone: string,
): ProcessedFiles {
  const update: ConnectorRunDescriptor["update"] = [];
  const deleteFiles: ConnectorRunDescriptor["delete"] = [];
  const filesToUpdate: { id: string; metadata: FileMetadata }[] = [];
  const filesToDelete: { id: string }[] = [];

  for (const existingFile of currentFiles) {
    const metadata = existingFile.metadata;
    const fileDate = new Date(metadata.monthStart);
    const monthDifference = calculateAgeInMonths(effectiveDate, fileDate);

    if (
      Math.abs(monthDifference) >=
      TIME_CONSTANTS.SYNC_THRESHOLDS.DELETE_AFTER_MONTHS
    ) {
      deleteFiles.push({ id: existingFile.ndlFileId });
      filesToDelete.push({ id: existingFile.ndlFileId });
    } else if (
      Math.abs(monthDifference) <=
      TIME_CONSTANTS.SYNC_THRESHOLDS.UPDATE_WITHIN_MONTHS
    ) {
      const fileDescriptor = {
        id: existingFile.ndlFileId,
        url: `slack://messages?channel=${metadata.channelId}&start_time=${metadata.monthStart}&end_time=${metadata.monthEnd}&timezone=${encodeURIComponent(timezone)}`,
        type: "text/plain" as const,
        title: existingFile.title,
        metadata: {
          ...metadata,
          connectorId,
        },
      };
      update.push(fileDescriptor);
      filesToUpdate.push({
        id: existingFile.ndlFileId,
        metadata: metadata,
      });
    }
  }

  return { update, delete: deleteFiles, filesToUpdate, filesToDelete };
}

export function createNewFiles(
  channelInfo: SlackChannel[],
  currentFiles: { metadata: FileMetadata; ndlFileId: string }[],
  effectiveDate: Date,
  connectorId: string,
  timezone: string,
): NewFiles {
  const create: ConnectorRunDescriptor["create"] = [];
  const filesToCreate: { id: string; metadata: FileMetadata; title: string }[] =
    [];
  const monthRanges = generateMonthRanges(timezone, effectiveDate);

  for (const channel of channelInfo) {
    for (const { start, end } of monthRanges) {
      const fileId = createNeedleFileId();
      const ageInMonths = calculateAgeInMonths(start, effectiveDate);

      const existingFile = currentFiles.find((f) => {
        const metadata = f.metadata;
        return (
          metadata.channelId === channel.id &&
          metadata.monthStart === start.toISOString()
        );
      });

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
          url: `slack://messages?channel=${channel.id}&start_time=${start.toISOString()}&end_time=${end.toISOString()}&timezone=${encodeURIComponent(timezone)}`,
          type: "text/plain" as const,
          title,
          metadata: {
            ...fileMetadata,
            connectorId,
          },
        };

        if (!existingFile) {
          create.push(fileDescriptor);
          filesToCreate.push({
            id: fileId,
            metadata: fileMetadata,
            title,
          });
        }
      }
    }
  }

  return { create, filesToCreate };
}

export function computeCanvasDiff(
  currentFiles: DbCanvasFile[],
  liveCanvases: LiveCanvas[],
) {
  const create: LiveCanvas[] = [];
  const update: LiveCanvas[] = [];
  const delete_: CanvasFileMetadata[] = [];

  console.log("Current files:", currentFiles);
  console.log("Live canvases:", liveCanvases);
  // Check for new and updated canvases
  for (const liveCanvas of liveCanvases) {
    const currentCanvas = currentFiles.find(
      (f) =>
        f.metadata.channelId === liveCanvas.channelId &&
        f.metadata.originId === liveCanvas.originId,
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
    const exists = liveCanvases.some(
      (lc) =>
        lc.channelId === currentFile.metadata.channelId &&
        lc.originId === currentFile.metadata.originId,
    );

    if (!exists) {
      delete_.push(currentFile.metadata);
    }
  }

  console.log("Create:", create);
  console.log("Update:", update);
  console.log("Delete:", delete_);

  return { create, update, delete: delete_ };
}

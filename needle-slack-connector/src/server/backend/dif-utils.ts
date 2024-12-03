import { TIME_CONSTANTS } from "~/utils/slack";
import { type FileMetadata } from "../db/schema";
import {
  createNeedleFileId,
  type ConnectorRunDescriptor,
} from "@needle-ai/needle-sdk";

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

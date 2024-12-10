import type { NextRequest } from "next/server";

export function getIdFromPath(
  request: NextRequest,
  prevSegment: string,
): string {
  const url = new URL(request.url);
  const segments = url.pathname.split("/");
  const index = segments.findIndex((segment) => segment === prevSegment);
  if (index < 0) {
    throw new Error(`Segment "${prevSegment}" not found in the URL path`);
  }
  const segment = segments[index + 1];
  if (!segment) {
    throw new Error("ID corresponding to the segment not found");
  }
  return segment;
}

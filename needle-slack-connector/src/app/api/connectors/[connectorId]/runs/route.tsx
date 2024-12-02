import { type NextRequest, NextResponse } from "next/server";
import { verifyJwt } from "@needle-ai/needle-sdk";

import { runSlackConnector } from "~/server/backend/connectors-backend";
import { getIdFromPath } from "~/utils/api-utils";

// Run connector
export async function POST(request: NextRequest): Promise<NextResponse> {
  const [authType, token] =
    request.headers.get("Authorization")?.split(" ") ?? [];

  if (authType !== "Bearer") {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  if (!token) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  await verifyJwt(token);
  const connectorId = getIdFromPath(request, "connectors");
  await runSlackConnector({ connectorId });

  const body = { result: "OK" };
  return new NextResponse(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
    },
  });
}

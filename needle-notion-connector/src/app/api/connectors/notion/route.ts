import { NextResponse } from "next/server";
import { fetchAccessToken } from "~/utils/notion-utils";
import { env } from "~/env";

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "code is required" });
  }

  try {
    const token = await fetchAccessToken(code);
    const appHost = env.NEXT_PUBLIC_APP_HOST;
    return NextResponse.redirect(
      appHost + `/connectors/notion?token=${JSON.stringify(token)}`,
    );
  } catch (err: unknown) {
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message });
    }
  }
}

import { NextResponse } from "next/server";
import { fetchAccessToken } from "~/app/connectors/notion/actions";
import { env } from "~/env";

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "code is required" });
  }

  try {
    const accessToken = await fetchAccessToken(code);
    const appHost = env.NEXT_PUBLIC_APP_HOST;
    return NextResponse.redirect(
      appHost + `/connectors/notion?accessToken=${accessToken}`,
    );
  } catch (err: unknown) {
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message });
    }
  }
}

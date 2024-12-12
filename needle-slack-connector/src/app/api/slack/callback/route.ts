import { NextResponse } from "next/server";
import { env } from "~/env";

import {
  buildRedirectUri,
  buildSuccessRedirectUrl,
  exchangeCodeForTokens,
  validateSlackConfig,
} from "~/utils/slack";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "No code provided" }, { status: 400 });
  }

  if (!validateSlackConfig()) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  try {
    const redirectUri = buildRedirectUri(env.NEXT_PUBLIC_APP_URL);

    const tokens = await exchangeCodeForTokens(code, redirectUri);

    if (!tokens.authed_user) {
      return NextResponse.json(
        { error: "Missing user authentication data" },
        { status: 400 },
      );
    }

    const accessToken = tokens.authed_user.access_token;
    const slackUserId = tokens.authed_user.id;

    if (!accessToken || !slackUserId) {
      return NextResponse.json(
        { error: "Missing access token or user ID" },
        { status: 400 },
      );
    }

    const redirectUrl = buildSuccessRedirectUrl(
      env.NEXT_PUBLIC_APP_URL,
      accessToken,
      slackUserId,
    );

    return NextResponse.redirect(redirectUrl);
  } catch {
    return NextResponse.json(
      { error: "Failed to exchange code" },
      { status: 500 },
    );
  }
}

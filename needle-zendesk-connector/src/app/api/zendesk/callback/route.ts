import { NextResponse } from "next/server";
import { env } from "~/env";
import { type ZendeskErrorResponse } from "~/server/zendesk/types";

import {
  buildRedirectUri,
  buildSuccessRedirectUrl,
  exchangeCodeForTokens,
  validateZendeskConfig,
} from "~/utils/zendesk";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "No code provided" }, { status: 400 });
  }

  if (!validateZendeskConfig()) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  try {
    const redirectUri = buildRedirectUri(env.NEXT_PUBLIC_APP_URL);
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    if ("error" in tokens) {
      const errorResponse = tokens as unknown as ZendeskErrorResponse;
      return NextResponse.json(
        {
          error: errorResponse.error,
          description: errorResponse.error_description,
        },
        { status: 400 },
      );
    }

    console.log(tokens);

    const redirectUrl = buildSuccessRedirectUrl(
      env.NEXT_PUBLIC_APP_URL,
      tokens.access_token,
    );

    return NextResponse.redirect(redirectUrl);
  } catch {
    return NextResponse.json(
      { error: "Failed to exchange code" },
      { status: 500 },
    );
  }
}

import { env } from "~/env";
import { type SlackTokenResponse } from "~/server/slack/types";

export const SLACK_BOT_SCOPES = [
  "channels:history",
  "channels:read",
  "groups:history",
  "groups:read",
  "team:read",
  "users:read",
] as const;

const SLACK_USER_SCOPES = [
  "channels:history",
  "channels:read",
  "groups:history",
  "groups:read",
  "team:read", // Add this for workspace/team info
  "users:read", // Add this for user info
  "users:read.email", // Add this for user email
  "im:history", // Add this for direct messages
  "im:read", // Add this for direct message channels
  "mpim:history", // Add this for multi-person instant messages
  "mpim:read", // Add this for multi-person message channels
] as const;

export function buildSlackTokenUrl(): string {
  return "https://slack.com/api/oauth.v2.access";
}

export function buildRedirectUri(baseUrl: string): string {
  return `${baseUrl}/api/slack/callback`;
}

export function buildSuccessRedirectUrl(
  baseUrl: string,
  accessToken: string,
): string {
  return `${baseUrl}/connectors/slack?state=${accessToken}`;
}

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
): Promise<SlackTokenResponse> {
  const tokenUrl = buildSlackTokenUrl();

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: env.NEXT_PUBLIC_SLACK_CLIENT_ID,
      client_secret: env.SLACK_CLIENT_SECRET,
      redirect_uri: redirectUri,
    }),
  });

  return response.json() as Promise<SlackTokenResponse>;
}

export function validateSlackConfig() {
  const requiredVars = [
    env.NEXT_PUBLIC_SLACK_CLIENT_ID,
    env.SLACK_CLIENT_SECRET,
  ];

  return requiredVars.every(Boolean);
}

// Bot OAuth URL (xoxb- token)
export function buildSlackBotOAuthUrl(baseUrl: string): string {
  const params = new URLSearchParams({
    client_id: env.NEXT_PUBLIC_SLACK_CLIENT_ID,
    scope: SLACK_BOT_SCOPES.join(","),
    redirect_uri: buildRedirectUri(baseUrl),
  });

  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

// User OAuth URL (xoxp- token)
export function buildSlackUserOAuthUrl(baseUrl: string): string {
  const params = new URLSearchParams({
    client_id: env.NEXT_PUBLIC_SLACK_CLIENT_ID,
    user_scope: SLACK_USER_SCOPES.join(","),
    redirect_uri: buildRedirectUri(baseUrl),
  });

  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

import { env } from "~/env";
import { type SlackOAuthResponse } from "~/server/slack/types";

export const TIME_CONSTANTS = {
  SYNC_THRESHOLDS: {
    DELETE_AFTER_MONTHS: 3, // Delete files older than 3 months from reference date
    UPDATE_WITHIN_MONTHS: 1, // Update files within 1 month of reference date
    CREATE_WITHIN_MONTHS: 2, // Keep/create files up to 2 months from reference date
  },
  MS_PER_MONTH: 1000 * 60 * 60 * 24 * 30,
} as const;

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
  "users.profile:read", // Add this for user profile
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
  slackUserId: string,
): string {
  return `${baseUrl}/connectors/slack?state=${accessToken}&slackUserId=${slackUserId}`;
}

export async function exchangeCodeForTokens(code: string, redirectUri: string) {
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

  return response.json() as Promise<SlackOAuthResponse>;
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

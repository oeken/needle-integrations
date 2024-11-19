import { env } from "~/env";
import { type ZendeskTokenResponse } from "~/server/zendesk/types";

export const ZENDESK_SCOPES = ["read"] as const;

export function buildZendeskTokenUrl(subdomain: string): string {
  return `https://${subdomain}.zendesk.com/oauth/tokens`;
}

export function buildRedirectUri(baseUrl: string): string {
  return `${baseUrl}/api/zendesk/callback`;
}

export function buildSuccessRedirectUrl(
  baseUrl: string,
  accessToken: string,
): string {
  return `${baseUrl}/connectors/zendesk?state=${accessToken}`;
}

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
): Promise<ZendeskTokenResponse> {
  const tokenUrl = buildZendeskTokenUrl(env.NEXT_PUBLIC_ZENDESK_SUBDOMAIN);

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      client_id: env.NEXT_PUBLIC_ZENDESK_CLIENT_ID,
      client_secret: env.ZENDESK_SECRET,
      redirect_uri: redirectUri,
      scope: ZENDESK_SCOPES.join(" "),
    }),
  });

  return response.json() as Promise<ZendeskTokenResponse>;
}

export function validateZendeskConfig() {
  const requiredVars = [
    env.NEXT_PUBLIC_ZENDESK_SUBDOMAIN,
    env.NEXT_PUBLIC_ZENDESK_CLIENT_ID,
    env.ZENDESK_SECRET,
  ];

  return requiredVars.every(Boolean);
}

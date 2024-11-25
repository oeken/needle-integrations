"use server";

import { cookies } from "next/headers";

type TokenResponse = {
  access_token: string;
  token_type: string;
  bot_id: string;
  workspace_name: string;
  workspace_icon: string;
  workspace_id: string;
  owner: {
    type: string;
    user: {
      object: string;
      id: string;
      name: string;
      avatar_url: string;
      type: string;
      person: unknown[];
    };
  };
  duplicated_template_id: string | null;
  request_id: string;
};

type ErrorResponse = {
  error: string;
  error_description: string;
  request_id: string;
};

//  const NOTION_ACCESS_TOKEN = "notion_access_token";

export async function fetchAccessToken(code: string): Promise<string> {
  const clientId = process.env.NOTION_OAUTH_CLIENT_ID;
  const clientSecret = process.env.NOTION_OAUTH_CLIENT_SECRET;
  const oauthUrl = process.env.NOTION_OAUTH_URL;
  const redirectUri = new URLSearchParams(oauthUrl).get("redirect_uri");

  const response = await fetch("https://api.notion.com/v1/oauth/token", {
    method: "POST",
    headers: {
      authorization: "Basic " + btoa(clientId + ":" + clientSecret),
      "content-type": "application/json",
    },
    body: JSON.stringify({
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });

  const json = (await response.json()) as unknown;

  if (response.status !== 200) {
    throw new Error((json as ErrorResponse).error_description);
  }

  const accessToken = (json as TokenResponse).access_token;
  // cookies().set(NOTION_ACCESS_TOKEN, accessToken);
  return accessToken;
}

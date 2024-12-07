import { isFullDatabase } from "@notionhq/client";
import type {
  DatabaseObjectResponse,
  PageObjectResponse,
  SearchResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { env } from "~/env";
import type { NotionError, NotionToken } from "~/models/notion-models";

export async function fetchAccessToken(code: string): Promise<NotionToken> {
  const clientId = env.NOTION_OAUTH_CLIENT_ID;
  const clientSecret = env.NOTION_OAUTH_CLIENT_SECRET;
  const oauthUrl = env.NOTION_OAUTH_URL;
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
    throw new Error((json as NotionError).error_description);
  }

  return json as NotionToken;
}

export function getPageTitle(
  result: SearchResponse["results"][number],
): string {
  if (isFullDatabase(result)) {
    return result.title[0]?.plain_text ?? "(unnamed database)";
  }
  const properties = (result as PageObjectResponse).properties;
  const title = Object.values(properties).find((p) => p.type === "title");
  return title?.title[0]?.plain_text ?? "(unnamed page)";
}

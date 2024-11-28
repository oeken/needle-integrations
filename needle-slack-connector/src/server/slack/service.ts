import {
  type SlackMessage,
  type SlackChannel,
} from "~/models/connectors-models";
import {
  type SlackResponse,
  type SlackTeamResponse,
  type SlackChannelsResponse,
  type SlackMessagesResponse,
  type PaginatedResponse,
} from "./types";

export const createSlackService = (accessToken: string) => {
  async function fetchSlackApi<T extends SlackResponse>(
    endpoint: string,
    params: Record<string, string> = {},
  ): Promise<T> {
    try {
      console.log("[Slack Service] Calling endpoint:", endpoint);

      const cleanEndpoint = endpoint.replace(/^\/+/, "");
      const url = new URL(`https://slack.com/api/${cleanEndpoint}`);

      const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(params).toString(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as T;
      console.log("[Slack Service] Response data:", data);

      if (!data.ok) {
        console.error("[Slack Service] API error:", data.error);
        throw new Error(data.error ?? "Slack API error");
      }

      return data;
    } catch (error) {
      console.error("[Slack Service] Fetch error:", error);
      throw error;
    }
  }

  const getWorkspaces = async (): Promise<
    PaginatedResponse<SlackTeamResponse["team"]>
  > => {
    console.log("[Slack Service] Getting workspaces");
    const data = await fetchSlackApi<SlackTeamResponse>("team.info");

    return {
      items: [data.team],
      metadata: {
        totalCount: 1,
        pageCount: 1,
        totalPages: 1,
        hasMore: false,
      },
    };
  };

  const getChannels = async (
    workspaceId: string,
  ): Promise<PaginatedResponse<SlackChannel>> => {
    console.log("[Slack Service] Getting channels for workspace:", workspaceId);
    const data = await fetchSlackApi<SlackChannelsResponse>(
      "conversations.list",
      {
        team_id: workspaceId,
        types: "public_channel,private_channel",
      },
    );

    return {
      items: data.channels ?? [],
      metadata: {
        totalCount: data.channels?.length ?? 0,
        pageCount: 1,
        totalPages: 1,
        hasMore: !!data.response_metadata?.next_cursor,
      },
    };
  };

  const getMessages = async (
    channelId: string,
  ): Promise<PaginatedResponse<SlackMessage>> => {
    console.log("[Slack Service] Getting messages for channel:", channelId);
    const data = await fetchSlackApi<SlackMessagesResponse>(
      "conversations.history",
      {
        channel: channelId,
      },
    );

    return {
      items: data.messages ?? [],
      metadata: {
        totalCount: data.messages?.length ?? 0,
        pageCount: 1,
        totalPages: 1,
        hasMore: data.has_more ?? false,
      },
    };
  };

  return {
    getChannels,
    getMessages,
    getWorkspaces,
  };
};

import {
  type SlackWorkspace,
  type SlackChannelsResponse,
  type SlackMessagesResponse,
  type SlackCanvasResponse,
  type SlackUserInfoResponse,
} from "./types";
import { type TimezoneInfo } from "~/models/connectors-models";

export function createSlackService(accessToken: string) {
  const getWorkspaces = async (): Promise<SlackWorkspace> => {
    const response = await fetch("https://slack.com/api/team.info", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const data = (await response.json()) as SlackWorkspace;
    console.log(
      "Slack API Response - getWorkspaces (team.info):",
      JSON.stringify(data, null, 2),
    );
    return data;
  };

  const getChannels = async (): Promise<SlackChannelsResponse> => {
    const params = new URLSearchParams({
      types: ["public_channel", "private_channel"].join(","),
    });

    const response = await fetch(
      `https://slack.com/api/conversations.list?${params}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    const data = (await response.json()) as SlackChannelsResponse;
    console.log(
      "Slack API Response - getChannels (conversations.list):",
      JSON.stringify(data, null, 2),
    );
    return data;
  };

  const getMessages = async (
    channelIds: string[],
  ): Promise<SlackMessagesResponse[]> => {
    const messagesPromises = channelIds.map(async (channelId) => {
      const response = await fetch(
        `https://slack.com/api/conversations.history?channel=${channelId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        },
      );
      const data = (await response.json()) as SlackMessagesResponse;
      console.log(
        `Slack API Response - getMessages (conversations.history) for channel ${channelId}:`,
        JSON.stringify(data, null, 2),
      );
      return data;
    });

    const data = await Promise.all(messagesPromises);
    return data;
  };

  const getUserTimezone = async (userId: string): Promise<TimezoneInfo> => {
    const response = await fetch(
      `https://slack.com/api/users.info?user=${userId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    const data = (await response.json()) as SlackUserInfoResponse;
    console.log(
      "Slack API Response - getUserTimezone (users.info):",
      JSON.stringify(data, null, 2),
    );

    if (!data.ok || !data.user) {
      throw new Error("Failed to fetch user timezone");
    }

    return {
      timezone: data.user.tz,
      timezoneLabel: data.user.tz_label,
      timezoneOffset: data.user.tz_offset,
    };
  };

  const getCanvases = async (
    channelId: string,
  ): Promise<SlackCanvasResponse> => {
    const params = new URLSearchParams({
      channel: channelId,
      types: "spaces",
      limit: "100",
    });

    const response = await fetch(`https://slack.com/api/files.list?${params}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const data = (await response.json()) as SlackCanvasResponse;
    console.log(
      "Slack API Response - getCanvases (files.list):",
      JSON.stringify(data, null, 2),
    );
    return data;
  };

  return {
    getWorkspaces,
    getChannels,
    getMessages,
    getUserTimezone,
    getCanvases,
  };
}

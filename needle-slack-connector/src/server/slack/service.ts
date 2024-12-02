export interface TimezoneInfo {
  timezone: string;
  timezoneLabel: string;
  timezoneOffset: number;
}

interface SlackUserResponse {
  ok: boolean;
  user?: {
    tz: string;
    tz_label: string;
    tz_offset: number;
  };
}

export function createSlackService(accessToken: string) {
  const getWorkspaces = async () => {
    const response = await fetch("https://slack.com/api/team.info", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const data = (await response.json()) as unknown;

    return data;
  };

  const getChannels = async () => {
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

    const data = (await response.json()) as unknown;

    return data;
  };

  const getMessages = async (channelIds: string[]) => {
    const messagesPromises = channelIds.map((channelId) =>
      fetch(
        `https://slack.com/api/conversations.history?channel=${channelId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        },
      ).then((response) => response.json()),
    );

    const results = (await Promise.all(messagesPromises)) as unknown[];

    return results;
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

    const data = (await response.json()) as SlackUserResponse;

    console.log({ data });

    if (!data.ok || !data.user) {
      throw new Error("Failed to fetch user timezone");
    }

    return {
      timezone: data.user.tz,
      timezoneLabel: data.user.tz_label,
      timezoneOffset: data.user.tz_offset,
    };
  };

  return {
    getWorkspaces,
    getChannels,
    getMessages,
    getUserTimezone,
  };
}

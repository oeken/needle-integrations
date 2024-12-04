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

export interface SlackCanvasResponse {
  ok: boolean;
  files?: Array<{
    id: string;
    created: number;
    timestamp: number;
    name: string;
    title: string;
    mimetype: string;
    filetype: string;
    pretty_type: string;
    user: string;
    user_team: string;
    editable: boolean;
    size: number;
    mode: string;
    is_external: boolean;
    external_type: string;
    is_public: boolean;
    public_url_shared: boolean;
    display_as_bot: boolean;
    username: string;
    url_private: string;
    url_private_download: string;
    permalink: string;
    url_static_preview: string;
    quip_thread_id: string;
    updated: number;
    update_notification: number;
    is_channel_space: boolean;
    linked_channel_id: string;
    channels: string[];
    groups: string[];
    ims: string[];
    teams_shared_with: string[];
    access: string;
    comments_count: number;
    title_blocks: Array<{
      type: string;
      block_id: string;
      elements: Array<{
        type: string;
        elements: Array<{
          type: string;
          channel_id?: string;
        }>;
      }>;
    }>;
    last_read: number;
    editors: string[];
    edit_timestamp: number;
    show_badge: boolean;
  }>;
  response_metadata?: {
    next_cursor: string;
  };
  error?: string;
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

    const data = (await Promise.all(messagesPromises)) as unknown[];

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

    const data = (await response.json()) as SlackUserResponse;

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

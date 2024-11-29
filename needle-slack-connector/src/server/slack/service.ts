export class SlackService {
  constructor(private readonly accessToken: string) {}

  async getWorkspaceTimezone() {
    const response = await fetch("https://slack.com/api/users.profile.get", {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const data = (await response.json()) as unknown;
    return data;
  }

  async getWorkspaces() {
    const response = await fetch("https://slack.com/api/team.info", {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const data = (await response.json()) as unknown;

    return data;
  }

  async getChannels() {
    const params = new URLSearchParams({
      types: ["public_channel", "private_channel"].join(","),
    });

    const response = await fetch(
      `https://slack.com/api/conversations.list?${params}`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    const data = (await response.json()) as unknown;

    return data;
  }

  async getMessages(channelIds: string[]) {
    const messagesPromises = channelIds.map((channelId) =>
      fetch(
        `https://slack.com/api/conversations.history?channel=${channelId}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
        },
      ).then((response) => response.json()),
    );

    const results = (await Promise.all(messagesPromises)) as unknown[];

    return results;
  }
}

export function createSlackService(accessToken: string) {
  return new SlackService(accessToken);
}

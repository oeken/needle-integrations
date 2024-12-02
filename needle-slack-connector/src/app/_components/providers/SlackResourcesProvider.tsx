"use client";

import { createContext, useContext, useState } from "react";
import {
  type SlackMessage,
  type SlackWorkspace,
} from "~/models/connectors-models";
import { type TimezoneInfo } from "~/server/slack/service";
import { type SlackChannel } from "~/server/db/schema"; // Use SlackChannel type from schema

import { api } from "~/trpc/react";
import { skipToken } from "@tanstack/react-query";

type SlackResourcesContextType = {
  selectedChannels: SlackChannel[]; // Use SlackChannel type
  setSelectedChannels: (channels: SlackChannel[]) => void;
  channels: SlackChannel[] | undefined;
  messages: SlackMessage[] | undefined;
  workspace: SlackWorkspace | undefined;
  userTimezone: TimezoneInfo | undefined;
};

const SlackResourcesContext = createContext<SlackResourcesContextType | null>(
  null,
);

interface SlackResourcesProviderProps {
  children: React.ReactNode;
  credentials: string;
  userId: string;
}

export function SlackResourcesProvider({
  children,
  credentials,
  userId,
}: SlackResourcesProviderProps) {
  const [selectedChannels, setSelectedChannels] = useState<SlackChannel[]>([]);

  const { data: workspace } = api.connectors.getWorkspaces.useQuery({
    accessToken: credentials,
  });

  const { data: channels } = api.connectors.getChannels.useQuery({
    accessToken: credentials,
  });

  const { data: userTimezone } = api.connectors.getUserTimezone.useQuery({
    accessToken: credentials,
    userId,
  }) as { data: TimezoneInfo | undefined };

  const { data: messages } = api.connectors.getMessages.useQuery(
    selectedChannels.length > 0
      ? {
          accessToken: credentials,
          channelIds: selectedChannels.map((channel) => channel.id),
        }
      : skipToken,
    {
      enabled: selectedChannels.length > 0,
    },
  );

  const mappedMessages = messages?.flatMap(
    (channelMessages) =>
      channelMessages.messages.map((msg) => ({
        ...msg,
      })) as SlackMessage[],
  );

  return (
    <SlackResourcesContext.Provider
      value={{
        workspace,
        selectedChannels,
        setSelectedChannels,
        channels: channels?.channels,
        messages: mappedMessages,
        userTimezone,
      }}
    >
      {children}
    </SlackResourcesContext.Provider>
  );
}

export function useSlackResources() {
  const context = useContext(SlackResourcesContext);
  if (!context) {
    throw new Error(
      "useSlackResources must be used within a SlackResourcesProvider",
    );
  }
  return context;
}

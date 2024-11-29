"use client";

import { createContext, useContext, useState, useEffect } from "react";
import {
  type SlackMessage,
  type SlackChannel,
  type SlackWorkspace,
} from "~/models/connectors-models";

import { api } from "~/trpc/react";
import { skipToken } from "@tanstack/react-query";

type SlackResourcesContextType = {
  selectedChannelIds: string[];
  setSelectedChannelIds: (ids: string[]) => void;
  channels: SlackChannel[] | undefined;
  messages: SlackMessage[] | undefined;
  workspace: SlackWorkspace | undefined;
};

const SlackResourcesContext = createContext<SlackResourcesContextType | null>(
  null,
);

interface SlackResourcesProviderProps {
  children: React.ReactNode;
  credentials: string;
}

export function SlackResourcesProvider({
  children,
  credentials,
}: SlackResourcesProviderProps) {
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>([]);

  const { data: workspace } = api.connectors.getWorkspaces.useQuery({
    accessToken: credentials,
  });

  const { data: channels } = api.connectors.getChannels.useQuery({
    accessToken: credentials,
  });

  const { data: messages } = api.connectors.getMessages.useQuery(
    selectedChannelIds.length > 0
      ? {
          accessToken: credentials,
          channelIds: selectedChannelIds,
        }
      : skipToken,
    {
      enabled: selectedChannelIds.length > 0,
    },
  );

  const { data: workspaceTimezone } =
    api.connectors.getWorkspaceTimezone.useQuery({
      accessToken: credentials,
    });

  console.log("workspaceTimezone:", { workspaceTimezone });

  // Map the response to SlackMessage array
  const mappedMessages = messages?.flatMap(
    (channelMessages) =>
      channelMessages.messages.map((msg) => ({
        ...msg,
      })) as SlackMessage[],
  );

  console.log("mappedMessages:", { mappedMessages });
  return (
    <SlackResourcesContext.Provider
      value={{
        workspace,
        selectedChannelIds,
        setSelectedChannelIds,
        channels: channels?.channels,
        messages: mappedMessages,
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

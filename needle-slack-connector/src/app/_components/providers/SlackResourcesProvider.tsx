"use client";

import { createContext, useContext, useState, useEffect } from "react";
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
  isLoading: boolean;
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

  const { data: workspace, isLoading: isWorkspaceLoading } =
    api.connectors.getWorkspaces.useQuery({
      accessToken: credentials,
    });

  const { data: channels, isLoading: isChannelsLoading } =
    api.connectors.getChannels.useQuery({
      accessToken: credentials,
    });

  const { data: userTimezone, isLoading: isTimezoneLoading } =
    api.connectors.getUserTimezone.useQuery({
      accessToken: credentials,
      userId,
    }) as { data: TimezoneInfo | undefined; isLoading: boolean };

  const { data: messages, isLoading: isMessagesLoading } =
    api.connectors.getMessages.useQuery(
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

  console.log({ messages });

  const mappedMessages = messages?.flatMap(
    (channelMessages, index) =>
      channelMessages.messages.map((msg) => ({
        ...msg,
        channelName: selectedChannels[index]?.name,
        channelId: selectedChannels[index]?.id,
      })) as SlackMessage[],
  );

  const { data: canvases } = api.connectors.getCanvases.useQuery(
    selectedChannels.length > 0
      ? {
          accessToken: credentials,
          channelId: selectedChannels[selectedChannels.length - 1]?.id ?? "",
        }
      : skipToken,
  );

  useEffect(() => {
    if (canvases && selectedChannels.length > 0) {
      const lastSelectedChannel = selectedChannels[selectedChannels.length - 1];

      if (canvases && selectedChannels.length > 0 && lastSelectedChannel) {
        const updatedChannel: SlackChannel = {
          id: lastSelectedChannel.id,
          name: lastSelectedChannel.name,
          canvases:
            canvases.files?.map((file) => ({
              channelId: lastSelectedChannel.id,
              url: file.url_private,
              title: file.title,
              originId: file.id,
              createdAt: file.created,
              updatedAt: file.updated,
              dataType: "canvas",
            })) ?? [],
        };

        setSelectedChannels((prev) => [...prev.slice(0, -1), updatedChannel]);
      }
    }
  }, [canvases]);

  const handleChannelSelect = (channels: SlackChannel[]) => {
    setSelectedChannels(channels);
  };

  const isLoading = isChannelsLoading;

  return (
    <SlackResourcesContext.Provider
      value={{
        workspace,
        selectedChannels,
        setSelectedChannels: handleChannelSelect,
        channels: channels?.channels,
        messages: mappedMessages,
        userTimezone,
        isLoading,
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

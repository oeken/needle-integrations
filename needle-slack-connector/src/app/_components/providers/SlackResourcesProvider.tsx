"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { type TimezoneInfo } from "~/models/connectors-models";
import {
  type SlackMessage,
  type SlackWorkspace,
  type SlackChannel,
  type SlackChannelWithCanvases,
} from "~/server/slack/types";

import { api } from "~/trpc/react";

type SlackResourcesContextType = {
  selectedChannels: SlackChannelWithCanvases[];
  setSelectedChannels: (channels: SlackChannelWithCanvases[]) => void;
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
  const [selectedChannels, setSelectedChannels] = useState<
    SlackChannelWithCanvases[]
  >([]);

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

  const { data: messages } = api.connectors.getMessages.useQuery(
    {
      accessToken: credentials,
      channelIds: selectedChannels.map((channel) => channel.id),
    },
    {
      enabled: selectedChannels.length > 0,
    },
  );

  const { data: canvases } = api.connectors.getCanvases.useQuery(
    {
      accessToken: credentials,
      channelId: selectedChannels[selectedChannels.length - 1]?.id ?? "",
    },
    {
      enabled: selectedChannels.length > 0,
    },
  );

  const mappedMessages = messages?.flatMap((channelMessages, index) => {
    if (!channelMessages.messages) return [];
    return channelMessages.messages.map((msg) => ({
      ...msg,
      channelName: selectedChannels[index]?.name ?? "",
      channelId: selectedChannels[index]?.id ?? "",
    }));
  });

  useEffect(() => {
    if (canvases && selectedChannels.length > 0) {
      const lastSelectedChannel = selectedChannels[selectedChannels.length - 1];

      if (canvases && selectedChannels.length > 0 && lastSelectedChannel) {
        const updatedChannel: SlackChannelWithCanvases = {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvases]);

  const handleChannelSelect = (channels: SlackChannelWithCanvases[]) => {
    setSelectedChannels(channels);
  };

  const isLoading =
    isChannelsLoading || isWorkspaceLoading || isTimezoneLoading;

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

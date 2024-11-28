"use client";

import { createContext, useContext, useState, useEffect } from "react";
import {
  type SlackMessage,
  type SlackChannel,
  type SlackWorkspace,
} from "~/models/connectors-models";

import { api } from "~/trpc/react";

type SlackType = "message" | "channel";

type SlackResourcesContextType = {
  selectedWorkspaceId: string | null;
  setSelectedWorkspaceId: (id: string | null) => void;
  selectedTeamDomain: string | null;
  setSelectedTeamDomain: (domain: string | null) => void;
  selectedChannelIds: string[];
  setSelectedChannelIds: (ids: string[]) => void;
  selectedTypes: SlackType[];
  setSelectedTypes: (types: SlackType[]) => void;
  channels: SlackChannel[];
  messages: SlackMessage[];
  workspaces: SlackWorkspace[];
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
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(
    null,
  );
  const [selectedTeamDomain, setSelectedTeamDomain] = useState<string | null>(
    null,
  );
  const [selectedTypes, setSelectedTypes] = useState<SlackType[]>([
    "message",
    "channel",
  ]);
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>([]);

  // Replace useSlackWorkspaces with tRPC query
  const { data: workspacesData } = api.connectors.getSlackWorkspaces.useQuery({
    accessToken: credentials,
  });

  // Get channels for the workspace
  const { data: channelsData } = api.connectors.getSlackChannels.useQuery(
    {
      accessToken: credentials,
      workspaceId: selectedWorkspaceId ?? undefined,
    },
    {
      enabled: !!selectedWorkspaceId,
    },
  );

  // Get messages only for selected channels
  const { data: messagesData } = api.connectors.getSlackMessages.useQuery(
    {
      accessToken: credentials,
      channelIds: selectedChannelIds,
    },
    {
      enabled: selectedChannelIds.length > 0,
    },
  );

  // Auto-select first workspace if none selected
  useEffect(() => {
    if (!selectedWorkspaceId && (workspacesData?.items?.length ?? 0) > 0) {
      const firstWorkspace = workspacesData?.items[0];
      console.log(
        "[SlackResourcesProvider] Auto-selecting workspace:",
        firstWorkspace,
      );
      setSelectedWorkspaceId(firstWorkspace?.id ?? null);
    }
  }, [workspacesData, selectedWorkspaceId]);

  return (
    <SlackResourcesContext.Provider
      value={{
        workspaces: workspacesData?.items ?? [],
        selectedWorkspaceId,
        setSelectedWorkspaceId,
        selectedTeamDomain,
        setSelectedTeamDomain,
        selectedTypes,
        setSelectedTypes,
        selectedChannelIds,
        setSelectedChannelIds,
        channels: channelsData?.items ?? [],
        messages: messagesData?.items ?? [],
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

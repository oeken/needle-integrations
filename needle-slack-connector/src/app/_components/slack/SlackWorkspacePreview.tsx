/* eslint-disable @next/next/no-img-element */
"use client";

import { useSlackResources } from "../providers/SlackResourcesProvider";
import { CreateConnectorForm } from "../CreateConnnectorForm";
import { type Collection } from "@needle-ai/needle-sdk";
import { SlackResourceInfo } from "./SlackResourceInfo";

import { SlackMessageRow } from "./SlackMessageRow";
import { FileTextIcon } from "lucide-react";
import { type SlackChannelWithCanvases } from "~/server/slack/types";

export function SlackWorkspacePreview({
  collections,
  credentials,
}: {
  collections: Collection[];
  credentials: string;
}) {
  const {
    channels,
    messages,
    workspace,
    selectedChannels,
    setSelectedChannels,
    isLoading,
  } = useSlackResources();

  const handleChannelToggle = (channel: SlackChannelWithCanvases) => {
    const isSelected = selectedChannels.some((c) => c.id === channel.id);
    const newChannels = isSelected
      ? selectedChannels.filter((c) => c.id !== channel.id)
      : [...selectedChannels, channel];
    setSelectedChannels(newChannels);
  };

  const getMessagesPerChannel = () => {
    const messageGroups: Record<string, typeof messages> = {};

    // Group messages by channel
    messages?.forEach((message) => {
      if (!messageGroups[message.channelName]) {
        messageGroups[message.channelName] = [];
      }
      messageGroups[message.channelName]?.push(message);
    });

    // Sort messages within each channel by timestamp (newest first)
    Object.values(messageGroups).forEach((group) => {
      group!.sort((a, b) => Number(b.ts) - Number(a.ts));
    });

    // Calculate messages to show per channel
    const selectedChannelNames = selectedChannels.map((c) => c.name);
    const maxChannelsToShow = 5;
    const messagesToShow: typeof messages = [];

    selectedChannelNames
      .slice(0, maxChannelsToShow)
      .forEach((channelName, index) => {
        const channelMessages = messageGroups[channelName] ?? [];
        // Decreasing number of messages per channel: 5, 3, 2, 1, 1
        const messagesToTake =
          index === 0 ? 5 : index === 1 ? 3 : index === 2 ? 2 : 1;
        messagesToShow.push(...channelMessages.slice(0, messagesToTake));
      });

    return messagesToShow;
  };

  if (isLoading || !workspace) {
    return (
      <div className="my-8 flex flex-col">
        <div className="mt-4 text-center text-zinc-500">
          Loading workspace resources...
        </div>
      </div>
    );
  }

  return (
    <div className="my-8 space-y-6">
      <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
        <div className="flex items-center gap-4">
          <img
            src={workspace.team.icon?.image_68 ?? "/icons/slack.svg"}
            alt={workspace.team.name}
            className="h-12 w-12 rounded-lg"
          />
          <div>
            <h2 className="text-xl font-semibold">{workspace.team.name}</h2>
            <p className="text-sm text-zinc-500">
              {workspace.team.domain}.slack.com
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-medium">
              Showing {channels?.length ?? 0} Channels
            </h3>
          </div>

          {!channels?.length ? (
            <div className="text-sm text-zinc-500">No channels available</div>
          ) : (
            <div className="space-y-2">
              {channels.map((channel) => {
                // Get only canvas tabs count
                const canvasCount =
                  channel.properties?.tabs?.filter(
                    (tab) => tab.type === "canvas" && tab.data?.file_id,
                  ).length ?? 0;

                return (
                  <div
                    key={channel.id}
                    onClick={() => handleChannelToggle(channel)}
                    className="flex cursor-pointer items-center rounded-md border border-zinc-200 p-4 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
                  >
                    <input
                      type="checkbox"
                      checked={selectedChannels.some(
                        (c) => c.id === channel.id,
                      )}
                      className="mr-4 rounded border-gray-300"
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => handleChannelToggle(channel)}
                    />
                    <div className="flex flex-1 items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">#{channel.name}</p>
                        {canvasCount > 0 && (
                          <div className="flex items-center gap-1">
                            <FileTextIcon className="h-4 w-4 text-zinc-400" />
                            <span className="text-xs text-zinc-500">
                              This channel contains {canvasCount}{" "}
                              {canvasCount === 1 ? "Canvas" : "Canvases"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-6 space-y-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-medium">
              {selectedChannels.length > 5 ? (
                <span className="text-zinc-500">
                  Showing messages from first 5 channels
                </span>
              ) : (
                "Recent Messages"
              )}
            </h3>
          </div>

          {!messages?.length ? (
            <div className="text-sm text-zinc-500">No messages available</div>
          ) : (
            <div className="space-y-2">
              {getMessagesPerChannel().map((message) => (
                <SlackMessageRow key={message.ts} message={message} />
              ))}
            </div>
          )}
        </div>
      </div>

      <SlackResourceInfo />
      <CreateConnectorForm
        collections={collections}
        credentials={credentials}
      />
    </div>
  );
}

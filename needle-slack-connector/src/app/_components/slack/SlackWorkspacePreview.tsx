/* eslint-disable @next/next/no-img-element */
"use client";

import { useSlackResources } from "../providers/SlackResourcesProvider";
import { CreateConnectorForm } from "../CreateConnnectorForm";
import { type Collection } from "@needle-ai/needle-sdk";
import { formatDateTime } from "~/utils/format-date-time";
import { SlackResourceInfo } from "./SlackResourceInfo";
import { type SlackChannel } from "~/server/db/schema";

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

  const handleChannelToggle = (channel: SlackChannel) => {
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
                            <svg
                              className="h-4 w-4 text-zinc-400"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                              />
                            </svg>
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
                <div
                  key={message.ts}
                  className="rounded-md border border-zinc-200 p-4 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                          #{message.channelName}
                        </span>
                      </div>
                      <span className="text-sm text-zinc-500">
                        {formatDateTime(
                          new Date(Number(message.ts) * 1000).toISOString(),
                        )}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {message.text}
                    </p>
                  </div>
                </div>
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

import {
  ConnectorRequestSchema,
  CreateConnectorRequestSchema,
  type SlackChannel,
  type SlackMessage,
  SlackResponseSchema,
  type SlackWorkspace,
} from "~/models/connectors-models";
import { createTRPCRouter, procedure } from "~/server/api/trpc";
import {
  createZendeskConnector,
  deleteZendeskConnector,
  getZendeskConnector,
  listZendeskConnectors,
} from "~/server/backend/connectors-backend";
import { createSlackService } from "~/server/slack/service";
import { z } from "zod";

export const connectorsRouter = createTRPCRouter({
  create: procedure
    .input(CreateConnectorRequestSchema)
    .mutation(async ({ ctx, input }) =>
      createZendeskConnector(input, ctx.session),
    ),

  list: procedure.query(async ({ ctx }) => listZendeskConnectors(ctx.session)),

  get: procedure
    .input(ConnectorRequestSchema)
    .query(async ({ ctx, input }) => getZendeskConnector(input, ctx.session)),

  delete: procedure
    .input(ConnectorRequestSchema)
    .mutation(async ({ ctx, input }) =>
      deleteZendeskConnector(input, ctx.session),
    ),

  // New Slack data routes using our defined schemas
  getSlackWorkspaces: procedure
    .input(SlackResponseSchema)
    .query(async ({ input }) => {
      const slackService = createSlackService(input.accessToken);
      try {
        const workspaces = await slackService.getWorkspaces();

        return {
          items: workspaces.items,
          count: workspaces.items.length,
        };
      } catch (error) {
        console.error("[getSlackWorkspaces] Error:", error);
        throw error;
      }
    }),

  getSlackData: procedure
    .input(SlackResponseSchema)
    .query(async ({ input }) => {
      const slackService = createSlackService(input.accessToken);

      if (!input.workspaceId) {
        return {
          messages: {
            items: [],
            metadata: {
              totalCount: 0,
              pageCount: 0,
              hasMore: false,
              totalPages: 0,
            },
          },
          channels: {
            items: [],
            metadata: {
              totalCount: 0,
              pageCount: 0,
              hasMore: false,
              totalPages: 0,
            },
          },
        };
      }

      const results = {
        messages: {
          items: [] as SlackMessage[],
          metadata: {
            totalCount: 0,
            pageCount: 0,
            hasMore: false,
            totalPages: 0,
          },
        },
        channels: {
          items: [] as SlackChannel[],
          metadata: {
            totalCount: 0,
            pageCount: 0,
            hasMore: false,
            totalPages: 0,
          },
        },
      };

      if (input.fetchChannels) {
        results.channels = await slackService.getChannels(input.workspaceId);
      }

      if (input.fetchMessages && results.channels.items.length > 0) {
        // Fetch messages from all channels in parallel
        const messagePromises = results.channels.items
          .filter((channel) => channel.id) // Filter out channels without IDs
          .map(async (channel) => {
            try {
              const channelMessages = await slackService.getMessages(
                channel.id,
              );
              return {
                channelId: channel.id,
                channelName: channel.name,
                messages: channelMessages,
              };
            } catch (error) {
              console.error(
                `Error fetching messages for channel ${channel.id}:`,
                error,
              );
              return {
                channelId: channel.id,
                channelName: channel.name,
                messages: {
                  items: [],
                  metadata: {
                    totalCount: 0,
                    pageCount: 0,
                    hasMore: false,
                    totalPages: 0,
                  },
                },
              };
            }
          });

        const channelMessages = await Promise.all(messagePromises);

        // Combine all messages and update metadata
        const allMessages = channelMessages.flatMap((cm) =>
          cm.messages.items.map((msg) => ({
            ...msg,
            channelId: cm.channelId,
            channelName: cm.channelName,
          })),
        );

        results.messages = {
          items: allMessages,
          metadata: {
            totalCount: allMessages.length,
            pageCount: channelMessages.reduce(
              (acc, cm) => acc + cm.messages.metadata.pageCount,
              0,
            ),
            hasMore: channelMessages.some((cm) => cm.messages.metadata.hasMore),
            totalPages: channelMessages.reduce(
              (acc, cm) => acc + cm.messages.metadata.totalPages,
              0,
            ),
          },
        };
      }

      return results;
    }),

  getSlackChannels: procedure
    .input(
      z.object({
        accessToken: z.string(),
        workspaceId: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      if (!input.workspaceId) {
        return {
          items: [],
          metadata: {
            totalCount: 0,
            pageCount: 0,
            hasMore: false,
            totalPages: 0,
          },
        };
      }

      const slackService = createSlackService(input.accessToken);
      return slackService.getChannels(input.workspaceId);
    }),

  getSlackMessages: procedure
    .input(
      z.object({
        accessToken: z.string(),
        channelIds: z.array(z.string()),
      }),
    )
    .query(async ({ input }) => {
      if (input.channelIds.length === 0) {
        return {
          items: [],
          metadata: {
            totalCount: 0,
            pageCount: 0,
            hasMore: false,
            totalPages: 0,
          },
        };
      }

      const slackService = createSlackService(input.accessToken);

      // First get all channels to map names
      const channelsData = await slackService.getChannels(input.workspaceId);
      const channelMap = new Map(
        channelsData.items.map((channel) => [channel.id, channel.name]),
      );

      // Fetch messages for all selected channels in parallel
      const messagePromises = input.channelIds.map(async (channelId) => {
        try {
          const channelMessages = await slackService.getMessages(channelId);
          return {
            channelId,
            channelName: channelMap.get(channelId) ?? "unknown-channel",
            messages: channelMessages,
          };
        } catch (error) {
          console.error(
            `Error fetching messages for channel ${channelId}:`,
            error,
          );
          return {
            channelId,
            channelName: channelMap.get(channelId) ?? "unknown-channel",
            messages: {
              items: [],
              metadata: {
                totalCount: 0,
                pageCount: 0,
                hasMore: false,
                totalPages: 0,
              },
            },
          };
        }
      });

      const channelMessages = await Promise.all(messagePromises);

      // Combine all messages and update metadata
      const allMessages = channelMessages.flatMap((cm) =>
        cm.messages.items.map((msg) => ({
          ...msg,
          channelId: cm.channelId,
          channelName: cm.channelName,
        })),
      );

      return {
        items: allMessages,
        metadata: {
          totalCount: allMessages.length,
          pageCount: channelMessages.reduce(
            (acc, cm) => acc + cm.messages.metadata.pageCount,
            0,
          ),
          hasMore: channelMessages.some((cm) => cm.messages.metadata.hasMore),
          totalPages: channelMessages.reduce(
            (acc, cm) => acc + cm.messages.metadata.totalPages,
            0,
          ),
        },
      };
    }),
});

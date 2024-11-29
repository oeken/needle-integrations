import {
  ConnectorRequestSchema,
  CreateConnectorRequestSchema,
  SlackAuthSchema,
  SlackChannelRequestSchema,
  type SlackChannelsResponse,
  SlackMessagesRequestSchema,
  type SlackMessagesResponse,
  type SlackWorkspace,
} from "~/models/connectors-models";
import { createTRPCRouter, procedure } from "~/server/api/trpc";
import {
  createSlackConnector,
  deleteSlackConnector,
  getSlackConnector,
  listSlackConnectors,
  runSlackConnector,
} from "~/server/backend/connectors-backend";
import { createSlackService } from "~/server/slack/service";

export const connectorsRouter = createTRPCRouter({
  create: procedure
    .input(CreateConnectorRequestSchema)
    .mutation(async ({ ctx, input }) =>
      createSlackConnector(
        {
          ...input,
          metadata: { channelIds: input.selectedChannelIds },
        },
        ctx.session,
      ),
    ),

  list: procedure.query(async ({ ctx }) => listSlackConnectors(ctx.session)),

  get: procedure
    .input(ConnectorRequestSchema)
    .query(async ({ ctx, input }) => getSlackConnector(input, ctx.session)),

  delete: procedure
    .input(ConnectorRequestSchema)
    .mutation(async ({ ctx, input }) =>
      deleteSlackConnector(input, ctx.session),
    ),

  run: procedure
    .input(ConnectorRequestSchema)
    .mutation(async ({ ctx, input }) => runSlackConnector(input, ctx.session)),

  getWorkspaces: procedure.input(SlackAuthSchema).query(async ({ input }) => {
    const slackService = createSlackService(input.accessToken);
    return (await slackService.getWorkspaces()) as SlackWorkspace;
  }),

  getChannels: procedure
    .input(SlackChannelRequestSchema)
    .query(async ({ input }) => {
      const slackService = createSlackService(input.accessToken);
      return (await slackService.getChannels()) as SlackChannelsResponse;
    }),

  getMessages: procedure
    .input(SlackMessagesRequestSchema)
    .query(async ({ input }) => {
      const slackService = createSlackService(input.accessToken);
      return (await slackService.getMessages(
        input.channelIds,
      )) as SlackMessagesResponse[];
    }),

  getWorkspaceTimezone: procedure
    .input(SlackAuthSchema)
    .query(async ({ input }) => {
      const slackService = createSlackService(input.accessToken);
      return await slackService.getWorkspaceTimezone();
    }),
});

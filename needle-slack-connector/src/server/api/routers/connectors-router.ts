import {
  CreateConnectorRequestSchema,
  ConnectorRequestSchema,
  SlackAuthSchema,
  SlackChannelRequestSchema,
  SlackMessagesRequestSchema,
  SlackUserTimezoneSchema,
  SlackCanvasRequestSchema,
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
      createSlackConnector(input, ctx.session),
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
    return await slackService.getWorkspaces();
  }),

  getChannels: procedure
    .input(SlackChannelRequestSchema)
    .query(async ({ input }) => {
      const slackService = createSlackService(input.accessToken);
      return await slackService.getChannels();
    }),

  getMessages: procedure
    .input(SlackMessagesRequestSchema)
    .query(async ({ input }) => {
      const slackService = createSlackService(input.accessToken);
      return await slackService.getMessages(input.channelIds);
    }),

  getUserTimezone: procedure
    .input(SlackUserTimezoneSchema)
    .query(async ({ input }) => {
      const slackService = createSlackService(input.accessToken);
      return await slackService.getUserTimezone(input.userId);
    }),

  getCanvases: procedure
    .input(SlackCanvasRequestSchema)
    .query(async ({ input }) => {
      const slackService = createSlackService(input.accessToken);
      return await slackService.getCanvases(input.channelId);
    }),
});

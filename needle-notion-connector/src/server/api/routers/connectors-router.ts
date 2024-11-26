import {
  ConnectorRequestSchema,
  CreateConnectorRequestSchema,
} from "~/models/connectors-models";
import { createTRPCRouter, procedure } from "~/server/api/trpc";
import {
  createNotionConnector,
  deleteNotionConnector,
  getNotionConnector,
  listNotionConnectors,
  runNotionConnector,
} from "~/server/backend/connectors-backend";

export const connectorsRouter = createTRPCRouter({
  create: procedure
    .input(CreateConnectorRequestSchema)
    .mutation(async ({ ctx, input }) =>
      createNotionConnector(input, ctx.session),
    ),

  list: procedure.query(async ({ ctx }) => listNotionConnectors(ctx.session)),

  get: procedure
    .input(ConnectorRequestSchema)
    .query(async ({ ctx, input }) => getNotionConnector(input, ctx.session)),

  delete: procedure
    .input(ConnectorRequestSchema)
    .mutation(async ({ ctx, input }) =>
      deleteNotionConnector(input, ctx.session),
    ),

  run: procedure
    .input(ConnectorRequestSchema)
    .mutation(async ({ ctx, input }) => runNotionConnector(input, ctx.session)),
});

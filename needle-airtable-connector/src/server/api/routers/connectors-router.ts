import {
  ConnectorRequestSchema,
  CreateConnectorRequestSchema,
} from "~/models/connectors-models";
import { createTRPCRouter, procedure } from "~/server/api/trpc";
import {
  createWebConnector,
  deleteWebConnector,
  getWebConnector,
  listWebConnectors,
  runWebConnector,
} from "~/server/backend/connectors-backend";

export const connectorsRouter = createTRPCRouter({
  create: procedure
    .input(CreateConnectorRequestSchema)
    .mutation(async ({ ctx, input }) => createWebConnector(input, ctx.session)),

  list: procedure.query(async ({ ctx }) => listWebConnectors(ctx.session)),

  get: procedure
    .input(ConnectorRequestSchema)
    .query(async ({ ctx, input }) => getWebConnector(input, ctx.session)),

  delete: procedure
    .input(ConnectorRequestSchema)
    .mutation(async ({ ctx, input }) => deleteWebConnector(input, ctx.session)),

  run: procedure
    .input(ConnectorRequestSchema)
    .mutation(async ({ ctx, input }) => runWebConnector(input, ctx.session)),
});

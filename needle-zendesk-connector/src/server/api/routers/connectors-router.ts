import {
  ConnectorRequestSchema,
  CreateConnectorRequestSchema,
} from "~/models/connectors-models";
import { createTRPCRouter, procedure } from "~/server/api/trpc";
import {
  createZendeskConnector,
  deleteZendeskConnector,
  getZendeskConnector,
  listZendeskConnectors,
} from "~/server/backend/connectors-backend";

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
});

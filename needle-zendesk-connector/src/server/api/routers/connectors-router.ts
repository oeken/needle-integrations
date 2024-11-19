import {
  ConnectorRequestSchema,
  CreateConnectorRequestSchema,
  ZendeskResponseSchema,
} from "~/models/connectors-models";
import { createTRPCRouter, procedure } from "~/server/api/trpc";
import {
  createZendeskConnector,
  deleteZendeskConnector,
  getZendeskConnector,
  listZendeskConnectors,
  runZendeskConnector,
} from "~/server/backend/connectors-backend";
import { createZendeskService } from "~/server/zendesk/service";

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

  run: procedure
    .input(ConnectorRequestSchema)
    .mutation(async ({ ctx, input }) =>
      runZendeskConnector(input, ctx.session),
    ),

  getData: procedure.input(ZendeskResponseSchema).query(async ({ input }) => {
    const zendeskService = createZendeskService(input.accessToken);
    if (input.organizationId) {
      return zendeskService.searchByOrganization(
        input.organizationId.toString(),
        {
          pageSize: input.pageSize,
          maxPages: input.maxPages,
          fetchArticles: input.fetchArticles,
          fetchTickets: input.fetchTickets,
        },
      );
    }
    return { tickets: { items: [] }, articles: { items: [] } };
  }),

  getOrganizations: procedure
    .input(ZendeskResponseSchema)
    .query(async ({ input }) => {
      const zendeskService = createZendeskService(input.accessToken);
      return zendeskService.getOrganizations({
        pageSize: input.pageSize,
        maxPages: input.maxPages,
      });
    }),
});

import { z } from "zod";
import { createTRPCRouter, procedure } from "../trpc";
import { createZendeskService } from "~/server/zendesk/service";

export const zendeskRouter = createTRPCRouter({
  getData: procedure
    .input(
      z.object({
        accessToken: z.string(),
        pageSize: z.number().optional(),
        maxPages: z.number().optional(),
      }),
    )
    .query(async ({ input }) => {
      const zendeskService = createZendeskService(input.accessToken);
      return zendeskService.fetchAll({
        pageSize: input.pageSize,
        maxPages: input.maxPages,
      });
    }),
});

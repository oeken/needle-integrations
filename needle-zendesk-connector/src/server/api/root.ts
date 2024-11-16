import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { connectorsRouter } from "./routers/connectors-router";
import { zendeskRouter } from "./routers/zendesk-router";

export const appRouter = createTRPCRouter({
  connectors: connectorsRouter,
  zendesk: zendeskRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);

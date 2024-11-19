import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { connectorsRouter } from "./routers/connectors-router";

export const appRouter = createTRPCRouter({
  connectors: connectorsRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);

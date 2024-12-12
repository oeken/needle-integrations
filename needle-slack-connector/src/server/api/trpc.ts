import { initTRPC } from "@trpc/server";
import { validateSession } from "@needle-ai/needle-sdk";
import { cookies } from "next/headers";
import superjson from "superjson";
import { ZodError } from "zod";

import { db } from "~/server/db";

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const sessionId = cookies().get("auth_session")?.value;
  if (!sessionId) {
    throw new Error("User must be authenticated to access this resource");
  }
  const { user, session } = await validateSession(sessionId);
  if (!user || !session) {
    throw new Error("User must be authenticated to access this resource");
  }

  return {
    db,
    user,
    session,
    ...opts,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;

export const createTRPCRouter = t.router;

export const procedure = t.procedure;

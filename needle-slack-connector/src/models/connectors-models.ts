import { z } from "zod";

export const CreateConnectorRequestSchema = z.object({
  name: z.string(),
  collectionId: z.string(),
  credentials: z.string(),
  cronJob: z.string(),
  cronJobTimezone: z.string(),
  channels: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      canvases: z
        .array(
          z.object({
            channelId: z.string(),
            originId: z.string(),
            url: z.string(),
            title: z.string(),
            createdAt: z.number(),
            updatedAt: z.number(),
            dataType: z.string(),
          }),
        )
        .optional(),
    }),
  ),
  timezone: z.string(),
});

export const ConnectorRequestSchema = z.object({
  connectorId: z.string(),
  simulateDate: z.date().optional(),
});

export const SlackAuthSchema = z.object({
  accessToken: z.string(),
});

export const SlackUserTimezoneSchema = SlackAuthSchema.extend({
  userId: z.string(),
});

export const SlackWorkspaceRequestSchema = SlackAuthSchema.extend({});

export const SlackChannelRequestSchema = SlackAuthSchema.extend({});

export const SlackCanvasRequestSchema = SlackAuthSchema.extend({
  channelId: z.string(),
});

export const SlackMessagesRequestSchema = SlackAuthSchema.extend({
  channelIds: z.array(z.string()),
});

export const TimezoneInfoSchema = z.object({
  timezone: z.string(),
  timezoneLabel: z.string(),
  timezoneOffset: z.number(),
});

// Type exports for the request/response schemas
export type CreateConnectorRequest = z.infer<
  typeof CreateConnectorRequestSchema
>;
export type ConnectorRequest = z.infer<typeof ConnectorRequestSchema>;
export type SlackAuth = z.infer<typeof SlackAuthSchema>;
export type SlackWorkspaceRequest = z.infer<typeof SlackWorkspaceRequestSchema>;
export type SlackChannelRequest = z.infer<typeof SlackChannelRequestSchema>;
export type SlackCanvasRequest = z.infer<typeof SlackCanvasRequestSchema>;
export type SlackMessagesRequest = z.infer<typeof SlackMessagesRequestSchema>;
export type TimezoneInfo = z.infer<typeof TimezoneInfoSchema>;

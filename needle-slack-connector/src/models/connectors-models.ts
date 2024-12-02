import { z } from "zod";

export const CreateConnectorRequestSchema = z.object({
  name: z.string(),
  collectionId: z.string(),
  credentials: z.string(),
  cronJob: z.string(),
  cronJobTimezone: z.string(),
  channels: z.array(z.object({ id: z.string(), name: z.string() })), // Ensure this matches the expected structure
  timezone: z.string(),
});

export const SlackMessageSchema = z.object({
  channelName: z.string(), // We are adding this to make it easier to identify the channel the message belongs to
  type: z.string(),
  subtype: z.string().optional(),
  user: z.string(),
  text: z.string(),
  ts: z.string(),
  client_msg_id: z.string().optional(),
  team: z.string().optional(),
  blocks: z
    .array(
      z.object({
        type: z.string(),
        block_id: z.string(),
        elements: z.array(
          z.object({
            type: z.string(),
            elements: z.array(
              z.object({
                type: z.string(),
                text: z.string().optional(),
                range: z.string().optional(),
              }),
            ),
          }),
        ),
      }),
    )
    .optional(),
  reactions: z
    .array(
      z.object({
        name: z.string(),
        users: z.array(z.string()),
        count: z.number(),
      }),
    )
    .optional(),
});

export const SlackChannelSchema = z.object({
  id: z.string(),
  context_team_id: z.string(),
  name: z.string(),
  is_channel: z.boolean(),
  is_private: z.boolean(),
  created: z.number(),
  creator: z.string(),
  is_archived: z.boolean(),
  is_general: z.boolean(),
  num_members: z.number(),
  topic: z.object({
    value: z.string(),
    creator: z.string(),
    last_set: z.number(),
  }),
  purpose: z.object({
    value: z.string(),
    creator: z.string(),
    last_set: z.number(),
  }),
});

export const SlackWorkspaceSchema = z.object({
  ok: z.boolean(),
  team: z.object({
    id: z.string(),
    name: z.string(),
    url: z.string(),
    domain: z.string(),
    email_domain: z.string(),
    icon: z.object({
      image_default: z.boolean(),
      image_34: z.string(),
      image_44: z.string(),
      image_68: z.string(),
      image_88: z.string(),
      image_102: z.string(),
      image_132: z.string(),
      image_230: z.string(),
    }),
    avatar_base_url: z.string(),
    is_verified: z.boolean(),
  }),
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

export const SlackWorkspaceRequestSchema = SlackAuthSchema.extend({
  // workspaceId: z.string(),
});

export const SlackChannelRequestSchema = SlackAuthSchema.extend({
  // workspaceId: z.string(),
});

export const SlackMessagesRequestSchema = SlackAuthSchema.extend({
  channelIds: z.array(z.string()),
});

export const SlackChannelsResponseSchema = z.object({
  ok: z.boolean(),
  channels: z.array(SlackChannelSchema),
  response_metadata: z.object({
    next_cursor: z.string(),
  }),
});

export const SlackMessagesResponseSchema = z.object({
  ok: z.boolean(),
  messages: z.array(SlackMessageSchema),
  has_more: z.boolean().optional(),
  is_limited: z.boolean().optional(),
  pin_count: z.number().optional(),
  channel_actions_ts: z.string().nullable().optional(),
  channel_actions_count: z.number().optional(),
  response_metadata: z
    .object({
      next_cursor: z.string(),
    })
    .optional(),
});

export type CreateConnectorRequest = z.infer<
  typeof CreateConnectorRequestSchema
>;
export type ConnectorRequest = z.infer<typeof ConnectorRequestSchema>;
export type SlackMessage = z.infer<typeof SlackMessageSchema>;
export type SlackChannel = z.infer<typeof SlackChannelSchema>;
export type SlackWorkspace = z.infer<typeof SlackWorkspaceSchema>;
export type SlackAuth = z.infer<typeof SlackAuthSchema>;
export type SlackWorkspaceRequest = z.infer<typeof SlackWorkspaceRequestSchema>;
export type SlackChannelRequest = z.infer<typeof SlackChannelRequestSchema>;
export type SlackMessagesRequest = z.infer<typeof SlackMessagesRequestSchema>;
export type SlackChannelsResponse = z.infer<typeof SlackChannelsResponseSchema>;
export type SlackMessagesResponse = z.infer<typeof SlackMessagesResponseSchema>;

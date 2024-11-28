import { z } from "zod";

export const ZendeskResponseSchema = z.object({
  accessToken: z.string(),
  organizationId: z.number().optional(),
  pageSize: z.number().optional(),
  maxPages: z.number().optional(),
  fetchArticles: z.boolean().optional(),
  fetchTickets: z.boolean().optional(),
});

export const ZendeskTicketSchema = z.object({
  id: z.number(),
  url: z.string(),
  subject: z.string(),
  description: z.string(),
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const ZendeskArticleSchema = z.object({
  id: z.number(),
  url: z.string(),
  html_url: z.string(),
  title: z.string(),
  body: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const CreateConnectorRequestSchema = z.object({
  name: z.string(),
  collectionId: z.string(),
  selectedTickets: z.array(ZendeskTicketSchema),
  selectedArticles: z.array(ZendeskArticleSchema),
  credentials: z.string(),
  organizationId: z.number(),
  subdomain: z.string(),
  cronJob: z.string(),
  cronJobTimezone: z.string(),
});

export const SlackResponseSchema = z.object({
  accessToken: z.string(),
  workspaceId: z.string().optional(),
  pageSize: z.number().optional(),
  maxPages: z.number().optional(),
  fetchChannels: z.boolean().optional(),
  fetchMessages: z.boolean().optional(),
});

export const SlackMessageSchema = z.object({
  id: z.string().optional(), // Made optional
  text: z.string(),
  user: z.string(),
  ts: z.string(),
  thread_ts: z.string().optional(),
  channel_id: z.string().optional(), // Made optional
  team: z.string(),
  permalink: z.string().optional(), // Made optional
  created_at: z.string().optional(), // Made optional
  updated_at: z.string().optional(),
  channelName: z.string(), // Add this line
});

export const SlackChannelSchema = z.object({
  id: z.string().optional(),
  context_team_id: z.string().optional(),
  name: z.string(),
  is_channel: z.boolean(),
  is_private: z.boolean(),
  created: z.number(),
  creator: z.string().optional(),
  is_archived: z.boolean(),
  is_general: z.boolean(),
  num_members: z.number().optional(),
  topic: z
    .object({
      value: z.string(),
      creator: z.string(),
      last_set: z.number(),
    })
    .optional(),
  purpose: z
    .object({
      value: z.string(),
      creator: z.string(),
      last_set: z.number(),
    })
    .optional(),
});

export const SlackWorkspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  domain: z.string(),
  email_domain: z.string().optional(),
  icon: z
    .object({
      image_34: z.string(),
      image_44: z.string(),
      image_68: z.string(),
      image_88: z.string(),
      image_102: z.string(),
      image_132: z.string(),
    })
    .optional(),
});

export const CreateSlackConnectorRequestSchema = z.object({
  name: z.string(),
  collectionId: z.string(),
  selectedChannels: z.array(SlackChannelSchema),
  selectedMessages: z.array(SlackMessageSchema),
  credentials: z.string(),
  workspaceId: z.string(),
  teamDomain: z.string(),
  cronJob: z.string(),
  cronJobTimezone: z.string(),
});

export type CreateConnectorRequest = z.infer<
  typeof CreateConnectorRequestSchema
>;

export const ConnectorRequestSchema = z.object({
  connectorId: z.string(),
});

export type ConnectorRequest = z.infer<typeof ConnectorRequestSchema>;
export type SlackResponse = z.infer<typeof SlackResponseSchema>;
export type SlackMessage = z.infer<typeof SlackMessageSchema>;
export type SlackChannel = z.infer<typeof SlackChannelSchema>;
export type SlackWorkspace = z.infer<typeof SlackWorkspaceSchema>;
export type CreateSlackConnectorRequest = z.infer<
  typeof CreateSlackConnectorRequestSchema
>;

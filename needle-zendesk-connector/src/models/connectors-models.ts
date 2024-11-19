import { z } from "zod";

export const ZendeskResponseSchema = z.object({
  accessToken: z.string(),
  pageSize: z.number().optional(),
  maxPages: z.number().optional(),
});

export const ZendeskTicketSchema = z.object({
  id: z.number(),
  url: z.string(),
  subject: z.string(),
  description: z.string(),
  status: z.string(),
  created_at: z.string(),
  priority: z.string(),
});

export const ZendeskArticleSchema = z.object({
  id: z.number(),
  url: z.string(),
  html_url: z.string(),
  title: z.string(),
  body: z.string(),
  created_at: z.string(),
});

export const CreateConnectorRequestSchema = z.object({
  name: z.string(),
  collectionId: z.string(),
  selectedTickets: z.array(ZendeskTicketSchema),
  selectedArticles: z.array(ZendeskArticleSchema),
  credentials: z.string(), // For storing the Zendesk access token
});

export type CreateConnectorRequest = z.infer<
  typeof CreateConnectorRequestSchema
>;

export const ConnectorRequestSchema = z.object({
  connectorId: z.string(),
});

export type ConnectorRequest = z.infer<typeof ConnectorRequestSchema>;

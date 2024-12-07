import { z } from "zod";

export const NotionTokenSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  bot_id: z.string().uuid(),
  workspace_name: z.string(),
  workspace_icon: z.string().nullable(),
  workspace_id: z.string().uuid(),
  owner: z.object({
    type: z.string(),
    user: z.object({
      object: z.string(),
      id: z.string().uuid(),
      name: z.string(),
      avatar_url: z.string().url(),
      type: z.string(),
      person: z.unknown(),
    }),
  }),
  duplicated_template_id: z.string().nullable(),
  request_id: z.string().uuid(),
});

export type NotionToken = z.infer<typeof NotionTokenSchema>;

export const NotionErrorSchema = z.object({
  error: z.string(),
  error_description: z.string(),
  request_id: z.string().uuid(),
});

export type NotionError = z.infer<typeof NotionErrorSchema>;

export const NotionPageSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  object: z.enum(["database", "page"]),
  last_edited_time: z.string().datetime(),
  url: z.string().url(),
});

export type NotionPage = z.infer<typeof NotionPageSchema>;

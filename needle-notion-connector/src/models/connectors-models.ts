import { z } from "zod";
import { NotionPageSchema, NotionTokenSchema } from "./notion-models";

export const CreateConnectorRequestSchema = z.object({
  collectionIds: z.array(z.string()),
  name: z.string(),
  cronJob: z.string(),
  cronJobTimezone: z.string(),
  notionToken: NotionTokenSchema,
  notionPages: z.array(NotionPageSchema),
});

export type CreateConnectorRequest = z.infer<
  typeof CreateConnectorRequestSchema
>;

export const ConnectorRequestSchema = z.object({
  connectorId: z.string(),
});

export type ConnectorRequest = z.infer<typeof ConnectorRequestSchema>;

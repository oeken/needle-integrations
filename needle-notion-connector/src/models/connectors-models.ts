import { z } from "zod";
import { NotionPageSchema, NotionTokenSchema } from "./notion-models";

export const CreateConnectorRequestSchema = z.object({
  collectionId: z.string(),
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

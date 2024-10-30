import { z } from "zod";

export const CreateConnectorRequestSchema = z.object({
  urls: z.array(z.string()),
  collectionId: z.string(),
});

export type CreateConnectorRequest = z.infer<
  typeof CreateConnectorRequestSchema
>;

export const ConnectorRequestSchema = z.object({
  connectorId: z.string(),
});

export type ConnectorRequest = z.infer<typeof ConnectorRequestSchema>;

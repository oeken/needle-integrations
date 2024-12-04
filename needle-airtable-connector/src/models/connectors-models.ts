import { z } from "zod";

const tableSchema = z.object({
  id: z.string(),
  name: z.string(),
  primaryFieldId: z.string(),
})

export const CreateConnectorRequestSchema = z.object({
  // urls: z.array(z.string()),
  collectionId: z.array(z.string()),
  connectorName: z.string(),
  hours: z.number(),
  minutes: z.number(),
  timezone: z.string(),
  // collectionId: z.string(),
  // tableURL: z.string(),
  refreshToken: z.string(),
  baseId:z.string(),
  tables:z.array(tableSchema),
});

export type CreateConnectorRequest = z.infer<
  typeof CreateConnectorRequestSchema
>;

export const ConnectorRequestSchema = z.object({
  connectorId: z.string(),
});

export type ConnectorRequest = z.infer<typeof ConnectorRequestSchema>;

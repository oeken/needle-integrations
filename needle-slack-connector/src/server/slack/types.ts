import { type ConnectorRunDescriptor } from "@needle-ai/needle-sdk";
import { type CanvasFileMetadata, type FileMetadata } from "../db/schema";

export interface SlackOAuthResponse {
  ok: boolean;
  error?: string;
  app_id?: string;
  authed_user?: {
    id: string;
    access_token: string;
    scope: string;
    token_type: string;
  };
  team?: {
    id: string;
    name: string;
  };
  enterprise?: null;
  is_enterprise_install?: boolean;
}

export interface ExistingFile {
  ndlFileId: string;
  title: string | null;
  metadata: FileMetadata;
}

export interface ProcessedFiles {
  update: ConnectorRunDescriptor["update"];
  delete: ConnectorRunDescriptor["delete"];
  filesToUpdate: { id: string; metadata: FileMetadata }[];
  filesToDelete: { id: string }[];
}

export interface NewFiles {
  create: ConnectorRunDescriptor["create"];
  filesToCreate: { id: string; metadata: FileMetadata; title: string }[];
}

export interface DbCanvasFile {
  ndlFileId: string;
  metadata: CanvasFileMetadata;
  updatedAt: Date;
}

export interface LiveCanvas {
  originId: string;
  channelId: string;
  url: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  dataType: "canvas";
}

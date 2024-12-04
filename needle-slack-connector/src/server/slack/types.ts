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

export interface DbFile {
  originId: number;
  updatedAt: string; // or Date, depending on your data
  // Add other properties as needed
}

export interface SlackCanvas {
  originId: number;
  updatedAt: string; // or Date, depending on your data
  // Add other properties as needed
}

export interface DiffResult {
  create: SlackCanvas[];
  update: SlackCanvas[];
  delete: DbFile[];
}

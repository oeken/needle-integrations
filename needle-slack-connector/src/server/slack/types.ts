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

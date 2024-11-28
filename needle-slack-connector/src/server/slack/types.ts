import {
  type SlackMessage,
  type SlackChannel,
} from "~/models/connectors-models";

export interface SlackWorkspace {
  id: string;
  name: string;
  domain: string;
}

export interface FetchOptions {
  pageSize?: number;
  maxPages?: number;
  delay?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  metadata: {
    totalCount: number;
    pageCount: number;
    hasMore: boolean;
    totalPages: number;
  };
}

export interface SlackResponse {
  ok: boolean;
  error?: string;
  team?: SlackWorkspace;
  channels?: SlackChannel[];
  messages?: SlackMessage[];
  response_metadata?: {
    next_cursor?: string;
  };
}

export interface SlackTeamResponse extends SlackResponse {
  team: {
    id: string;
    name: string;
    domain: string;
  };
}

export interface SlackChannelsResponse extends SlackResponse {
  channels: SlackChannel[];
  response_metadata?: {
    next_cursor: string;
  };
}

export interface SlackMessagesResponse extends SlackResponse {
  messages: SlackMessage[];
  has_more: boolean;
}

interface SlackTokenResponseBase {
  ok: boolean;
  app_id: string;
  error?: string;
  team?: {
    id: string;
    name: string;
  };
  enterprise: null;
  is_enterprise_install: boolean;
}

interface SlackBotTokenResponse extends SlackTokenResponseBase {
  scope: string;
  token_type: "bot";
  access_token: string;
  bot_user_id: string;
  authed_user: {
    id: string;
  };
}

interface SlackUserTokenResponse extends SlackTokenResponseBase {
  authed_user: {
    id: string;
    scope: string;
    access_token: string;
    token_type: "user";
  };
}

export type SlackTokenResponse = SlackBotTokenResponse | SlackUserTokenResponse;

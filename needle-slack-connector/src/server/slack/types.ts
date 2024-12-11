import { type ConnectorRunDescriptor } from "@needle-ai/needle-sdk";
import { type SlackMessageSelect } from "../db/schema";

// Slack API Response Types
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

export interface SlackChannel {
  id: string;
  name: string;
  is_channel: boolean;
  is_group: boolean;
  is_im: boolean;
  is_mpim: boolean;
  is_private: boolean;
  created: number;
  is_archived: boolean;
  is_general: boolean;
  unlinked: number;
  name_normalized: string;
  is_shared: boolean;
  is_org_shared: boolean;
  is_pending_ext_shared: boolean;
  pending_shared: unknown[];
  context_team_id: string;
  updated: number;
  parent_conversation: null;
  creator: string;
  is_ext_shared: boolean;
  shared_team_ids: string[];
  pending_connected_team_ids: unknown[];
  is_member: boolean;
  topic: {
    value: string;
    creator: string;
    last_set: number;
  };
  purpose: {
    value: string;
    creator: string;
    last_set: number;
  };
  properties?: {
    canvas?: {
      file_id: string;
      is_empty: boolean;
      quip_thread_id: string;
    };
    tabs?: Array<{
      id: string;
      type: string;
      data: {
        file_id: string;
        shared_ts: string;
      };
      label: string;
    }>;
    use_case?: string;
  };
  previous_names?: string[];
  num_members: number;
}

export interface SlackMessage {
  channelName: string;
  type: string;
  subtype?: string;
  user: string;
  text: string;
  ts: string;
  client_msg_id?: string;
  team?: string;
  blocks?: Array<{
    type: string;
    block_id: string;
    elements: Array<{
      type: string;
      elements: Array<{
        type: string;
        text?: string;
        range?: string;
      }>;
    }>;
  }>;
  reactions?: Array<{
    name: string;
    users: string[];
    count: number;
  }>;
  thread_ts?: string;
  reply_count?: number;
  replies?: Array<{ user: string; ts: string }>;
}

export interface SlackChannelsResponse {
  ok: boolean;
  channels: SlackChannel[];
  response_metadata: {
    next_cursor: string;
  };
}

export interface SlackMessagesResponse {
  ok: boolean;
  messages: SlackMessage[];
  has_more?: boolean;
  is_limited?: boolean;
  pin_count?: number;
  channel_actions_ts?: string | null;
  channel_actions_count?: number;
  response_metadata?: {
    next_cursor: string;
  };
}

export interface SlackWorkspace {
  ok: boolean;
  team: {
    id: string;
    name: string;
    url: string;
    domain: string;
    email_domain: string;
    icon: {
      image_default: boolean;
      image_34: string;
      image_44: string;
      image_68: string;
      image_88: string;
      image_102: string;
      image_230: string;
      image_132: string;
    };
    avatar_base_url: string;
    is_verified: boolean;
    lob_sales_home_enabled?: boolean;
  };
}

export interface SlackUserInfoResponse {
  ok: boolean;
  user: {
    id: string;
    team_id: string;
    name: string;
    deleted: boolean;
    color: string;
    real_name: string;
    tz: string;
    tz_label: string;
    tz_offset: number;
    profile: {
      title: string;
      phone: string;
      skype: string;
      real_name: string;
      real_name_normalized: string;
      display_name: string;
      display_name_normalized: string;
      fields: null;
      status_text: string;
      status_emoji: string;
      status_emoji_display_info: unknown[];
      status_expiration: number;
      avatar_hash: string;
      image_original: string;
      is_custom_image: boolean;
      email: string;
      first_name: string;
      last_name: string;
      image_24: string;
      image_32: string;
      image_48: string;
      image_72: string;
      image_192: string;
      image_512: string;
      image_1024: string;
      status_text_canonical: string;
      team: string;
    };
    is_admin: boolean;
    is_owner: boolean;
    is_primary_owner: boolean;
    is_restricted: boolean;
    is_ultra_restricted: boolean;
    is_bot: boolean;
    is_app_user: boolean;
    updated: number;
    is_email_confirmed: boolean;
    has_2fa: boolean;
    two_factor_type: string;
    who_can_share_contact_card: string;
  };
}

export interface SlackCanvasFile {
  id: string;
  created: number;
  timestamp: number;
  name: string;
  title: string;
  mimetype: string;
  filetype: string;
  pretty_type: string;
  user: string;
  user_team: string;
  editable: boolean;
  size: number;
  mode: string;
  is_external: boolean;
  external_type: string;
  is_public: boolean;
  public_url_shared: boolean;
  display_as_bot: boolean;
  username: string;
  url_private: string;
  url_private_download: string;
  permalink: string;
  url_static_preview: string;
  quip_thread_id: string;
  updated: number;
  update_notification: number;
  is_channel_space: boolean;
  linked_channel_id: string;
  channels: string[];
  groups: string[];
  ims: string[];
  teams_shared_with: string[];
  access: string;
  comments_count: number;
  title_blocks: Array<{
    type: string;
    block_id: string;
    elements: Array<{
      type: string;
      elements: Array<{
        type: string;
        channel_id?: string;
      }>;
    }>;
  }>;
  last_read: number;
  editors: string[];
  edit_timestamp: number;
  show_badge: boolean;
}

export interface SlackCanvasResponse {
  ok: boolean;
  files?: SlackCanvasFile[];
  response_metadata?: {
    next_cursor: string;
  };
  error?: string;
}

// Internal Service Types
export interface ExistingFile {
  ndlFileId: string;
  title: string | null;
  channelId: string;
  monthStart: string;
  monthEnd: string;
  dataType: string;
}

export interface ProcessedFiles {
  update: ConnectorRunDescriptor["update"];
  delete: ConnectorRunDescriptor["delete"];
  filesToUpdate: Pick<
    SlackMessageSelect,
    "ndlFileId" | "channelId" | "monthStart" | "monthEnd" | "dataType"
  >[];
  filesToDelete: { id: string }[];
}

export interface NewFiles {
  create: ConnectorRunDescriptor["create"];
  filesToCreate: {
    ndlFileId: string;
    channelId: string;
    monthStart: string;
    monthEnd: string;
    dataType: string;
    title?: string;
  }[];
}

export interface DbCanvasFile {
  ndlFileId: string;
  channelId: string;
  originId: string;
  url: string;
  title: string;
  dataType: string;
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

export interface SlackChannelWithCanvases {
  id: string;
  name: string;
  canvases?: Array<{
    channelId: string;
    url: string;
    title: string;
    originId: string;
    createdAt: number;
    updatedAt: number;
    dataType: "canvas";
  }>;
}

export interface ZendeskTicket {
  id: number;
  url: string;
  subject: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ZendeskArticle {
  id: number;
  url: string;
  html_url: string;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface ZendeskTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

export interface ZendeskErrorResponse {
  error: string;
  error_description: string;
}

export interface FetchOptions {
  maxPages?: number;
  delay?: number;
  pageSize?: number;
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

export type ZendeskOrganization = {
  id: number;
  name: string;
  url: string;
};

// Updated base response interface to handle search endpoint
export interface BaseZendeskResponse {
  count?: number;
  next_page?: string | null;
  previous_page?: string | null;
  results?: Array<unknown>; // For search endpoint results
  links?: {
    next?: string | null;
    prev?: string | null;
  };
}

// Response interfaces for specific endpoints
export interface ZendeskTicketResponse extends BaseZendeskResponse {
  tickets: ZendeskTicket[];
}

export interface ZendeskArticleResponse extends BaseZendeskResponse {
  articles: ZendeskArticle[];
}

export interface ZendeskOrganizationResponse extends BaseZendeskResponse {
  organizations: ZendeskOrganization[];
}

// Search response interface
export interface ZendeskSearchResponse extends BaseZendeskResponse {
  results: Array<ZendeskTicket | ZendeskArticle | ZendeskOrganization>;
}

// Combined type for all possible responses
export type ZendeskResponse =
  | ZendeskTicketResponse
  | ZendeskArticleResponse
  | ZendeskOrganizationResponse
  | ZendeskSearchResponse;

export type DbFile = {
  id: number;
  ndlConnectorId: string;
  ndlFileId: string | null;
  originId: number;
  url: string;
  title: string;
  type: "ticket" | "article" | "comments";
  createdAt: Date;
  updatedAt: Date;
};

export type DiffResult = {
  create: (ZendeskTicket | ZendeskArticle)[];
  update: (ZendeskTicket | ZendeskArticle)[];
  delete: DbFile[];
};

export type FileIdMapping = Map<string, string>;

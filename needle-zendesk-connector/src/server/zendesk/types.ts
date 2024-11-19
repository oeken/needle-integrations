export interface ZendeskTicket {
  id: number;
  url: string;
  subject: string;
  description: string;
  status: string;
  created_at: string;
  priority: string;
}

export interface ZendeskArticle {
  id: number;
  url: string;
  html_url: string;
  title: string;
  body: string;
  created_at: string;
}

export interface ZendeskResponse {
  tickets: ZendeskTicket[];
  articles: ZendeskArticle[];
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

// Add type interfaces
export interface ZendeskTicketResponse {
  tickets: ZendeskTicket[];
  next_page: string | null;
  count: number;
}

export interface ZendeskArticleResponse {
  articles: ZendeskArticle[];
  next_page: string | null;
  count: number;
}

export interface FetchOptions {
  maxPages?: number;
  delay?: number;
  pageSize?: number; // Add pageSize option
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

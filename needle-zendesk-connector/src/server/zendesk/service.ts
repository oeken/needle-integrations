import { env } from "~/env";
import { type ZendeskTicket, type ZendeskArticle } from "./types";

// Add type interfaces
interface ZendeskTicketResponse {
  tickets: ZendeskTicket[];
  next_page: string | null;
  count: number;
}

interface ZendeskArticleResponse {
  articles: ZendeskArticle[];
  next_page: string | null;
  count: number;
}

interface FetchOptions {
  maxPages?: number;
  delay?: number;
  pageSize?: number; // Add pageSize option
}

interface PaginatedResponse<T> {
  items: T[];
  metadata: {
    totalCount: number;
    pageCount: number;
    hasMore: boolean;
    totalPages: number;
  };
}

export const createZendeskService = (accessToken: string) => {
  const baseUrl = `https://${env.NEXT_PUBLIC_ZENDESK_SUBDOMAIN}.zendesk.com`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  async function fetchAllPages<T extends ZendeskTicket | ZendeskArticle>(
    initialUrl: string,
    options: FetchOptions = {},
  ): Promise<PaginatedResponse<T>> {
    const { maxPages, delay = 100, pageSize } = options;
    let currentPage = 1;

    // Add pageSize to URL if specified
    const urlWithSize = pageSize
      ? `${initialUrl}${initialUrl.includes("?") ? "&" : "?"}per_page=${pageSize}`
      : initialUrl;

    let nextPageUrl: string | null = urlWithSize;
    const allResults: T[] = [];
    let totalCount = 0;

    while (nextPageUrl && (!maxPages || currentPage <= maxPages)) {
      const response = await fetch(nextPageUrl, { headers });

      if (response.status === 429) {
        // Rate limit hit
        const retryAfter = parseInt(
          response.headers.get("retry-after") ?? "30",
        );
        await sleep(retryAfter * 1000);
        continue;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }

      const data = (await response.json()) as
        | ZendeskTicketResponse
        | ZendeskArticleResponse;

      // Set total count from first page
      if (currentPage === 1) {
        totalCount = data.count;
      }

      const items = "tickets" in data ? data.tickets : data.articles;
      allResults.push(...(items as T[]));

      nextPageUrl = data.next_page;
      currentPage++;

      if (nextPageUrl && delay) {
        await sleep(delay);
      }
    }

    const itemsPerPage = pageSize ?? 100;
    return {
      items: allResults,
      metadata: {
        totalCount,
        pageCount: currentPage - 1,
        hasMore: nextPageUrl !== null,
        totalPages: Math.ceil(totalCount / itemsPerPage),
      },
    };
  }

  const fetchTickets = async (
    options?: FetchOptions,
  ): Promise<PaginatedResponse<ZendeskTicket>> => {
    return fetchAllPages<ZendeskTicket>(`${baseUrl}/api/v2/tickets.json`, {
      delay: 100,
      ...options,
    });
  };

  const fetchArticles = async (
    options?: FetchOptions,
  ): Promise<PaginatedResponse<ZendeskArticle>> => {
    return fetchAllPages<ZendeskArticle>(
      `${baseUrl}/api/v2/help_center/articles.json`,
      { delay: 100, ...options },
    );
  };

  const fetchAll = async (
    options?: FetchOptions,
  ): Promise<{
    tickets: PaginatedResponse<ZendeskTicket>;
    articles: PaginatedResponse<ZendeskArticle>;
  }> => {
    const [tickets, articles] = await Promise.all([
      fetchTickets(options),
      fetchArticles(options),
    ]);

    return { tickets, articles };
  };

  return {
    fetchTickets,
    fetchArticles,
    fetchAll,
  };
};

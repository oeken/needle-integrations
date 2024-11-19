import { env } from "~/env";
import {
  type ZendeskTicket,
  type ZendeskArticle,
  type FetchOptions,
  type PaginatedResponse,
  type ZendeskOrganization,
  type ZendeskResponse,
} from "./types";

export const createZendeskService = (
  accessToken: string,
  subdomain?: string,
) => {
  const effectiveSubdomain = subdomain ?? env.NEXT_PUBLIC_ZENDESK_SUBDOMAIN;
  const baseUrl = `https://${effectiveSubdomain}.zendesk.com`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  async function fetchAllPages<
    T extends ZendeskTicket | ZendeskArticle | ZendeskOrganization,
  >(
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
      try {
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

        const data = (await response.json()) as ZendeskResponse;

        // Set total count from first page
        if (currentPage === 1) {
          totalCount = data.count ?? 0;
        }

        // Safely extract and handle items

        // Modified extraction logic
        let items: T[] = [];
        if ("tickets" in data && Array.isArray(data.tickets)) {
          items = data.tickets as T[];
        } else if ("articles" in data && Array.isArray(data.articles)) {
          items = data.articles as T[];
        } else if (
          "organizations" in data &&
          Array.isArray(data.organizations)
        ) {
          items = data.organizations as T[];
        } else if ("results" in data && Array.isArray(data.results)) {
          // Add this case for search endpoint
          items = data.results as T[];
        }

        // Only push if we have items
        if (items.length > 0) {
          allResults.push(...items);
        }

        // Update next page URL handling for search endpoint
        nextPageUrl =
          data.next_page ?? (data.links?.next ? data.links.next : null);
        currentPage++;

        if (nextPageUrl && delay) {
          await sleep(delay);
        }
      } catch (error) {
        console.error("Error fetching page:", error);
        // Log the URL and response for debugging
        console.error("URL:", nextPageUrl);
        break; // Exit the loop on error
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

  const searchByOrganization = async (
    organizationId: string,
    options?: FetchOptions & {
      fetchTickets?: boolean;
      fetchArticles?: boolean;
    },
  ): Promise<{
    tickets?: PaginatedResponse<ZendeskTicket>;
    articles?: PaginatedResponse<ZendeskArticle>;
  }> => {
    try {
      const {
        fetchTickets = true,
        fetchArticles = true,
        ...fetchOptions
      } = options ?? {};
      const result: {
        tickets?: PaginatedResponse<ZendeskTicket>;
        articles?: PaginatedResponse<ZendeskArticle>;
      } = {};

      if (fetchTickets) {
        const query = encodeURIComponent(
          `type:ticket organization:${organizationId}`,
        );
        const ticketsUrl = `${baseUrl}/api/v2/search.json?query=${query}`;
        result.tickets = await fetchAllPages<ZendeskTicket>(ticketsUrl, {
          delay: 100,
          ...fetchOptions,
        });
      }

      if (fetchArticles) {
        result.articles = await fetchAllPages<ZendeskArticle>(
          `${baseUrl}/api/v2/help_center/articles.json?organization_id=${organizationId}`,
          { delay: 100, ...fetchOptions },
        );
      }

      return result;
    } catch (error) {
      console.error(
        `Error fetching data for organization ${organizationId}:`,
        error,
      );
      // Log more details about the error
      if (error instanceof Error) {
        console.error("Error details:", {
          message: error.message,
          stack: error.stack,
        });
      }
      return {
        tickets: {
          items: [],
          metadata: {
            totalCount: 0,
            pageCount: 0,
            hasMore: false,
            totalPages: 0,
          },
        },
        articles: {
          items: [],
          metadata: {
            totalCount: 0,
            pageCount: 0,
            hasMore: false,
            totalPages: 0,
          },
        },
      };
    }
  };

  const getOrganizations = async (
    options?: FetchOptions,
  ): Promise<PaginatedResponse<ZendeskOrganization>> => {
    try {
      return await fetchAllPages<ZendeskOrganization>(
        `${baseUrl}/api/v2/organizations.json`,
        {
          delay: 100,
          ...options,
        },
      );
    } catch (error) {
      console.error("Error fetching organizations:", error);
      return {
        items: [],
        metadata: {
          totalCount: 0,
          pageCount: 0,
          hasMore: false,
          totalPages: 0,
        },
      };
    }
  };

  return {
    searchByOrganization,
    getOrganizations,
  };
};

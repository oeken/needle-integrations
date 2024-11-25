import { useSuspenseQuery } from "@tanstack/react-query";
import { createZendeskService } from "./service";

export function useZendeskData(
  accessToken: string,
  options: {
    organizationId?: string;
    pageSize?: number;
    maxPages?: number;
    fetchArticles?: boolean;
    fetchTickets?: boolean;
  },
) {
  return useSuspenseQuery({
    queryKey: ["zendesk-data", accessToken, options],
    queryFn: async () => {
      const zendeskService = createZendeskService(accessToken);
      if (options.organizationId) {
        return zendeskService.searchByOrganization(
          options.organizationId.toString(),
          {
            pageSize: options.pageSize,
            maxPages: options.maxPages,
            fetchArticles: options.fetchArticles,
            fetchTickets: options.fetchTickets,
          },
        );
      }
      return { tickets: { items: [] }, articles: { items: [] } };
    },
  });
}

export function useZendeskOrganizations(
  accessToken: string,
  options: {
    pageSize?: number;
    maxPages?: number;
  },
) {
  return useSuspenseQuery({
    queryKey: ["zendesk-organizations", accessToken, options],
    queryFn: async () => {
      const zendeskService = createZendeskService(accessToken);
      return zendeskService.getOrganizations({
        pageSize: options.pageSize,
        maxPages: options.maxPages,
      });
    },
  });
}

"use client";

import { useZendeskResources } from "../providers/ZendeskResourcesProvider";
import { ZendeskOrganizationSelect } from "./ZendeskOrganizationSelect";
import { ZendeskResourceInfo } from "./ZendeskResourceInfo";
import { CreateConnectorForm } from "../CreateConnnectorForm";
import { type Collection } from "@needle-ai/needle-sdk";
import { formatDateTime } from "~/utils/format-date-time";

export function ZendeskOrganizationPreview({
  collections,
  credentials,
}: {
  collections: Collection[];
  credentials: string;
}) {
  const { selectedOrganizationId, tickets, articles, isLoading } =
    useZendeskResources();

  if (!selectedOrganizationId) {
    return (
      <div className="my-8 flex flex-col">
        <span className="mb-4 text-zinc-500">
          Select a Zendesk organization to view available resources
        </span>
        <div className="w-full">
          <ZendeskOrganizationSelect />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="my-8 flex flex-col">
        <div className="w-full">
          <ZendeskOrganizationSelect />
        </div>
        <div className="mt-4 text-center text-zinc-500">
          Loading organization resources...
        </div>
      </div>
    );
  }

  return (
    <div className="my-8 space-y-6">
      <div className="flex items-start justify-between">
        <div className="w-full">
          <ZendeskOrganizationSelect />
          <p className="mt-2 text-sm text-zinc-500">
            Preview of available resources in the selected organization
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-medium">
            Showing {Math.min(10, tickets.length)} of {tickets.length} Tickets
          </h3>
        </div>

        {tickets.length === 0 ? (
          <div className="text-sm text-zinc-500">No tickets available</div>
        ) : (
          tickets.slice(0, 10).map((ticket) => (
            <div
              key={ticket.id}
              className="flex cursor-pointer flex-col gap-1 border-b border-zinc-200 p-4 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              <div className="flex items-center justify-between">
                <p className="font-medium">{ticket.subject}</p>
                <span className="text-sm text-zinc-500">
                  {formatDateTime(ticket.created_at)}
                </span>
              </div>
              <p className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                Status: {ticket.status}
              </p>
              <p className="line-clamp-3 text-sm text-zinc-600 dark:text-zinc-400">
                Description: {ticket.description}
              </p>
            </div>
          ))
        )}
      </div>

      <div className="space-y-2">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-medium">
            Showing {Math.min(10, articles.length)} of {articles.length}{" "}
            Articles
          </h3>
        </div>

        {articles.length === 0 ? (
          <div className="text-sm text-zinc-500">No articles available</div>
        ) : (
          articles.slice(0, 10).map((article) => (
            <div
              key={article.id}
              className="flex cursor-pointer flex-col gap-1 border-b border-zinc-200 p-4 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              <div className="flex items-center justify-between">
                <p className="font-medium">{article.title}</p>
                <span className="text-sm text-zinc-500">
                  {formatDateTime(article.created_at)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
      <ZendeskResourceInfo />
      <CreateConnectorForm
        collections={collections}
        credentials={credentials}
      />
    </div>
  );
}

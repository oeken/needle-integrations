"use client";

import { useZendeskResources } from "../providers/ZendeskResourcesProvider";

export function SelectedResources() {
  const {
    selectedTickets,
    selectedArticles,
    setSelectedTickets,
    setSelectedArticles,
    tickets,
    articles,
  } = useZendeskResources();

  const removeTicket = (id: number) => {
    setSelectedTickets(selectedTickets.filter((t) => t.id !== id));
  };

  const removeArticle = (id: number) => {
    setSelectedArticles(selectedArticles.filter((a) => a.id !== id));
  };

  return (
    <div className="mt-8 grid grid-cols-1 grid-rows-2 gap-4 md:grid-cols-2 md:grid-rows-1">
      {/* Tracked Tickets */}
      <div>
        <h3 className="text-xl font-semibold tracking-tight">Track Tickets</h3>
        <div className="flex max-h-[40vh] min-h-48 flex-col overflow-y-auto rounded border p-2 shadow-sm dark:border-zinc-700">
          {selectedTickets.length === 0 ? (
            <div className="mx-auto my-auto text-zinc-500">
              No tickets tracked
            </div>
          ) : (
            tickets
              .filter((ticket) =>
                selectedTickets.some((t) => t.id === ticket.id),
              )
              .map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between gap-2 border-b p-2"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{ticket.subject}</span>
                    <span className="text-sm text-zinc-500">
                      Created:{" "}
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    onClick={() => removeTicket(ticket.id)}
                    className="text-zinc-400 hover:text-zinc-600"
                  >
                    <span className="h-4 w-4">X</span>
                  </button>
                </div>
              ))
          )}
        </div>
      </div>

      {/* Tracked Articles */}
      <div>
        <h3 className="text-xl font-semibold tracking-tight">Track Articles</h3>
        <div className="flex max-h-[40vh] min-h-48 flex-col overflow-y-auto rounded border p-2 shadow-sm dark:border-zinc-700">
          {selectedArticles.length === 0 ? (
            <div className="mx-auto my-auto text-zinc-500">
              No articles tracked
            </div>
          ) : (
            articles
              .filter((article) =>
                selectedArticles.some((a) => a.id === article.id),
              )
              .map((article) => (
                <div
                  key={article.id}
                  className="flex items-center justify-between gap-2 border-b p-2"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{article.title}</span>
                    <span className="text-sm text-zinc-500">
                      Created:{" "}
                      {new Date(article.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    onClick={() => removeArticle(article.id)}
                    className="text-zinc-400 hover:text-zinc-600"
                  >
                    <span className="h-4 w-4">X</span>
                  </button>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}

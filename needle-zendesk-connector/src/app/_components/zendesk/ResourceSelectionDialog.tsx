"use client";

import { useState } from "react";
import { Dialog } from "../atoms/Dialog";
import { useZendeskResources } from "../providers/ZendeskResourcesProvider";
import type { ZendeskTicket, ZendeskArticle } from "~/server/zendesk/types";
import { Button } from "../atoms/Button";

export function ResourceSelectionDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [tempSelectedTickets, setTempSelectedTickets] = useState<
    ZendeskTicket[]
  >([]);
  const [tempSelectedArticles, setTempSelectedArticles] = useState<
    ZendeskArticle[]
  >([]);

  const {
    selectedTickets,
    selectedArticles,
    setSelectedTickets,
    setSelectedArticles,
    tickets,
    articles,
  } = useZendeskResources();

  const handleSelectAllTickets = () => {
    setTempSelectedTickets(tickets);
  };

  const handleDeselectAllTickets = () => {
    setTempSelectedTickets([]);
  };

  const handleSelectAllArticles = () => {
    setTempSelectedArticles(articles);
  };

  const handleDeselectAllArticles = () => {
    setTempSelectedArticles([]);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setTempSelectedTickets(selectedTickets);
      setTempSelectedArticles(selectedArticles);
    }
  };

  return (
    <>
      <Dialog
        trigger={
          <Button
            buttonType="filled"
            onClick={() => handleOpenChange(true)}
            className="mr-auto"
          >
            See Zendesk Resources
          </Button>
        }
        isOpen={isOpen}
        onOpenChange={handleOpenChange}
      >
        <div className="mt-8 grid grid-cols-2 gap-6">
          <div className="">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-white">
                Tickets ({tempSelectedTickets.length}/{tickets.length})
              </h3>
              <div className="space-x-2">
                <button
                  onClick={handleSelectAllTickets}
                  className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  Select All
                </button>
                <button
                  onClick={handleDeselectAllTickets}
                  className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  Deselect All
                </button>
              </div>
            </div>
            <div className="max-h-[60vh] space-y-2 overflow-y-auto rounded-md border border-zinc-200 p-2 dark:border-zinc-700">
              {tickets.map((ticket) => (
                <label
                  key={ticket.id}
                  className="flex items-center gap-2 p-2 text-zinc-900 hover:bg-zinc-50 dark:text-white dark:hover:bg-zinc-800"
                >
                  <input
                    type="checkbox"
                    checked={tempSelectedTickets.some(
                      (t) => t.id === ticket.id,
                    )}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setTempSelectedTickets([
                          ...tempSelectedTickets,
                          ticket,
                        ]);
                      } else {
                        setTempSelectedTickets(
                          tempSelectedTickets.filter((t) => t.id !== ticket.id),
                        );
                      }
                    }}
                    className="accent-primary-600"
                  />
                  <div>
                    <div className="font-medium">{ticket.subject}</div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">
                      Status:{" "}
                      <span className="capitalize">{ticket.status}</span>
                    </div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">
                      Priority:{" "}
                      <span className="capitalize">{ticket.priority}</span>
                    </div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">
                      Created:{" "}
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">
                      {ticket.url}
                    </div>
                    <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                      {ticket.description.length > 100
                        ? `${ticket.description.slice(0, 100)}...`
                        : ticket.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-white">
                Articles ({tempSelectedArticles.length}/{articles.length})
              </h3>
              <div className="space-x-2">
                <button
                  onClick={handleSelectAllArticles}
                  className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  Select All
                </button>
                <button
                  onClick={handleDeselectAllArticles}
                  className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  Deselect All
                </button>
              </div>
            </div>
            <div className="max-h-[60vh] space-y-2 overflow-y-auto rounded-md border border-zinc-200 p-2 dark:border-zinc-700">
              {articles.map((article) => (
                <label
                  key={article.id}
                  className="flex items-center gap-2 p-2 text-zinc-900 hover:bg-zinc-50 dark:text-white dark:hover:bg-zinc-800"
                >
                  <input
                    type="checkbox"
                    checked={tempSelectedArticles.some(
                      (a) => a.id === article.id,
                    )}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setTempSelectedArticles([
                          ...tempSelectedArticles,
                          article,
                        ]);
                      } else {
                        setTempSelectedArticles(
                          tempSelectedArticles.filter(
                            (a) => a.id !== article.id,
                          ),
                        );
                      }
                    }}
                    className="accent-primary-600"
                  />
                  <div>
                    <div className="font-medium">{article.title}</div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">
                      Created:{" "}
                      {new Date(article.created_at).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">
                      {article.url}
                    </div>
                    <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                      {article.body.length > 100
                        ? `${article.body.slice(0, 100)}...`
                        : article.body}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => handleOpenChange(false)} buttonType="ghost">
            Cancel
          </Button>
          <Button
            onClick={() => {
              setSelectedTickets(tempSelectedTickets);
              setSelectedArticles(tempSelectedArticles);
              handleOpenChange(false);
            }}
          >
            Save Selection
          </Button>
        </div>
      </Dialog>
    </>
  );
}

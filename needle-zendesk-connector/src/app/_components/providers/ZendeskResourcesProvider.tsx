"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { ZendeskTicket, ZendeskArticle } from "~/server/zendesk/types";

type ZendeskResourcesContextType = {
  selectedTickets: ZendeskTicket[];
  selectedArticles: ZendeskArticle[];
  setSelectedTickets: (tickets: ZendeskTicket[]) => void;
  setSelectedArticles: (articles: ZendeskArticle[]) => void;
  tickets: ZendeskTicket[];
  articles: ZendeskArticle[];
};

const ZendeskResourcesContext =
  createContext<ZendeskResourcesContextType | null>(null);

export function useZendeskResources() {
  const context = useContext(ZendeskResourcesContext);
  if (!context) {
    throw new Error(
      "useZendeskResources must be used within a ZendeskResourcesProvider",
    );
  }
  return context;
}

interface ZendeskResourcesProviderProps {
  children: ReactNode;
  tickets: ZendeskTicket[];
  articles: ZendeskArticle[];
}

export function ZendeskResourcesProvider({
  children,
  tickets,
  articles,
}: ZendeskResourcesProviderProps) {
  const [selectedTickets, setSelectedTickets] = useState<ZendeskTicket[]>([]);
  const [selectedArticles, setSelectedArticles] = useState<ZendeskArticle[]>(
    [],
  );

  // console.log("SELECTED:", { selectedArticles, selectedTickets });

  return (
    <ZendeskResourcesContext.Provider
      value={{
        selectedTickets,
        selectedArticles,
        setSelectedTickets,
        setSelectedArticles,
        tickets,
        articles,
      }}
    >
      {children}
    </ZendeskResourcesContext.Provider>
  );
}

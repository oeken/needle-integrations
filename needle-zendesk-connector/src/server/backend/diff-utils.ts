import {
  type ZendeskTicket,
  type DbFile,
  type DiffResult,
  type ZendeskArticle,
} from "../zendesk/types";

export function computeDiff(
  current: DbFile[],
  live: (ZendeskTicket | ZendeskArticle)[],
): DiffResult {
  const currentTickets = new Map(
    current
      .filter((item) => item.type === "ticket" || item.type === "comments")
      .map((item) => [item.originId, item]),
  );

  const currentArticles = new Map(
    current
      .filter((item) => item.type === "article")
      .map((item) => [item.originId, item]),
  );

  const processedIds = new Set<number>();
  const create: (ZendeskTicket | ZendeskArticle)[] = [];
  const update: (ZendeskTicket | ZendeskArticle)[] = [];
  const delete_: DbFile[] = [];

  for (const item of live) {
    if ("subject" in item) {
      const currentTicket = currentTickets.get(item.id);
      if (!currentTicket) {
        create.push(item);
      } else if (
        new Date(item.updated_at) > new Date(currentTicket.updatedAt)
      ) {
        update.push(item);
      }
      processedIds.add(item.id);
    } else {
      const currentArticle = currentArticles.get(item.id);
      if (!currentArticle) {
        create.push(item);
      } else if (
        new Date(item.updated_at) > new Date(currentArticle.updatedAt)
      ) {
        update.push(item);
      }
      processedIds.add(item.id);
    }
  }

  for (const item of current) {
    if (!processedIds.has(item.originId)) {
      delete_.push(item);
    }
  }

  return { create, update, delete: delete_ };
}

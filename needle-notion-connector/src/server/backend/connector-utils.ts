import type {
  DatabaseObjectResponse,
  PageObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { type InferSelectModel } from "drizzle-orm";
import { type notionPagesTable } from "../db/schema";

type NotionPageDB = InferSelectModel<typeof notionPagesTable>;
type NotionObject = DatabaseObjectResponse | PageObjectResponse;
type NotionObjectWithNeedleFileID = NotionObject & { ndlFileId: string };

export function getDescriptorDiff(
  currentPages: NotionPageDB[],
  livePages: NotionObject[],
) {
  const currentPagesMap = new Map(currentPages.map((p) => [p.notionPageId, p]));
  const livePagesMap = new Map(livePages.map((p) => [p.id, p]));

  const pagesToCreate = livePages.filter((r) => {
    const currentPage = currentPagesMap.get(r.id);
    return currentPage === undefined;
  });

  const pagesToUpdate = livePages.reduce<NotionObjectWithNeedleFileID[]>(
    (acc, livePage) => {
      const currentPage = currentPagesMap.get(livePage.id);
      if (!currentPage) {
        return acc;
      }
      if (currentPage.notionLastEditedTime === livePage.last_edited_time) {
        return acc;
      }
      acc.push({ ...livePage, ndlFileId: currentPage.ndlFileId });
      return acc;
    },
    [],
  );

  const pagesToDelete = currentPages.filter((p) => {
    const page = livePagesMap.get(p.notionPageId);
    return page === undefined;
  });

  return { pagesToCreate, pagesToUpdate, pagesToDelete };
}

import { SearchResponse } from "@notionhq/client/build/src/api-endpoints";
import { groupPagesByDatabase } from "~/utils/notion-utils";

export function NotionPageTable({
  searchResponse,
}: {
  searchResponse: SearchResponse;
}) {
  const databasesWithPages = groupPagesByDatabase(searchResponse);

  return (
    <table className="w-full table-auto border-collapse text-left">
      <thead>
        <tr>
          <th className="sticky top-0 z-10 p-0 text-sm font-semibold leading-6 text-slate-700 dark:text-slate-300">
            Page
          </th>
        </tr>
      </thead>
      <tbody className="align-baseline">
        {Object.values(databasesWithPages).map((database) => (
          <>
            <tr key={database.id}>
              <td className="whitespace-nowrap pr-2">
                <a
                  href={database.url}
                  target="_blank"
                  className="my-8 mr-auto text-sm font-medium text-gray-400 hover:text-white hover:underline"
                >
                  {database.url}
                </a>
              </td>
            </tr>
            {database.pages.map((p) => (
              <tr key={p.id}>
                <td className="whitespace-nowrap pr-2">
                  <a
                    href={p.url}
                    target="_blank"
                    className="my-8 mr-auto text-sm font-medium text-gray-400 hover:text-white hover:underline"
                  >
                    {p.url}
                  </a>
                </td>
              </tr>
            ))}
          </>
        ))}
      </tbody>
    </table>
  );
}

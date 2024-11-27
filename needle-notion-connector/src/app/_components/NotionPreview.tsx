import {
  DatabaseObjectResponse,
  PageObjectResponse,
  SearchResponse,
} from "@notionhq/client/build/src/api-endpoints";

export function NotionPreview({
  searchResponse,
}: {
  searchResponse: SearchResponse;
}) {
  return (
    <div className="relative h-80 overflow-x-auto overflow-y-scroll">
      <table className="w-full text-left text-sm text-gray-500 rtl:text-right dark:text-gray-400">
        <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-700 dark:text-gray-400">
          <tr>
            <th scope="col" className="px-6 py-3">
              Page name
            </th>
            <th scope="col" className="px-6 py-3">
              Type
            </th>
          </tr>
        </thead>
        <tbody>
          {searchResponse.results.map((r) => (
            <tr
              key={r.id}
              className="border-b bg-white dark:border-gray-700 dark:bg-gray-800"
            >
              <th
                scope="row"
                className="whitespace-nowrap px-6 py-4 font-medium text-gray-900 dark:text-white"
              >
                <a href={r.url} target="_blank">
                  {getPageTitle(r)} ↗
                </a>
              </th>
              <td className="px-6 py-4 capitalize">{r.object}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function getPageTitle(result: SearchResponse["results"][number]) {
  if (result.object === "database") {
    return (result as DatabaseObjectResponse).title[0]?.plain_text;
  }
  const properties = (result as PageObjectResponse).properties;
  const title = Object.values(properties).find((p) => p.type === "title");
  return title?.title[0]?.plain_text ?? "(unnamed page)";
}

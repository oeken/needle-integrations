import { type PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

export function NotionPageTable({ pages }: { pages: PageObjectResponse[] }) {
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
        {pages.map((p) => (
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
      </tbody>
    </table>
  );
}

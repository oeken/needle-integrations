"use client";

import { type ChangeEvent, type MouseEventHandler, useState } from "react";

export interface NotionPreviewData {
  id: string;
  object: "database" | "page";
  url: string;
  title: string;
}

export function NotionConnectorPreview({
  pages,
}: {
  pages: NotionPreviewData[];
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const totalLength = pages.length;
  const PAGE_SIZE = 10;
  const totalPages = Math.round(totalLength / PAGE_SIZE);

  const filteredPages = pages
    .filter((page) => {
      if (search === "") {
        return true;
      }

      if (page.title?.toLowerCase().includes(search.toLowerCase())) {
        return true;
      }

      return false;
    })
    .slice(PAGE_SIZE * (page - 1), PAGE_SIZE * page);

  return (
    <div className="flex flex-col gap-2">
      <div className="mt-4 flex flex-row items-center">
        <div className="relative grow">
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <SearchIcon />
        </div>

        <span className="m-2 text-sm text-zinc-500">
          Showing {(page - 1) * PAGE_SIZE + 1}-{page * PAGE_SIZE} of{" "}
          {pages.length}
        </span>

        <PaginationButton
          direction="left"
          onClick={() => setPage((page) => Math.max(1, --page))}
        />
        <PaginationButton
          direction="right"
          onClick={() => setPage((page) => Math.min(totalPages + 1, ++page))}
        />
      </div>
      <div className="mt-4 flex flex-col gap-2 overflow-x-auto rounded-lg border dark:border-zinc-700">
        <table>
          <thead>
            <tr className="border-b bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
              <th className="p-2 text-left text-sm font-bold uppercase text-zinc-600 dark:text-white">
                Name
              </th>
              <th className="p-2 text-left text-sm font-bold uppercase text-zinc-600 dark:text-white">
                Type
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {filteredPages.map((page) => (
              <tr
                key={page.id}
                className="text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900"
              >
                <td className="p-2">
                  <a href={page.url} target="_blank">
                    {page.title} ↗
                  </a>
                </td>
                <td className="p-2 capitalize">{page.object}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <input
      placeholder="Search pages and databases"
      className="search-bar focus:border-primary-500 undefined w-full rounded-lg border-[1.5px] border-zinc-300 bg-zinc-50 px-10 py-2 outline-none transition dark:border-zinc-700 dark:bg-zinc-950"
      type="text"
      value={value}
      onChange={onChange}
    />
  );
}

function SearchIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-search absolute left-2.5 top-1/2 -translate-y-1/2"
    >
      <circle cx="11" cy="11" r="8"></circle>
      <path d="m21 21-4.3-4.3"></path>
    </svg>
  );
}

function PaginationButton({
  direction,
  onClick,
}: {
  direction: "left" | "right";
  onClick: MouseEventHandler;
}) {
  return (
    <button
      className="flex flex-row items-center gap-2 rounded !p-2 px-6 py-2 transition hover:bg-zinc-100 dark:hover:bg-zinc-900"
      onClick={onClick}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="lucide lucide-chevron-left"
        style={{ rotate: direction === "left" ? "-180deg" : "unset" }}
      >
        <path d="m9 18 6-6-6-6"></path>
      </svg>
    </button>
  );
}

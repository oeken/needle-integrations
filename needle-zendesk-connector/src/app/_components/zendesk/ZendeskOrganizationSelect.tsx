"use client";

import { useZendeskResources } from "../providers/ZendeskResourcesProvider";
import { Select } from "../atoms/Select";
import { MultiSelect, type MultiSelectItem } from "../atoms/MultiSelect";
import { useState, useEffect } from "react";
import { Button } from "../atoms/Button";

type ZendeskType = "ticket" | "article";

const ZENDESK_TYPES: MultiSelectItem<ZendeskType>[] = [
  {
    value: "ticket",
    key: "ticket",
    label: "Ticket",
  },
  {
    value: "article",
    key: "article",
    label: "Article",
  },
];

export function ZendeskOrganizationSelect() {
  const {
    organizations,
    selectedOrganizationId,
    setSelectedOrganizationId,
    setSelectedSubdomain,
    setSelectedTypes,
    selectedTypes,
  } = useZendeskResources();

  const [selectedContentTypes, setSelectedContentTypes] = useState<
    MultiSelectItem<ZendeskType>[]
  >(() => {
    return ZENDESK_TYPES.filter((item) => selectedTypes.includes(item.value));
  });
  const [orgId, setOrgId] = useState<number>();

  useEffect(() => {
    const selectedItems = ZENDESK_TYPES.filter((item) =>
      selectedTypes.includes(item.value),
    );
    setSelectedContentTypes(selectedItems);
  }, [selectedTypes]);

  function handleSubmit() {
    if (!orgId) return;
    setSelectedOrganizationId(orgId);
    const selectedTypeValues = selectedContentTypes.map((item) => item.value);
    setSelectedTypes(selectedTypeValues);
    const selectedOrg = organizations.find((org) => org.id === orgId);
    if (selectedOrg) {
      const subdomain =
        selectedOrg.url?.split("//")?.[1]?.split(".")?.[0] ?? null;
      setSelectedSubdomain(subdomain);
    } else {
      setSelectedSubdomain(null);
    }
  }

  function handleContentTypeChange(types: ZendeskType[]) {
    if (types.length <= 2) {
      const selectedItems = ZENDESK_TYPES.filter((item) =>
        types.includes(item.value),
      );
      setSelectedContentTypes(selectedItems);
    }
  }

  function handleOrganizationChange(selected: unknown) {
    const orgId = selected as number;
    setOrgId(orgId);
  }

  const isSubmitDisabled = !orgId || selectedContentTypes.length === 0;

  return (
    <div className="mb-4">
      <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Select Organization
      </label>
      <Select
        items={organizations.map((org) => ({
          value: org.id,
          label: org.name,
        }))}
        defaultValue={selectedOrganizationId}
        onChange={handleOrganizationChange}
        placeholder="Select an organization"
      />
      <div className="mb-4 mt-2">
        <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Select Content Type (max 2)
        </label>
        <MultiSelect
          items={ZENDESK_TYPES}
          defaultSelectedItems={selectedContentTypes}
          onChange={handleContentTypeChange}
          placeholder="Select content types"
        />
      </div>
      <Button
        onClick={handleSubmit}
        className="mt-2 w-full text-center"
        disabled={isSubmitDisabled}
      >
        Submit
      </Button>
    </div>
  );
}

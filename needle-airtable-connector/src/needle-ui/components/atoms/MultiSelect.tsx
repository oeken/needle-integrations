import type { BaseProps } from "~/needle-ui/models/react-models";
import { Badge } from "./Badge";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CircleAlertIcon,
  XIcon,
} from "lucide-react";
import { Button } from "./Button";
import { useEffect, useMemo, useRef, useState } from "react";
import { Divider } from "./Divider";
import { Checkbox } from "./Checkbox";
import { popAt } from "~/needle-ui/utils/array-utils";
import { useEffectSkipFirst } from "~/needle-ui/hooks";
import { debounce } from "~/needle-ui/utils/function-utils";
import { Input } from "./Input";

export type MultiSelectItem<T> = {
  value: T; // used to store the value
  key: string; // used as unique identifier
  label: string; // used for display
};

type MultiSelectProps<T> = BaseProps & {
  items: MultiSelectItem<T>[];
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  defaultSelectedItems?: MultiSelectItem<T>[];
  onChange: (selected: T[]) => void;
};

export function MultiSelect<T>({
  items,
  placeholder,
  disabled,
  error,
  defaultSelectedItems = [],
  onChange,
  className,
}: MultiSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItems, setSelectedItems] =
    useState<MultiSelectItem<T>[]>(defaultSelectedItems);
  const [filteredItems, setFilteredItems] = useState(items);
  const [searchTerm, setSearchTerm] = useState("");
  const searchRef = useRef(null);

  const filterItemsDebounced = useMemo(
    () =>
      debounce((searchTerm: string) => {
        const filteredItems = items.filter((item) =>
          item.label.toLowerCase().includes(searchTerm.toLowerCase()),
        );
        setFilteredItems(filteredItems);
      }, 400),
    [items],
  );

  useEffect(() => {
    filterItemsDebounced(searchTerm);
  }, [filterItemsDebounced, searchTerm]);

  // useEffectSkipFirst to skip run in first render
  useEffectSkipFirst(() => {
    console.log("SelectedItem: ", selectedItems);
    
    onChange(selectedItems.map((i) => i.value));
  }, [selectedItems]);

  useEffect(() => {
    if (disabled) {
      setIsOpen(false);
    }
  }, [disabled]);

  return (
    <div>
      <div
        tabIndex={1}
        data-state={disabled ? "disabled" : "enabled"}
        onBlur={(e) => {
          if (e.relatedTarget !== searchRef.current) {
            // close the dropdown when focus is lost, except when the focus is on the search input
            setIsOpen(false);
          }
        }}
        className="relative data-[state=disabled]:opacity-50 data-[state=enabled]:hover:cursor-pointer"
      >
        <div
          onClick={() => !disabled && setIsOpen(!isOpen)}
          data-state={isOpen ? "open" : "closed"}
          className={`flex h-[42px] flex-row items-center gap-1 rounded border-[1.5px] px-2 outline-none transition data-[state=open]:border-black dark:border-zinc-700 dark:data-[state=open]:border-white ${className}`}
        >
          {selectedItems.map((item) => {
            const index = selectedItems.findIndex(
              (s) => s.value === item.value,
            );
            return (
              <MultiSelectItemBadge
                key={item.key}
                item={item}
                onRemove={() => setSelectedItems(popAt(selectedItems, index))}
              />
            );
          })}

          {selectedItems.length === 0 && (
            <span className="text-zinc-500/80">{placeholder}</span>
          )}
        </div>

        <Button
          buttonType="ghost"
          color="primary"
          disabled={disabled}
          className="absolute right-10 top-1/2 -translate-y-1/2 !p-1"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setSelectedItems([]);
          }}
        >
          <XIcon size={18} />
        </Button>

        <Divider
          type="vertical"
          className="absolute right-8 top-1/2 h-4/5 -translate-y-1/2"
        />

        {!isOpen && (
          <ChevronDownIcon
            size={20}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500"
          />
        )}
        {isOpen && (
          <ChevronUpIcon
            size={20}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500"
          />
        )}

        {isOpen && (
          <div className="absolute -bottom-2 left-0 z-10 max-h-48 w-full min-w-64 translate-y-full animate-showSlow overflow-y-auto rounded border bg-white shadow-sm hover:cursor-pointer dark:border-zinc-800 dark:bg-zinc-950">
            <Input
              ref={searchRef}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onBlur={(e) => e.stopPropagation()}
              placeholder="Search"
              className="!border-none bg-zinc-50 px-1 text-sm text-zinc-500 dark:bg-zinc-800 dark:text-zinc-100"
            />

            {filteredItems.map((item) => {
              const index = selectedItems.findIndex((s) => s.key === item.key);
              const isSelected = index !== -1;
              const handleClick = isSelected
                ? () => setSelectedItems(popAt(selectedItems, index))
                : () => setSelectedItems((s) => [...s, item]);

              return (
                <MultiSelectItemRow
                  key={item.key}
                  item={item}
                  isSelected={isSelected}
                  onClick={handleClick}
                />
              );
            })}
          </div>
        )}
      </div>

      {error && (
        <span className="ml-1 mt-0.5 flex items-center gap-1 text-sm text-red-500">
          <CircleAlertIcon size={14} />
          {error}
        </span>
      )}
    </div>
  );
}

type MultiSelectItemBadgeProps<T> = {
  item: MultiSelectItem<T>;
  onRemove: () => void;
};

function MultiSelectItemBadge<T>({
  item,
  onRemove,
}: MultiSelectItemBadgeProps<T>) {
  return (
    <Badge color="primary" className="flex flex-row items-center gap-1">
      {item.label}
      <Button
        buttonType="ghost"
        className="mt-0.5 !p-0"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onRemove();
        }}
      >
        <XIcon size={16} />
      </Button>
    </Badge>
  );
}

type MultiSelectItemRowProps<T> = {
  item: MultiSelectItem<T>;
  isSelected: boolean;
  onClick: () => void;
};

function MultiSelectItemRow<T>({
  item,
  isSelected,
  onClick,
}: MultiSelectItemRowProps<T>) {
  return (
    <>
      <div
        className="flex flex-row justify-between px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onClick();
        }}
      >
        {item.label}
        <Checkbox checked={isSelected} />
      </div>
      <Divider type="horizontal" />
    </>
  );
}
import type { BaseProps } from "~/models/react-models";
import { Badge } from "./Badge";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CircleAlertIcon,
  XIcon,
} from "lucide-react";
import { Button } from "./Button";
import { useEffect, useMemo, useRef, useState } from "react";
import { Divider } from "./Divider";
import { Input } from "./Input";
import { debounce } from "~/utils/function-utils";

type SelectItem = { value: unknown; label: string };

type SelectProps = BaseProps & {
  items: SelectItem[];
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  defaultValue?: unknown;
  onChange: (selected: unknown) => void;
};

export function Select({
  items,
  placeholder,
  disabled,
  error,
  defaultValue,
  onChange,
  className,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredItems, setFilteredItems] = useState(items);
  const [searchTerm, setSearchTerm] = useState("");
  const defaultItem = items.find((item) => item.value === defaultValue) ?? null;
  const [selectedItem, setSelectedItem] = useState<SelectItem | null>(
    defaultItem,
  );
  const searchRef = useRef(null);

  useEffect(() => {
    onChange(selectedItem?.value);
  }, [selectedItem, onChange]);

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

  useEffect(() => {
    if (disabled) {
      setIsOpen(false);
    }
  }, [disabled]);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
    }
  }, [isOpen]);

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
          {selectedItem && (
            <SelectItemBadge
              item={selectedItem}
              onRemove={() => setSelectedItem(null)}
            />
          )}

          {!selectedItem && (
            <span className="text-zinc-500/80">{placeholder}</span>
          )}
        </div>

        {!isOpen && (
          <ChevronDownIcon
            onClick={() => !disabled && setIsOpen(!isOpen)}
            size={20}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500"
          />
        )}
        {isOpen && (
          <ChevronUpIcon
            onClick={() => !disabled && setIsOpen(!isOpen)}
            size={20}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500"
          />
        )}

        {isOpen && (
          <div className="absolute -bottom-2 left-0 z-10 max-h-48 w-full min-w-64 translate-y-full animate-showSlow overflow-y-auto rounded border bg-white shadow-sm hover:cursor-pointer dark:border-zinc-800 dark:bg-zinc-950">
            <div>
              <Input
                ref={searchRef}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onBlur={(e) => e.stopPropagation()}
                placeholder="Search"
                className="!border-none bg-zinc-50 px-1 text-sm text-zinc-500 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>

            {filteredItems.map((item) => {
              const isSelected = selectedItem?.value === item.value;
              const handleClick = isSelected
                ? () => setSelectedItem(null)
                : () => setSelectedItem(item);

              return (
                <SelectItemRow
                  key={JSON.stringify(item.value)}
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

type SelectItemBadgeProps = {
  item: SelectItem;
  onRemove: () => void;
};

function SelectItemBadge({ item, onRemove }: SelectItemBadgeProps) {
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

type SelectItemRowProps = {
  item: SelectItem;
  isSelected: boolean;
  onClick: () => void;
};

function SelectItemRow({ item, isSelected, onClick }: SelectItemRowProps) {
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
        {isSelected && <CheckIcon size={18} />}
      </div>
      <Divider type="horizontal" />
    </>
  );
}

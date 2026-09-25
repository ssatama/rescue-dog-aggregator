"use client";

import React from "react";
import { ArrowUpDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATALOG_SORTS } from "@/constants/filters";
import { trackSortChanged } from "@/lib/analytics";

interface SortMenuProps {
  value: string;
  onChange: (sort: string) => void;
  /** Which sorts to offer; a single rescue's page has no use for "Recommended". */
  options?: ReadonlyArray<{ value: string; label: string }>;
  className?: string;
}

/** The dog list's order (#494), shared by the catalog and rescue pages. */
export default function SortMenu({
  value,
  onChange,
  options = CATALOG_SORTS,
  className = "",
}: SortMenuProps): React.JSX.Element {
  return (
    <Select
      value={value}
      onValueChange={(sort: string) => {
        trackSortChanged(sort);
        onChange(sort);
      }}
    >
      <SelectTrigger
        data-testid="sort-filter"
        aria-label="Sort dogs"
        className={`h-9 w-auto gap-2 rounded-lg border-line bg-surface text-sm ${className}`}
      >
        <ArrowUpDown className="h-4 w-4 text-subtle" aria-hidden="true" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

"use client";

import React from "react";
import { X } from "lucide-react";
import SortMenu from "./SortMenu";
import { FILTER_DEFAULTS, ageFilterLabel } from "@/constants/filters";
import { countryOptionLabel, getCountryName } from "@/utils/countryNames";
import type { Filters, OrganizationMetadata } from "@/types/dogsPage";

type FilterKey = Exclude<keyof Filters, "sortFilter">;

/** Each filter's "off" value; removing a chip sets it back to this. */
export const FILTER_RESET: Record<FilterKey, string> = {
  searchQuery: "",
  sizeFilter: FILTER_DEFAULTS.SIZE,
  ageFilter: FILTER_DEFAULTS.AGE,
  sexFilter: FILTER_DEFAULTS.SEX,
  organizationFilter: FILTER_DEFAULTS.ORGANIZATION,
  breedFilter: FILTER_DEFAULTS.BREED,
  breedGroupFilter: FILTER_DEFAULTS.GROUP,
  locationCountryFilter: FILTER_DEFAULTS.COUNTRY,
  availableCountryFilter: FILTER_DEFAULTS.COUNTRY,
  availableRegionFilter: FILTER_DEFAULTS.REGION,
};

export interface FilterChip {
  key: FilterKey;
  label: string;
}

/** A chip for every active filter, in the order the filter panel lists them.
 * Filters a landing page fixes (age on /dogs/puppies) have no chip: they
 * cannot be removed there. */
export function activeFilterChips(
  filters: Filters,
  organizations: OrganizationMetadata[] = [],
  fixed: FilterKey[] = [],
): FilterChip[] {
  const label: Record<FilterKey, (value: string) => string> = {
    searchQuery: (value) => `“${value}”`,
    availableCountryFilter: (value) => `Adoptable to ${countryOptionLabel(value)}`,
    availableRegionFilter: (value) => value,
    sizeFilter: (value) => value,
    ageFilter: (value) => ageFilterLabel(value),
    sexFilter: (value) => value,
    breedFilter: (value) => value,
    breedGroupFilter: (value) => `${value} group`,
    organizationFilter: (value) =>
      organizations.find((org) => String(org.id) === value)?.name ?? "One rescue",
    locationCountryFilter: (value) => `In ${getCountryName(value)}`,
  };
  return (Object.keys(label) as FilterKey[])
    .filter((key) => !fixed.includes(key))
    .filter((key) => {
      const value = (filters[key] ?? "").trim();
      return value !== "" && value !== FILTER_RESET[key];
    })
    .map((key) => ({ key, label: label[key](filters[key].trim()) }));
}

interface CatalogToolbarProps {
  filters: Filters;
  /** Dogs matching every filter; null until the first count arrives. */
  total: number | null;
  organizations?: OrganizationMetadata[];
  fixed?: FilterKey[];
  onRemove: (key: FilterKey, value: string) => void;
  onClearAll: () => void;
  onSortChange: (sort: string) => void;
}

/** "214 dogs match", the sort menu and a removable chip per active filter (#494). */
export default function CatalogToolbar({
  filters,
  total,
  organizations,
  fixed,
  onRemove,
  onClearAll,
  onSortChange,
}: CatalogToolbarProps): React.JSX.Element {
  const chips = activeFilterChips(filters, organizations, fixed);
  const country = filters.availableCountryFilter;
  const adoptableIn = country && country !== FILTER_DEFAULTS.COUNTRY ? getCountryName(country) : null;

  return (
    <div className="mb-4 grid gap-3" data-testid="catalog-toolbar">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="min-h-6 text-sm text-subtle" aria-live="polite" data-testid="result-count">
          {total !== null && (
            <>
              <span className="font-display text-lg font-bold text-ink">
                {total.toLocaleString("en-GB")} {total === 1 ? "dog" : "dogs"}
              </span>{" "}
              {total === 1 ? "matches" : "match"}
              {adoptableIn && <> you can adopt in {adoptableIn}</>}
            </>
          )}
        </p>
        <SortMenu value={filters.sortFilter ?? FILTER_DEFAULTS.SORT} onChange={onSortChange} />
      </div>

      {chips.length > 0 && (
        <ul className="flex flex-wrap items-center gap-2" aria-label="Active filters">
          {chips.map((chip) => (
            <li key={chip.key}>
              <button
                type="button"
                onClick={() => onRemove(chip.key, FILTER_RESET[chip.key])}
                className="inline-flex items-center gap-1.5 rounded-full bg-soft py-1 pl-3 pr-2 text-sm font-medium text-ink transition-colors hover:bg-line focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {chip.label}
                <X className="h-3.5 w-3.5 text-subtle" aria-hidden="true" />
                <span className="sr-only">Remove filter</span>
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={onClearAll}
              className="rounded-full px-2 py-1 text-sm font-medium text-subtle underline-offset-2 hover:text-ink hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Clear all
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}

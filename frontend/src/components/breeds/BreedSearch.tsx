"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

export interface BreedLink {
  name: string;
  slug: string;
  count: number;
}

const MAX_RESULTS = 8;

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Breeds whose name contains the query; names starting with it first, then
 * the ones with most dogs. */
export function matchBreeds(breeds: BreedLink[], query: string): BreedLink[] {
  const q = normalize(query);
  if (!q) return [];
  return breeds
    .map((breed) => ({ breed, name: normalize(breed.name) }))
    .filter(({ name }) => name.includes(q))
    .sort(
      (a, b) =>
        Number(!a.name.startsWith(q)) - Number(!b.name.startsWith(q)) ||
        Number(!` ${a.name}`.includes(` ${q}`)) - Number(!` ${b.name}`.includes(` ${q}`)) ||
        b.breed.count - a.breed.count,
    )
    .slice(0, MAX_RESULTS)
    .map(({ breed }) => breed);
}

/**
 * Find a breed page by typing (#500): tap the field, type, tap the breed. The
 * query never leaves the page; one with no breed page links to the catalog
 * search, which knows nicknames like "staffy".
 */
export default function BreedSearch({ breeds }: { breeds: BreedLink[] }): React.JSX.Element {
  const [query, setQuery] = useState("");
  const inputId = useId();
  const resultsId = useId();
  const matches = useMemo(() => matchBreeds(breeds, query), [breeds, query]);
  const trimmed = query.trim();

  return (
    <div role="search" className="w-full max-w-xl">
      <label htmlFor={inputId} className="sr-only">
        Find a breed
      </label>
      <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-ring">
        <Search className="h-5 w-5 shrink-0 text-subtle" aria-hidden="true" />
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Find a breed, e.g. Labrador"
          autoComplete="off"
          aria-controls={resultsId}
          className="min-w-0 flex-1 bg-transparent text-base text-ink placeholder:text-subtle focus:outline-none"
        />
      </div>

      <div id={resultsId} aria-live="polite">
        {trimmed && matches.length > 0 && (
          <ul className="mt-2 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {matches.map((breed) => (
              <li key={breed.slug}>
                <Link
                  href={`/breeds/${breed.slug}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-ink hover:bg-soft focus:outline-none focus-visible:bg-soft"
                >
                  <span className="font-medium">{breed.name}</span>
                  <span className="text-sm text-subtle">{breed.count} dogs</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {trimmed && matches.length === 0 && (
          <p className="mt-2 rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-subtle">
            No breed page for &ldquo;{trimmed}&rdquo;.{" "}
            <Link href={`/dogs?search=${encodeURIComponent(trimmed)}`} className="font-semibold text-orange-700 underline dark:text-orange-400">
              Search all dogs for it
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

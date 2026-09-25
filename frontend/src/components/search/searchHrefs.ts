import { SIZE_API_MAPPING } from "@/constants/filters";

// The suggest endpoint names filters by their /api/animals params; the catalog
// URL uses its own keys. A filter the catalog URL cannot express yet (the
// good_with_* ones, until #495) has no href and is not offered.
const SIZE_FROM_API: Record<string, string> = Object.fromEntries(
  Object.entries(SIZE_API_MAPPING).map(([label, api]) => [api, label]),
);

const URL_PARAM_FROM_API: Record<string, (value: string) => [string, string] | null> = {
  age_category: (value) => ["age", value],
  standardized_size: (value) => (SIZE_FROM_API[value] ? ["size", SIZE_FROM_API[value]] : null),
};

/** Catalog query to build on: the current one when already on /dogs, so a pick
 * adds to the visitor's filters, otherwise nothing. The typed text and the page
 * never carry over. */
export function catalogBase(pathname: string | null, current: URLSearchParams | null): URLSearchParams {
  const base = new URLSearchParams(pathname === "/dogs" && current ? current.toString() : "");
  base.delete("search");
  base.delete("page");
  base.delete("scroll");
  return base;
}

function catalogHref(base: URLSearchParams, entries: [string, string][]): string {
  const params = new URLSearchParams(base.toString());
  entries.forEach(([key, value]) => params.set(key, value));
  const query = params.toString();
  return query ? `/dogs?${query}` : "/dogs";
}

export function breedHref(base: URLSearchParams, breed: string): string {
  return catalogHref(base, [["breed", breed]]);
}

export function rescueHref(base: URLSearchParams, organizationId: number): string {
  return catalogHref(base, [["organization_id", String(organizationId)]]);
}

export function filterHref(base: URLSearchParams, apiParams: Record<string, string>): string | null {
  const entries: [string, string][] = [];
  for (const [key, value] of Object.entries(apiParams)) {
    const entry = URL_PARAM_FROM_API[key]?.(value);
    if (!entry) return null;
    entries.push(entry);
  }
  return catalogHref(base, entries);
}

export function textSearchHref(base: URLSearchParams, text: string): string {
  const trimmed = text.trim();
  return catalogHref(base, trimmed ? [["search", trimmed]] : []);
}

import { LIVES_WELL_WITH, SIZE_API_MAPPING } from "@/constants/filters";

// The suggest endpoint names filters by their /api/animals params; the catalog
// URL uses its own keys. A filter the catalog URL cannot express has no href
// and is not offered.
const SIZE_FROM_API: Record<string, string> = Object.fromEntries(
  Object.entries(SIZE_API_MAPPING).map(([label, api]) => [api, label]),
);

const URL_PARAM_FROM_API: Record<string, (value: string) => [string, string] | null> = {
  age_category: (value) => ["age", value],
  standardized_size: (value) => (SIZE_FROM_API[value] ? ["size", SIZE_FROM_API[value]] : null),
  // The lifestyle toggles use the API's own names in the URL
  ...Object.fromEntries(
    LIVES_WELL_WITH.map(({ url }) => [url, (value: string) => (value === "true" ? [url, "true"] : null)]),
  ),
};

// Pages that render the dog catalog: /dogs and its landing pages. A search
// from one of them stays on it, so /dogs/senior keeps searching seniors.
const CATALOG_PATH = /^\/dogs(\/puppies|\/senior|\/country\/[^/]+)?$/;

export interface CatalogBase {
  path: string;
  params: URLSearchParams;
}

export function isCatalogPath(pathname: string | null): boolean {
  return Boolean(pathname && CATALOG_PATH.test(pathname));
}

/** Where a pick lands: the current catalog page with its filters, so a pick
 * adds to them, or plain /dogs from anywhere else. The typed text and the
 * page never carry over. */
export function catalogBase(pathname: string | null, current: URLSearchParams | null): CatalogBase {
  const onCatalog = isCatalogPath(pathname);
  const params = new URLSearchParams(onCatalog && current ? current.toString() : "");
  params.delete("search");
  params.delete("page");
  params.delete("scroll");
  return { path: onCatalog && pathname ? pathname : "/dogs", params };
}

function catalogHref(base: CatalogBase, entries: [string, string][]): string {
  const params = new URLSearchParams(base.params.toString());
  entries.forEach(([key, value]) => params.set(key, value));
  const query = params.toString();
  return query ? `${base.path}?${query}` : base.path;
}

export function breedHref(base: CatalogBase, breed: string): string {
  return catalogHref(base, [["breed", breed]]);
}

export function rescueHref(base: CatalogBase, organizationId: number): string {
  return catalogHref(base, [["organization_id", String(organizationId)]]);
}

export function filterHref(base: CatalogBase, apiParams: Record<string, string>): string | null {
  const entries: [string, string][] = [];
  for (const [key, value] of Object.entries(apiParams)) {
    const entry = URL_PARAM_FROM_API[key]?.(value);
    if (!entry) return null;
    entries.push(entry);
  }
  // A landing page fixes one filter (age on /dogs/senior), so a filter pick
  // goes to /dogs, where it cannot contradict the page
  return catalogHref({ ...base, path: "/dogs" }, entries);
}

export function textSearchHref(base: CatalogBase, text: string): string {
  const trimmed = text.trim();
  return catalogHref(base, trimmed ? [["search", trimmed]] : []);
}

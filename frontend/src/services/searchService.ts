import { get } from "../utils/api";

export interface SuggestBreed {
  name: string;
  slug: string;
  count: number;
  matched_synonym: string | null;
}

export interface SuggestRescue {
  id: number;
  name: string;
  slug: string;
  count: number;
}

export interface SuggestDog {
  name: string;
  slug: string;
  breed: string | null;
  rescue: string;
  image: string | null;
}

export interface SuggestFilter {
  label: string;
  params: Record<string, string>;
}

export interface SuggestResponse {
  breeds: SuggestBreed[];
  rescues: SuggestRescue[];
  dogs: SuggestDog[];
  filters: SuggestFilter[];
}

/** Grouped suggestions for the search box (#491). An empty query returns the
 * breeds with the most dogs, for the box's empty state. */
export function getSuggestions(
  query: string,
  signal?: AbortSignal,
): Promise<SuggestResponse> {
  return get<SuggestResponse>(
    "/api/search/suggest",
    { q: query, limit: 5 },
    { signal },
  );
}

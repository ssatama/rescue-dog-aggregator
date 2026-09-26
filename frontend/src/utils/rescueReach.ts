import { getCountryName, normalizeCountryCode } from "./countryNames";

/** Up to this many countries are named; beyond it the line gives a count. */
export const NAMED_COUNTRIES_MAX = 5;

/** "A", "A and B", "A, B and C". */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function countryNames(codes: string[] | undefined): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const code of codes ?? []) {
    const normalized = normalizeCountryCode(code);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    names.push(getCountryName(normalized));
  }
  return names.sort((a, b) => a.localeCompare(b, "en"));
}

export interface RescueReach {
  /** "Sarajevo, Bosnia and Herzegovina"; null when the rescue gives no country */
  basedIn: string | null;
  /** Countries its dogs live in, when that says more than where it is based */
  dogsIn: string[];
  /** Countries it rehomes to, by name */
  rehomesTo: string[];
}

/**
 * Where a rescue is, where its dogs are and where it rehomes them to (#501).
 * Rows with nothing to say are empty, never "Not provided".
 */
export function rescueReach(org: {
  country?: string | null;
  city?: string | null;
  service_regions?: string[] | null;
  ships_to?: string[] | null;
}): RescueReach {
  const basedIn = org.country
    ? [org.city, getCountryName(org.country)].filter(Boolean).join(", ")
    : null;
  const dogsIn = countryNames(org.service_regions ?? []);
  const home = org.country ? getCountryName(org.country) : null;
  return {
    basedIn,
    // "Dogs are in Germany" adds nothing to "Based in Berlin, Germany"
    dogsIn: dogsIn.length === 1 && dogsIn[0] === home ? [] : dogsIn,
    rehomesTo: countryNames(org.ships_to ?? []),
  };
}

/** "Germany and Austria", or "30 countries" once there are too many to read. */
export function countriesPhrase(names: string[]): string {
  return names.length > NAMED_COUNTRIES_MAX ? `${names.length} countries` : joinNames(names);
}

import { normalizeCountryCode } from "./countryNames";
import type { Dog } from "@/types/dog";

/** Whether the dog's rescue adopts out to `country` (an ISO code). Rescues
 * list where they ship as codes with aliases ("UK"), so both sides are
 * normalised. No country means no claim either way. */
export function isAdoptableTo(dog: Pick<Dog, "organization">, country: string | null): boolean {
  if (!country) return false;
  const target = normalizeCountryCode(country);
  return (dog.organization?.ships_to ?? []).some((code) => normalizeCountryCode(code) === target);
}

/** The catalog's own value for `country` among its options ("UK" for GB), or
 * null when no listed rescue adopts out there. */
export function catalogCountryValue(options: string[], country: string | null): string | null {
  if (!country) return null;
  const target = normalizeCountryCode(country);
  return options.find((option) => normalizeCountryCode(option) === target) ?? null;
}

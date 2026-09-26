import type { Dog } from "./dog";
import type { DogsPageMetadata } from "./dogsPage";
import type { OrganizationCardData, RescueHeaderOrganization } from "./organizationComponents";
import type { FilterCount, FilterCountsResponse } from "@/schemas/common";
import type { CountryStatsResponse } from "@/schemas/animals";

export interface DogDetailClientProps {
  params?: { slug?: string };
  initialDog?: Dog | null;
  /** Server-fetched similar dogs (same size and age group); when absent the section fetches its own */
  initialSimilarDogs?: Dog[];
  /** The dog's breed page slug, or null when the breed has no indexable page */
  breedPageSlug?: string | null;
}

export interface OrganizationDetailClientProps {
  organization: RescueHeaderOrganization;
  /** The catalog's first page for this rescue */
  initialDogs: Dog[];
  /** The catalog's filter options (rescues, countries) */
  metadata?: DogsPageMetadata;
  /** Unfiltered counts for the rescue: per-country totals for "adoptable to you" */
  counts?: FilterCountsResponse | null;
}

export interface OrganizationsClientProps {
  initialData?: OrganizationCardData[];
}

export interface AgeCategory {
  slug: string;
  name: string;
  title: string;
  ageRange: string;
  tagline: string;
  description: string;
  apiValue: string;
  shortName: string;
  count?: number;
}

export interface AgeCategoryStats {
  slug: string;
  count: number;
}

export interface AgeHubStats {
  ageCategories: AgeCategoryStats[];
}

export interface AgeHubClientProps {
  initialStats: AgeHubStats;
}

export interface CountryData {
  code: string;
  name: string;
  shortName: string;
  placeName?: string;
  flag: string;
  description: string;
  count?: number;
  organizations?: number;
}

export type CountriesHubStats = CountryStatsResponse;

export interface CountriesHubClientProps {
  initialStats: CountriesHubStats;
  /** Every dog's per-country counts of where it can be adopted */
  adoptableOptions?: FilterCount[];
}

export interface AgeLandingClientProps {
  ageCategory: AgeCategory;
  initialDogs: Dog[];
  metadata: DogsPageMetadata;
  totalCount: number;
  /** Per-country counts of the page's dogs, for "N adoptable to you" */
  adoptableOptions?: FilterCount[];
}

export interface CountryDogsClientProps {
  country: CountryData;
  initialDogs: Dog[];
  metadata: DogsPageMetadata;
  allCountries: Record<string, CountryData>;
  /** Dogs that live in the country */
  totalCount: number;
  /** Dogs anyone living in the country can adopt, wherever they live now */
  adoptableCount: number;
}

export type AgeStructuredDataProps =
  | { pageType: "index"; stats: AgeHubStats; ageCategory?: AgeCategory; dogCount?: number }
  | { pageType?: "category"; ageCategory: AgeCategory; dogCount: number; stats?: AgeHubStats };

export type CountryStructuredDataProps =
  | { pageType: "index"; stats: CountriesHubStats; country?: CountryData; dogCount?: number }
  | { pageType?: "country"; country: CountryData; dogCount: number; stats?: CountriesHubStats };

import type { Dog } from "./dog";
import type { DogsPageMetadata } from "./dogsPage";
import type { OrganizationCardData } from "./organizationComponents";
import type { CountryStatsResponse } from "@/schemas/animals";

export interface DogDetailClientProps {
  params?: { slug?: string };
  initialDog?: Dog | null;
}

export interface OrganizationDetailClientProps {}

export interface OrganizationsClientProps {
  initialData?: OrganizationCardData[];
}

export interface AgeCategory {
  slug: string;
  name: string;
  emoji: string;
  ageRange: string;
  tagline: string;
  description: string;
  gradient: string;
  darkGradient: string;
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
  flag: string;
  tagline: string;
  description: string;
  gradient: string;
  count?: number;
  organizations?: number;
}

export type CountriesHubStats = CountryStatsResponse;

export interface CountriesHubClientProps {
  initialStats: CountriesHubStats;
}

export interface AgeCategoryClientProps {
  ageCategory: AgeCategory;
  initialDogs: Dog[];
  metadata: DogsPageMetadata;
  totalCount: number;
}

export type PuppiesClientProps = AgeCategoryClientProps;
export type SeniorDogsClientProps = AgeCategoryClientProps;

export interface CountryDogsClientProps {
  country: CountryData;
  initialDogs: Dog[];
  metadata: DogsPageMetadata;
  allCountries: Record<string, CountryData>;
  totalCount: number;
}

export interface AgeQuickNavProps {
  currentSlug?: string;
}

export interface CountryQuickNavProps {
  currentCountry?: string;
  allCountries: Record<string, CountryData>;
}

export type AgeStructuredDataProps =
  | { pageType: "index"; stats: AgeHubStats; ageCategory?: AgeCategory; dogCount?: number }
  | { pageType?: "category"; ageCategory: AgeCategory; dogCount: number; stats?: AgeHubStats };

export type CountryStructuredDataProps =
  | { pageType: "index"; stats: CountriesHubStats; country?: CountryData; dogCount?: number }
  | { pageType?: "country"; country: CountryData; dogCount: number; stats?: CountriesHubStats };

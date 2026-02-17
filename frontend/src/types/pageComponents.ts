import type { Dog } from "./dog";
import type { OrganizationCardData } from "./organizationComponents";

export interface DogDetailClientProps {
  params?: { slug?: string };
  initialDog?: Dog | null;
}

export interface OrganizationDetailClientProps {
  params?: { slug?: string };
}

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

export interface CountryStats {
  code: string;
  name: string;
  count: number;
  organizations: number;
}

export interface CountriesHubStats {
  total: number;
  countries: CountryStats[];
}

export interface CountriesHubClientProps {
  initialStats: CountriesHubStats;
}

export interface AgeCategoryClientProps {
  ageCategory: AgeCategory;
  initialDogs: Dog[];
  metadata: Record<string, unknown>;
  totalCount: number;
}

export type PuppiesClientProps = AgeCategoryClientProps;
export type SeniorDogsClientProps = AgeCategoryClientProps;

export interface CountryDogsClientProps {
  country: CountryData;
  initialDogs: Dog[];
  metadata: Record<string, unknown>;
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

export type AgeStructuredDataPageType = "category" | "index";

export interface AgeStructuredDataProps {
  ageCategory: AgeCategory;
  dogCount: number;
  stats?: AgeHubStats;
  pageType?: AgeStructuredDataPageType;
}

export interface CountryStructuredDataProps {
  country: CountryData;
  dogCount: number;
  stats?: CountriesHubStats;
  pageType?: "index" | "country";
}

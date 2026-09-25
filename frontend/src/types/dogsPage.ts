import type { Dog } from "./dog";
import type { FilterCountsResponse } from "../schemas/common";

export interface OrganizationMetadata {
  id: number | string | null;
  name: string;
  slug?: string;
}

export interface DogsPageMetadata {
  organizations?: OrganizationMetadata[];
  standardizedBreeds?: string[];
  locationCountries?: string[];
  availableCountries?: string[];
}

export interface DogsPageInitialParams {
  age_category?: string;
  location_country?: string;
  available_country?: string;
  /** A breed page's own breed (its primary_breed) or group (#500) */
  primary_breed?: string;
  breed_group?: string;
}

export interface Filters {
  searchQuery: string;
  sizeFilter: string;
  ageFilter: string;
  sexFilter: string;
  organizationFilter: string;
  breedFilter: string;
  breedGroupFilter: string;
  locationCountryFilter: string;
  availableCountryFilter: string;
  availableRegionFilter: string;
  /** Lifestyle filters (#495): "true" when on, "" when off */
  goodWithKidsFilter: string;
  goodWithDogsFilter: string;
  goodWithCatsFilter: string;
  firstTimeFriendlyFilter: string;
  /** An energy band (low, medium, high), or "" */
  energyFilter: string;
  /** Not a filter: the list's order. Never counted as an active filter. */
  sortFilter?: string;
}

export interface DogsPageClientSimplifiedProps {
  initialDogs?: Dog[];
  metadata?: DogsPageMetadata;
  initialParams?: DogsPageInitialParams;
  hideHero?: boolean;
  hideBreadcrumbs?: boolean;
}

export type { Dog, FilterCountsResponse };

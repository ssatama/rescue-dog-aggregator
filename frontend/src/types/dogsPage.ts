import type { Dog } from "./dog";
import type { FilterCountsResponse } from "../schemas/common";

export interface OrganizationMetadata {
  id: number | null;
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
}

export interface DogsPageClientSimplifiedProps {
  initialDogs?: Dog[];
  metadata?: DogsPageMetadata;
  initialParams?: DogsPageInitialParams;
  hideHero?: boolean;
  hideBreadcrumbs?: boolean;
  wrapWithLayout?: boolean;
}

export type { Dog, FilterCountsResponse };

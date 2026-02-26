import type { BreedGroupDisplay } from "../services/breedImagesService";
import type { BreedWithImages, BreedStats } from "../schemas/animals";
import type { Dog } from "./dog";
import type { FilterCountsResponse } from "../schemas/common";

export type { BreedGroupDisplay } from "../services/breedImagesService";

export interface BreedDescription {
  tagline?: string;
  overview?: string;
  temperament?: string;
  family?: string;
  care_info?: {
    grooming?: string;
    health?: string;
    training?: string;
    living_conditions?: string;
  };
  characteristics?: {
    affection_level?: number;
    energy_level?: number;
    trainability?: number;
    good_with_children?: number;
    exercise_needs?: number;
    size?: string;
  };
}

export interface PersonalityMetric {
  percentage: number;
  label: string;
}

export interface PersonalityMetrics {
  energy_level: PersonalityMetric;
  affection: PersonalityMetric;
  trainability: PersonalityMetric;
  independence: PersonalityMetric;
}

export interface BreedData {
  primary_breed: string;
  breed_slug?: string;
  breed_group?: string;
  breed_type?: string;
  count: number;
  slug?: string;
  description?: string;
  average_age?: number;
  average_age_months?: number;
  sex_distribution?: { male: number; female: number };
  organizations?: string[];
  countries?: string[];
  sample_dogs?: SampleDog[];
  sample_image_url?: string;
  personality_metrics?: PersonalityMetrics;
  personality_traits?: string[];
  experience_distribution?: ExperienceDistribution;
  unique_breeds?: number;
  qualifying_breeds?: Array<{
    primary_breed: string;
    breed_slug: string;
    count: number;
  }>;
}

export interface SampleDog {
  name: string;
  slug: string;
  primary_image_url?: string;
  age_group?: string;
  age_text?: string;
  sex?: string;
  personality_traits?: string[];
}

export interface ExperienceDistribution {
  first_time_ok?: number;
  some_experience?: number;
  experienced?: number;
}

export interface BreedDog {
  id: number | string;
  name: string;
  slug?: string;
  breed?: string;
  primary_image_url?: string;
  organization?: { name?: string };
  properties?: { description?: string };
}

export interface FilterOption {
  value: string;
  count?: number;
}

export interface BreedFilterCounts {
  total_count?: number;
  sex_options?: FilterOption[];
  size_options?: FilterOption[];
  age_options?: FilterOption[];
}

export interface BreedFilters {
  sexFilter?: string;
  sizeFilter?: string;
  ageFilter?: string;
  [key: string]: string | undefined;
}

export interface GalleryImage {
  url: string;
  alt?: string;
}

export interface BreedFilterBarProps {
  breedData: BreedData;
  filters: BreedFilters;
  filterCounts: FilterCountsResponse | null;
  onFilterChange: (key: string, value: string) => void;
  onClearFilters: () => void;
  onOpenMobileFilters: () => void;
  activeFilterCount: number;
}

export interface BreedGroupsSectionProps {
  breedGroups: BreedGroupDisplay[];
}

export interface BreedsHeroSectionProps {
  mixedBreedData: BreedWithImages | null;
  totalDogs: number;
}

export interface PopularBreedsSectionProps {
  popularBreeds: BreedWithImages[];
}

export interface BreedStructuredDataProps {
  breedData: BreedData;
  dogs?: BreedDog[];
  pageType?: "detail" | "hub";
}

export interface BreedPageData extends BreedData {
  topDogs?: SampleDog[];
  top_locations?: string[];
  available_countries?: string[];
  purebred_count?: number;
  crossbreed_count?: number;
}

export type BreedDetailFilterKey =
  | "searchQuery"
  | "sizeFilter"
  | "ageFilter"
  | "sexFilter"
  | "organizationFilter"
  | "availableCountryFilter";

export type BreedDetailFilters = Record<BreedDetailFilterKey, string>;

export interface BreedDetailClientProps {
  initialBreedData: BreedPageData;
  initialDogs: Dog[];
  lastUpdated?: string;
}

export interface BreedsHubClientProps {
  initialBreedStats: BreedStats & {
    purebred_count?: number;
    crossbreed_count?: number;
    unique_breeds?: number;
  };
  mixedBreedData: BreedWithImages | null;
  popularBreedsWithImages: BreedWithImages[];
  breedGroups: BreedGroupDisplay[];
}

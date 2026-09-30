import type { BreedGroupDisplay } from "../services/breedImagesService";
import type { BreedWithImages, BreedStats } from "../schemas/animals";
import type { Dog } from "./dog";
import type { DogsPageMetadata } from "./dogsPage";
import type { BreedLink } from "../components/breeds/BreedSearch";
import type { FilterCountsResponse } from "../schemas/common";

export type { BreedGroupDisplay } from "../services/breedImagesService";

export interface BreedData {
  primary_breed: string;
  breed_slug?: string;
  breed_group?: string;
  breed_type?: string;
  count: number;
  description?: string;
  average_age_months?: number;
  sample_dogs?: SampleDog[];
  sample_image_url?: string;
  unique_breeds?: number;
  qualifying_breeds?: Array<{
    primary_breed: string;
    breed_slug: string;
    count: number;
  }>;
}

/** A breed page's gallery dog: always with a photo and a page */
export interface GalleryDog {
  name: string;
  slug: string;
  primary_image_url: string;
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

export interface BreedDog {
  id: number | string;
  name: string;
  slug?: string;
  breed?: string;
  primary_image_url?: string;
  organization?: { name?: string };
  properties?: { description?: string };
}

export interface BreedGroupsSectionProps {
  breedGroups: BreedGroupDisplay[];
}

export interface PopularBreedsSectionProps {
  popularBreeds: BreedWithImages[];
  /** Shown as one tile among the breeds */
  mixedBreed?: BreedWithImages | null;
}

export interface BreedStructuredDataProps {
  breedData: BreedData;
  dogs?: BreedDog[];
  pageType?: "detail" | "hub";
}

export interface BreedPageData extends BreedData {
  topDogs?: GalleryDog[];
}

export interface BreedDetailProps {
  initialBreedData: BreedPageData;
  initialDogs: Dog[];
  /** Unfiltered counts for the breed: practical stats and per-country totals (#500) */
  breedCounts?: FilterCountsResponse | null;
  /** The catalog's filter options (rescues, countries) */
  metadata?: DogsPageMetadata;
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
  /** Every breed with a page, for the search at the top */
  searchableBreeds: BreedLink[];
}

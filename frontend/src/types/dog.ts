import type { DogProfilerData } from "./dogProfiler";

/**
 * Base Dog interface used across the application
 * This is the canonical Dog type that should be imported everywhere
 */
export interface Dog {
  // Core identifiers - supports both number and string IDs
  id: number | string;
  external_id?: string;
  slug?: string;

  // Basic info
  name: string;
  breed?: string;
  primary_breed?: string;
  standardized_breed?: string;

  // Age information
  age?: string;
  age_text?: string;
  age_months?: number;
  age_min_months?: number;
  age_max_months?: number;

  // Physical characteristics
  sex?: string;
  size?: string;
  standardized_size?: string;
  weight?: string;

  // Organization info
  organization_name?: string;
  organization?: {
    id?: number;
    name: string;
    country?: string;
    config_id?: string;
    slug?: string;
  };

  // Location and shipping
  location?: string;
  ships_to?: string[];

  // Images
  main_image?: string;
  primary_image_url?: string;
  photos?: string[];

  // Descriptions and summaries
  description?: string;
  summary?: string;
  llm_description?: string;

  // Adoption info
  adoption_url?: string;
  adoption_fee_euros?: number;

  // Status and display
  status?: string;
  blur_data_url?: string;
  breed_group?: string;

  // Personality and traits
  personality_traits?: string[];

  // LLM profiler data
  dog_profiler_data?: DogProfilerData;

  // Legacy/flexible properties
  properties?: {
    personality?: string;
    good_with?: string;
    good_with_dogs?: boolean | string;
    good_with_cats?: boolean | string;
    good_with_children?: boolean | string;
    good_with_list?: string[];
    description?: string;
    location?: string;
    weight?: string;
    house_trained?: boolean;
    special_needs?: boolean;
    [key: string]: unknown;
  };

  // Timestamps
  created_at?: string;

  // Note: Removed [key: string]: any for better type safety
  // All properties should be explicitly defined above
}

/**
 * Type alias for components that specifically need string IDs
 */
export interface DogWithStringId extends Omit<Dog, "id"> {
  id: string;
}

/**
 * Type alias for components that specifically need number IDs
 */
export interface DogWithNumberId extends Omit<Dog, "id"> {
  id: number;
}

/**
 * Re-export DogProfilerData for convenience
 */
export type { DogProfilerData } from "./dogProfiler";

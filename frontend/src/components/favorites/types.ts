import type { DogProfilerData } from "../../types/dogProfiler";

export interface Dog {
  id: number;
  name: string;
  breed?: string;
  standardized_breed?: string;
  age_months?: number;
  age_min_months?: number;
  age_max_months?: number;
  age_text?: string;
  sex?: string;
  size?: string;
  standardized_size?: string;
  organization_name?: string;
  organization?: {
    name: string;
    country: string;
  };
  location?: string;
  ships_to?: string[];
  description?: string;
  main_image?: string;
  primary_image_url?: string;
  adoption_url?: string;
  dog_profiler_data?: DogProfilerData;
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
    [key: string]: any;
  };
  [key: string]: any;
}

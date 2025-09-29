/**
 * API response types for dog data from backend
 * Backend returns camelCase, frontend uses snake_case
 */

export interface ApiDogProfilerData {
  name?: string;
  breed?: string;
  tagline?: string;
  description?: string;
  personalityTraits?: string[];
  favoriteActivities?: string[];
  uniqueQuirk?: string;
  energyLevel?: "low" | "medium" | "high" | "very_high";
  trainability?: "easy" | "moderate" | "challenging";
  experienceLevel?: "first_time_ok" | "some_experience" | "experienced_only";
  sociability?: "reserved" | "moderate" | "social" | "very_social";
  confidence?: "shy" | "moderate" | "confident";
  homeType?: "apartment_ok" | "house_preferred" | "house_required";
  exerciseNeeds?: "minimal" | "moderate" | "high";
  groomingNeeds?: "minimal" | "weekly" | "frequent";
  yardRequired?: boolean;
  goodWithDogs?: "yes" | "no" | "maybe" | "unknown";
  goodWithCats?: "yes" | "no" | "maybe" | "unknown";
  goodWithChildren?: "yes" | "no" | "maybe" | "unknown";
  medicalNeeds?: string;
  specialNeeds?: string;
  neutered?: boolean;
  vaccinated?: boolean;
  readyToTravel?: boolean;
  adoptionFeeEuros?: number;
  confidenceScores?: Record<string, number>;
  qualityScore?: number;
  modelUsed?: string;
  profiledAt?: string;
  profilerVersion?: string;
  promptVersion?: string;
  processingTimeMs?: number;
  sourceReferences?: Record<string, string>;
}

export interface ApiOrganization {
  id?: number;
  name: string;
  slug?: string;
  logo_url?: string;
  website_url?: string;
  country?: string;
  city?: string;
  ships_to?: string[];
}

export interface ApiDog {
  id: number | string;
  external_id?: string;
  slug?: string;
  name: string;
  breed?: string;
  primary_breed?: string;
  standardized_breed?: string;
  secondary_breed?: string;
  mixed_breed?: boolean;
  age?: string;
  age_text?: string;
  age_months?: number;
  age_min_months?: number;
  age_max_months?: number;
  sex?: string;
  size?: string;
  standardized_size?: string;
  weight?: string;
  coat?: string;
  color?: string;
  spayed_neutered?: boolean;
  house_trained?: boolean;
  special_needs?: boolean;
  shots_current?: boolean;
  good_with_children?: boolean;
  good_with_dogs?: boolean;
  good_with_cats?: boolean;
  description?: string;
  status?: string;
  adoption_url?: string;
  primary_image_url?: string;
  image?: string;
  main_image?: string;
  images?: string[];
  additional_images?: string[];
  videos?: string[];
  location?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  created_at?: string;
  updated_at?: string;
  organization?: ApiOrganization | string;
  dogProfilerData?: ApiDogProfilerData;
  dog_profiler_data?: ApiDogProfilerData;
  personality_traits?: string[];
  traits?: string[];
  quality_score?: number;
}

export interface ApiSwipeResponse {
  dogs: ApiDog[];
  hasMore: boolean;
  nextOffset?: number;
  total?: number;
}
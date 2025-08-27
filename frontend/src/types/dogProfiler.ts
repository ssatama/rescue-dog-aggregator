export interface DogProfilerData {
  name?: string;
  breed?: string;
  tagline?: string;
  description?: string;
  personality_traits?: string[];
  favorite_activities?: string[];
  unique_quirk?: string;
  energy_level?: "low" | "medium" | "high" | "very_high";
  trainability?: "easy" | "moderate" | "challenging";
  experience_level?: "first_time_ok" | "some_experience" | "experienced_only";
  sociability?: "reserved" | "moderate" | "social" | "very_social";
  confidence?: "shy" | "moderate" | "confident";
  home_type?: "apartment_ok" | "house_preferred" | "house_required";
  exercise_needs?: "minimal" | "moderate" | "high";
  grooming_needs?: "minimal" | "weekly" | "frequent";
  yard_required?: boolean;
  good_with_dogs?: "yes" | "no" | "maybe" | "unknown";
  good_with_cats?: "yes" | "no" | "maybe" | "unknown";
  good_with_children?: "yes" | "no" | "maybe" | "unknown";
  medical_needs?: string;
  special_needs?: string;
  neutered?: boolean;
  vaccinated?: boolean;
  ready_to_travel?: boolean;
  adoption_fee_euros?: number;
  confidence_scores?: Record<string, number>;
  quality_score?: number;
  model_used?: string;
  profiled_at?: string;
  profiler_version?: string;
  prompt_version?: string;
  processing_time_ms?: number;
  source_references?: Record<string, string>;
}

export interface DogWithProfiler {
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
  description?: string;
  main_image?: string;
  primary_image_url?: string;
  adoption_url?: string;
  dog_profiler_data?: DogProfilerData;
  properties?: Record<string, any>;
  [key: string]: any;
}

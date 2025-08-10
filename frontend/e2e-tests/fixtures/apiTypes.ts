// =============================================================================
// API RESPONSE TYPES - Direct from backend without modifications
// These types mirror the actual API responses from the backend
// =============================================================================

/**
 * Core dog data structure as returned by the backend API
 * Fields directly from the database/API response
 * Based on api/models/dog.py - Animal model
 */
export interface ApiDogResponse {
  id: number;
  slug: string;
  name: string;
  animal_type: string;
  breed?: string;
  standardized_breed?: string;
  breed_group?: string;
  age_text?: string;
  age_min_months?: number;
  age_max_months?: number;
  sex?: string;
  size?: string;
  standardized_size?: string;
  status: string;
  primary_image_url?: string;
  adoption_url: string;
  organization_id: number;
  external_id?: string;
  language: string;
  description?: string;
  properties: Record<string, any>;
  created_at: string;
  updated_at: string;
  last_scraped_at?: string;
  availability_confidence?: string;
  last_seen_at?: string;
  consecutive_scrapes_missing?: number;
}

/**
 * NOTE: Multi-image functionality removed in favor of single primary_image_url
 * The ApiImageResponse and ApiDogWithImagesResponse interfaces have been removed
 * as the backend no longer supports multiple images per animal.
 * All image data is now accessed via the primary_image_url field in ApiDogResponse.
 */

/**
 * Organization data structure as returned by the backend API
 * Based on api/models/organization.py - Organization model
 */
export interface ApiOrganizationResponse {
  id: number;
  name: string;
  slug: string;
  website_url?: string;
  description?: string;
  country?: string;
  city?: string;
  logo_url?: string;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
  social_media: Record<string, string>;
  ships_to: string[];
  established_year?: number;
  service_regions: string[];
  total_dogs?: number;
  new_this_week?: number;
}

/**
 * Statistics data structure as returned by the backend API
 */
export interface ApiStatisticsResponse {
  total_dogs: number;
  total_organizations: number;
  countries: string[];
  organizations: Array<{
    id: number;
    name: string;
    dog_count: number;
    city?: string;
    country?: string;
  }>;
}

/**
 * Filter option structure as returned by the backend API
 */
export interface ApiFilterOption {
  value: string;
  label: string;
  count: number;
}

/**
 * Filter counts structure as returned by the backend API
 */
export interface ApiFilterCountsResponse {
  size_options: ApiFilterOption[];
  age_options: ApiFilterOption[];
  sex_options: ApiFilterOption[];
  breed_options: ApiFilterOption[];
  organization_options: ApiFilterOption[];
  location_country_options: ApiFilterOption[];
  available_country_options: ApiFilterOption[];
  available_region_options: ApiFilterOption[];
}

/**
 * API query filters interface matching backend parameter names
 */
export interface ApiQueryFilters {
  standardized_breed?: string;
  breed_group?: string;
  standardized_size?: string;
  age_category?: string;
  sex?: string;
  location_country?: string;
  available_to_country?: string;
  available_to_region?: string;
  organization_id?: string;
  search?: string;
  curation_type?: string;
  animal_type?: string;
  status?: string;
  limit?: string;
  offset?: string;
}

/**
 * API response wrapper for paginated endpoints
 */
export interface ApiPaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

/**
 * API error response structure
 */
export interface ApiErrorResponse {
  error: string;
  message: string;
  status_code: number;
  details?: Record<string, any>;
}

// =============================================================================
// RAW MOCK DATA - Using only API fields
// =============================================================================

/**
 * Raw API dog responses (no computed fields)
 */
export const rawApiDogs: ApiDogResponse[] = [
  {
    id: 1,
    slug: "max-golden-retriever",
    name: "Max",
    animal_type: "dog",
    breed: "Golden Retriever",
    standardized_breed: "Golden Retriever",
    breed_group: "Sporting",
    age_text: "3 years old",
    age_min_months: 36,
    age_max_months: 36,
    sex: "Male",
    size: "Large",
    standardized_size: "Large",
    primary_image_url: "https://example.com/images/max.jpg",
    status: "available",
    adoption_url: "https://happytails.org/adopt/max",
    organization_id: 1,
    external_id: "HT-2024-001",
    language: "en",
    description: "Max is a friendly and energetic Golden Retriever who loves to play fetch and swim.",
    properties: {},
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-01-15T10:30:00Z",
    availability_confidence: "high",
    consecutive_scrapes_missing: 0,
  },
  {
    id: 2,
    slug: "luna-german-shepherd",
    name: "Luna",
    animal_type: "dog",
    breed: "German Shepherd Dog",
    standardized_breed: "German Shepherd",
    breed_group: "Herding",
    age_text: "2 years old",
    age_min_months: 24,
    age_max_months: 24,
    sex: "Female",
    size: "Large",
    standardized_size: "Large",
    primary_image_url: "https://example.com/images/luna.jpg",
    status: "available",
    adoption_url: "https://gsrescue.org/adopt/luna",
    organization_id: 2,
    language: "en",
    description: "Luna is a smart and loyal German Shepherd looking for an active family.",
    properties: {},
    created_at: "2024-01-10T14:20:00Z",
    updated_at: "2024-01-10T14:20:00Z",
    availability_confidence: "high",
    consecutive_scrapes_missing: 0,
  },
  {
    id: 3,
    slug: "charlie-labrador",
    name: "Charlie",
    animal_type: "dog",
    breed: "Labrador Retriever",
    standardized_breed: "Labrador Retriever",
    breed_group: "Sporting",
    age_text: "5 years old",
    age_min_months: 60,
    age_max_months: 60,
    sex: "Male",
    size: "Large",
    standardized_size: "Large",
    primary_image_url: "https://example.com/images/charlie.jpg",
    status: "available",
    adoption_url: "https://happytails.org/adopt/charlie",
    organization_id: 1,
    language: "en",
    description: "Charlie is a gentle Labrador who gets along great with children and other pets.",
    properties: {},
    created_at: "2024-01-08T09:15:00Z",
    updated_at: "2024-01-08T09:15:00Z",
    availability_confidence: "high",
    consecutive_scrapes_missing: 0,
  },
  {
    id: 4,
    slug: "bella-border-collie",
    name: "Bella",
    animal_type: "dog",
    breed: "Border Collie",
    standardized_breed: "Border Collie",
    breed_group: "Herding",
    age_text: "1 year old",
    age_min_months: 12,
    age_max_months: 12,
    sex: "Female",
    size: "Medium",
    standardized_size: "Medium",
    primary_image_url: "https://example.com/images/bella.jpg",
    status: "available",
    adoption_url: "https://nordic-dogs.fi/adopt/bella",
    organization_id: 3,
    language: "en",
    description: "Bella is an intelligent Border Collie who loves mental stimulation and agility training.",
    properties: {},
    created_at: "2024-01-12T16:45:00Z",
    updated_at: "2024-01-12T16:45:00Z",
    availability_confidence: "high",
    consecutive_scrapes_missing: 0,
  },
];

/**
 * Raw API organization responses
 */
export const rawApiOrganizations: ApiOrganizationResponse[] = [
  {
    id: 1,
    name: "Happy Tails Rescue",
    slug: "happy-tails-rescue",
    website_url: "https://happytails.org",
    description: "A loving rescue organization dedicated to finding homes for dogs in need.",
    city: "San Francisco",
    country: "United States",
    logo_url: "https://example.com/logos/happy-tails.png",
    social_media: {
      facebook: "happytailsrescue",
      instagram: "@happytails",
    },
    active: true,
    ships_to: ["United States", "Canada"],
    established_year: 2015,
    service_regions: ["California", "Nevada", "Oregon"],
    total_dogs: 25,
    new_this_week: 3,
    created_at: "2023-01-01T00:00:00Z",
    updated_at: "2024-01-15T10:30:00Z",
  },
  {
    id: 2,
    name: "German Shepherd Rescue",
    slug: "german-shepherd-rescue",
    website_url: "https://gsrescue.org",
    description: "Specialized rescue for German Shepherds and similar breeds.",
    city: "Berlin",
    country: "Germany",
    logo_url: "https://example.com/logos/gs-rescue.png",
    social_media: {},
    active: true,
    ships_to: ["Germany", "Austria", "Switzerland"],
    established_year: 2010,
    service_regions: ["Berlin", "Brandenburg", "Saxony"],
    total_dogs: 18,
    new_this_week: 2,
    created_at: "2023-01-01T00:00:00Z",
    updated_at: "2024-01-15T10:30:00Z",
  },
  {
    id: 3,
    name: "Nordic Dogs Finland",
    slug: "nordic-dogs-finland",
    website_url: "https://nordic-dogs.fi",
    description: "Rescuing and rehoming Nordic breeds across Finland.",
    city: "Helsinki",
    country: "Finland",
    logo_url: "https://example.com/logos/nordic-dogs.png",
    social_media: {},
    active: true,
    ships_to: ["Finland", "Sweden", "Norway"],
    established_year: 2018,
    service_regions: ["Uusimaa", "Pirkanmaa", "Varsinais-Suomi"],
    total_dogs: 12,
    new_this_week: 1,
    created_at: "2023-01-01T00:00:00Z",
    updated_at: "2024-01-15T10:30:00Z",
  },
];

/**
 * Raw API statistics response
 */
export const rawApiStatistics: ApiStatisticsResponse = {
  total_dogs: 247,
  total_organizations: 7,
  countries: ["United States", "Germany", "Finland"],
  organizations: [
    {
      id: 1,
      name: "Happy Tails Rescue",
      dog_count: 25,
      city: "San Francisco",
      country: "United States",
    },
    {
      id: 2,
      name: "German Shepherd Rescue", 
      dog_count: 18,
      city: "Berlin",
      country: "Germany",
    },
    {
      id: 3,
      name: "Nordic Dogs Finland",
      dog_count: 12,
      city: "Helsinki", 
      country: "Finland",
    },
  ],
};

/**
 * Raw API filter counts response
 */
export const rawApiFilterCounts: ApiFilterCountsResponse = {
  size_options: [
    { value: "Small", label: "Small", count: 25 },
    { value: "Medium", label: "Medium", count: 45 },
    { value: "Large", label: "Large", count: 60 },
    { value: "XLarge", label: "Extra Large", count: 15 },
  ],
  age_options: [
    { value: "Puppy", label: "Puppy", count: 35 },
    { value: "Young", label: "Young", count: 40 },
    { value: "Adult", label: "Adult", count: 55 },
    { value: "Senior", label: "Senior", count: 15 },
  ],
  sex_options: [
    { value: "Male", label: "Male", count: 72 },
    { value: "Female", label: "Female", count: 73 },
  ],
  breed_options: [
    { value: "Golden Retriever", label: "Golden Retriever", count: 15 },
    { value: "German Shepherd", label: "German Shepherd", count: 12 },
    { value: "Labrador Retriever", label: "Labrador Retriever", count: 18 },
    { value: "Border Collie", label: "Border Collie", count: 8 },
    { value: "French Bulldog", label: "French Bulldog", count: 6 },
  ],
  organization_options: [
    { value: "1", label: "Happy Tails Rescue", count: 25 },
    { value: "2", label: "German Shepherd Rescue", count: 18 },
    { value: "3", label: "Nordic Dogs Finland", count: 12 },
  ],
  location_country_options: [
    { value: "United States", label: "United States", count: 85 },
    { value: "Germany", label: "Germany", count: 45 },
    { value: "Finland", label: "Finland", count: 15 },
  ],
  available_country_options: [
    { value: "United States", label: "United States", count: 85 },
    { value: "Germany", label: "Germany", count: 45 },
    { value: "Finland", label: "Finland", count: 15 },
  ],
  available_region_options: [
    { value: "California", label: "California", count: 35 },
    { value: "Texas", label: "Texas", count: 25 },
    { value: "New York", label: "New York", count: 15 },
    { value: "Bavaria", label: "Bavaria", count: 20 },
  ],
};
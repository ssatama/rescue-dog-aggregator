import type { 
  ApiDogResponse, 
  ApiOrganizationResponse, 
  ApiStatisticsResponse, 
  ApiFilterCountsResponse, 
  ApiFilterOption,
  ApiImageResponse
} from './apiTypes';

// =============================================================================
// ENHANCED TEST TYPES - Composition of API types + computed/test conveniences
// These types extend API responses with computed fields and test utilities
// =============================================================================

/**
 * Enhanced dog type for E2E testing with computed/derived fields
 * Composes API response with test-specific conveniences
 * 
 * IMPORTANT: Fields like age_category are COMPUTED by frontend, not API fields
 */
export interface Dog extends ApiDogResponse {
  // COMPUTED/DERIVED fields - NOT from backend API
  age_category?: string;  // Computed from age_min_months/age_max_months
  
  // Test convenience: nested organization details (from API join)
  organization?: Organization;
  
  // Test convenience: images array (from API join)
  images?: ApiImageResponse[];
}

/**
 * Enhanced organization type for E2E testing
 * Aliases API response for clarity (no additional computed fields needed)
 */
export interface Organization extends ApiOrganizationResponse {
  // Note: total_dogs and new_this_week are now API fields, not computed
}

/**
 * Enhanced statistics type for E2E testing (no additional fields needed)
 */
export interface Statistics extends ApiStatisticsResponse {}

/**
 * Enhanced filter types for E2E testing (aliases for clarity)
 */
export interface FilterOption extends ApiFilterOption {}
export interface FilterCounts extends ApiFilterCountsResponse {}

// =============================================================================
// TEST SCENARIO INTERFACES
// =============================================================================

/**
 * Test scenario for search functionality
 */
export interface SearchScenario {
  name: string;
  query: string;
  expectedResults: Dog[];
  expectedCount: number;
  description: string;
}

/**
 * Test scenario for filter functionality
 */
export interface FilterScenario {
  name: string;
  filters: Record<string, string>;
  expectedResults: Dog[];
  expectedCount: number;
  description: string;
}

/**
 * Test scenario for error cases
 */
export interface ErrorScenario {
  name: string;
  trigger: string;
  expectedError: string;
  description: string;
}

/**
 * Test scenario for performance testing
 */
export interface PerformanceScenario {
  name: string;
  operation: string;
  expectedLoadTime: number;
  description: string;
}

/**
 * Test scenario for responsive design
 */
export interface ResponsiveScenario {
  name: string;
  viewport: { width: number; height: number };
  expectedBehavior: string;
  description: string;
}

/**
 * Test scenario for accessibility
 */
export interface AccessibilityScenario {
  name: string;
  interaction: string;
  expectedAccessibility: string;
  description: string;
}

/**
 * User journey step
 */
export interface UserJourneyStep {
  action: string;
  element: string;
  expectedResult: string;
}

/**
 * Test scenario for user journeys
 */
export interface UserJourneyScenario {
  name: string;
  steps: UserJourneyStep[];
  description: string;
}

// =============================================================================
// TEST DATA CONFIGURATION
// =============================================================================

/**
 * Configuration for generating test data
 */
export interface TestDataConfig {
  dogCount: number;
  organizationCount: number;
  includeRecentDogs: boolean;
  includeSeniorDogs: boolean;
  includeSpecialNeeds: boolean;
  distributionType: 'even' | 'realistic' | 'skewed';
}

/**
 * Test data generation result
 */
export interface TestDataSet {
  dogs: Dog[];
  organizations: Organization[];
  statistics: Statistics;
  filterCounts: FilterCounts;
}

// =============================================================================
// VALIDATION INTERFACES
// =============================================================================

/**
 * Dog card validation result
 */
export interface DogCardValidation {
  dogId: number;
  hasImage: boolean;
  hasName: boolean;
  hasBreed: boolean;
  hasOrganization: boolean;
  hasAdoptionUrl: boolean;
  isValid: boolean;
  errors: string[];
}

/**
 * Filter validation result
 */
export interface FilterValidation {
  filterType: string;
  isVisible: boolean;
  hasOptions: boolean;
  optionCount: number;
  isWorking: boolean;
  errors: string[];
}

/**
 * Page validation result
 */
export interface PageValidation {
  pageType: string;
  isLoaded: boolean;
  hasRequiredElements: boolean;
  isResponsive: boolean;
  hasAccessibilityFeatures: boolean;
  errors: string[];
  warnings: string[];
}

// =============================================================================
// MOCK DATA CONSTANTS
// =============================================================================

export const mockBreeds = [
  "Golden Retriever",
  "German Shepherd",
  "Labrador Retriever",
  "Border Collie",
  "French Bulldog",
  "Beagle",
  "Poodle",
  "Rottweiler",
  "Yorkshire Terrier",
  "Siberian Husky",
];

export const mockBreedGroups = [
  "Sporting",
  "Herding",
  "Working",
  "Terrier",
  "Toy",
  "Non-Sporting",
  "Hound",
];

export const mockLocationCountries = ["United States", "Germany", "Finland"];

export const mockAvailableCountries = ["United States", "Germany", "Finland"];

export const mockAvailableRegions = {
  "United States": ["California", "Texas", "New York", "Florida"],
  "Germany": ["Bavaria", "North Rhine-Westphalia", "Baden-Württemberg"],
  "Finland": ["Uusimaa", "Pirkanmaa", "Varsinais-Suomi"],
};

export type MockAvailableRegions = typeof mockAvailableRegions;
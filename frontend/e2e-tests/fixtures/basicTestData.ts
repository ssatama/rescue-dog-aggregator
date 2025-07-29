import { EnhancedDog, Organization, Statistics, FilterCounts } from './testData';

export const basicOrganization: Organization = {
  id: 1,
  name: "Happy Tails Rescue",
  slug: "happy-tails-rescue",
  website_url: "https://happytails.org",
  city: "San Francisco",
  country: "United States",
  logo_url: "https://example.com/logos/happy-tails.png",
  social_media: {},
  active: true,
  ships_to: ["United States", "Canada"],
  service_regions: ["California"],
};

export const basicDog: EnhancedDog = {
  id: 1,
  slug: "buddy-the-golden-retriever",
  name: "Buddy",
  animal_type: "dog",
  standardized_breed: "Golden Retriever",
  age_text: "2 years",
  sex: "Male",
  standardized_size: "Large",
  status: "available",
  primary_image_url: "https://example.com/buddy.jpg",
  adoption_url: "https://example.com/adopt/buddy",
  organization_id: 1,
  organization: basicOrganization,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  language: "en",
  properties: {},
};

export const basicDogs: EnhancedDog[] = [basicDog];
export const basicOrganizations: Organization[] = [basicOrganization];

export const basicStatistics: Statistics = {
  total_dogs: 1,
  total_organizations: 1,
  countries: ["United States"],
  organizations: [{ id: 1, name: "Happy Tails Rescue", dog_count: 1, city: "San Francisco", country: "United States" }],
};

export const basicFilterCounts: FilterCounts = {
  size_options: [{ value: "Large", label: "Large", count: 1 }],
  age_options: [],
  sex_options: [{ value: "Male", label: "Male", count: 1 }],
  breed_options: [{ value: "Golden Retriever", label: "Golden Retriever", count: 1 }],
  organization_options: [{ value: "1", label: "Happy Tails Rescue", count: 1 }],
  location_country_options: [{ value: "United States", label: "United States", count: 1 }],
  available_country_options: [{ value: "United States", label: "United States", count: 1 }],
  available_region_options: [],
};

export const emptyTestData = {
  dogs: [],
  organizations: [],
  statistics: { total_dogs: 0, total_organizations: 0, countries: [], organizations: [] },
  filterCounts: { size_options: [], age_options: [], sex_options: [], breed_options: [], organization_options: [], location_country_options: [], available_country_options: [], available_region_options: [] },
};

export const singleDogTestData = {
  dogs: [basicDog],
  organizations: [basicOrganization],
  statistics: basicStatistics,
  filterCounts: basicFilterCounts,
};

export const multiDogTestData = {
  // For when you need more than one dog
};

export const createDogVariation = (overrides: Partial<EnhancedDog>): EnhancedDog => ({ ...basicDog, ...overrides });
export const createOrganizationVariation = (overrides: Partial<Organization>): Organization => ({ ...basicOrganization, ...overrides });
export const createBreedTestSet = (): EnhancedDog[] => [ /* ... dogs of different breeds ... */ ];
export const createSizeTestSet = (): EnhancedDog[] => [ /* ... dogs of different sizes ... */ ];
export const createAgeTestSet = (): EnhancedDog[] => [ /* ... dogs of different ages ... */ ];

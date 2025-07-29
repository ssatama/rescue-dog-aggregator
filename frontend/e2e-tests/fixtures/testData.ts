// =============================================================================
// API RESPONSE TYPES - Direct from backend without modifications
// =============================================================================

export interface ApiDogResponse {
  id: number;
  slug: string;
  name: string;
  animal_type: string;
  breed?: string;
  standardized_breed?: string;
  age_text?: string;
  sex?: string;
  standardized_size?: string;
  status: string;
  primary_image_url?: string;
  adoption_url: string;
  organization_id: number;
  created_at: string;
  updated_at: string;
  properties: {
    description?: string;
    raw_description?: string;
  };
}

export interface ApiOrganizationResponse {
  id: number;
  name: string;
  slug: string;
  website_url?: string;
  country?: string;
  city?: string;
  logo_url?: string;
  social_media: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
  ships_to: string[];
}

// =============================================================================
// ENHANCED FRONTEND TYPES - For use in tests after data transformation
// =============================================================================

export interface Organization extends ApiOrganizationResponse {}

export interface EnhancedDog extends ApiDogResponse {
  age_category?: 'Puppy' | 'Young' | 'Adult' | 'Senior';
  organization?: Organization;
  imageError?: boolean;
}

// Other interfaces (Statistics, FilterCounts, etc.) remain the same
export interface Statistics {
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
export interface FilterOption {
  value: string;
  label: string;
  count: number;
}
export interface FilterCounts {
  size_options: FilterOption[];
  age_options: FilterOption[];
  sex_options: FilterOption[];
  breed_options: FilterOption[];
  organization_options: FilterOption[];
  location_country_options: FilterOption[];
  available_country_options: FilterOption[];
  available_region_options: FilterOption[];
}


// =============================================================================
// MOCK DATA - Using ENHANCED types for test convenience
// =============================================================================

export const mockOrganizations: Organization[] = [
  {
    id: 1,
    name: "Happy Tails Rescue",
    slug: "happy-tails-rescue",
    website_url: "https://happytails.org",
    city: "San Francisco",
    country: "United States",
    logo_url: "https://example.com/logos/happy-tails.png",
    social_media: {
      facebook: "https://facebook.com/happytails",
      instagram: "https://instagram.com/happytails",
    },
    ships_to: ["United States", "Canada"],
  },
];

export const mockDogs: EnhancedDog[] = [
  {
    id: 1,
    slug: "camille-golden-retriever-1387",
    name: "Camille",
    animal_type: "dog",
    standardized_breed: "Golden Retriever",
    age_text: "3 years old",
    sex: "Male",
    standardized_size: "Large",
    primary_image_url: "https://picsum.photos/400/300?random=1",
    status: "available",
    adoption_url: "https://happytails.org/adopt/camille",
    organization_id: 1,
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-01-15T10:30:00Z",
    properties: {
      description: "Camille is a friendly and energetic Golden Retriever.",
      raw_description: "<p>Camille is a <strong>friendly</strong> and energetic Golden Retriever.</p>",
    },
    age_category: "Adult",
    organization: mockOrganizations[0],
  },
  {
    id: 2,
    slug: "bella-labrador-mix",
    name: "Bella",
    animal_type: "dog",
    standardized_breed: "Labrador Mix",
    age_text: "2 years old",
    sex: "Female",
    standardized_size: "Medium",
    primary_image_url: "https://picsum.photos/400/300?random=2",
    status: "available",
    adoption_url: "https://happytails.org/adopt/bella",
    organization_id: 1,
    created_at: "2024-01-10T08:00:00Z",
    updated_at: "2024-01-18T12:45:00Z",
    properties: {
      description: "Bella is a sweet and gentle Labrador mix who loves to play fetch.",
      raw_description: "<p>Bella is a <strong>sweet</strong> and gentle Labrador mix.</p>",
    },
    age_category: "Young",
    organization: mockOrganizations[0],
  },
  {
    id: 3,
    slug: "luna-border-collie",
    name: "Luna",
    animal_type: "dog",
    standardized_breed: "Border Collie",
    age_text: "4 years old",
    sex: "Female",
    standardized_size: "Medium",
    primary_image_url: "https://picsum.photos/400/300?random=3",
    status: "available",
    adoption_url: "https://happytails.org/adopt/luna",
    organization_id: 1,
    created_at: "2024-01-05T14:00:00Z",
    updated_at: "2024-01-22T09:15:00Z",
    properties: {
      description: "Luna is a highly intelligent Border Collie who excels at agility.",
      raw_description: "<p>Luna is a <strong>highly intelligent</strong> Border Collie.</p>",
    },
    age_category: "Adult",
    organization: mockOrganizations[0],
  },
  {
    id: 4,
    slug: "charlie-french-bulldog",
    name: "Charlie",
    animal_type: "dog",
    standardized_breed: "French Bulldog",
    age_text: "1 year old",
    sex: "Male",
    standardized_size: "Small",
    primary_image_url: "https://picsum.photos/400/300?random=4",
    status: "available",
    adoption_url: "https://happytails.org/adopt/charlie",
    organization_id: 1,
    created_at: "2024-01-12T11:00:00Z",
    updated_at: "2024-01-19T16:20:00Z",
    properties: {
      description: "Charlie is a young French Bulldog with a playful personality.",
      raw_description: "<p>Charlie is a <strong>young</strong> French Bulldog.</p>",
    },
    age_category: "Young",
    organization: mockOrganizations[0],
  },
  {
    id: 5,
    slug: "rocky-german-shepherd",
    name: "Rocky",
    animal_type: "dog",
    standardized_breed: "German Shepherd",
    age_text: "5 years old",
    sex: "Male",
    standardized_size: "Large",
    primary_image_url: "https://picsum.photos/400/300?random=5",
    status: "available",
    adoption_url: "https://happytails.org/adopt/rocky",
    organization_id: 1,
    created_at: "2024-01-08T13:00:00Z",
    updated_at: "2024-01-21T10:30:00Z",
    properties: {
      description: "Rocky is a loyal and protective German Shepherd.",
      raw_description: "<p>Rocky is a <strong>loyal</strong> and protective German Shepherd.</p>",
    },
    age_category: "Adult",
    organization: mockOrganizations[0],
  },
  // Edge case dogs for error testing
  {
    id: 999,
    slug: "broken-image-dog",
    name: "BrokenImageDog",
    animal_type: "dog",
    standardized_breed: "Test Breed",
    age_text: "2 years old",
    sex: "Male",
    standardized_size: "Medium",
    primary_image_url: "https://picsum.photos/400/300?random=999",
    status: "available",
    adoption_url: "https://happytails.org/adopt/broken",
    organization_id: 1,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    properties: {
      description: "This dog is used for testing broken image scenarios.",
      raw_description: "<p>This dog is used for testing <strong>broken image</strong> scenarios.</p>",
    },
    age_category: "Young",
    organization: mockOrganizations[0],
    imageError: true,
  },
  {
    id: 1000,
    slug: "extremely-long-name-dog",
    name: "Extremely Long Name Dog For Testing UI Boundaries And Responsive Design",
    animal_type: "dog",
    standardized_breed: "Mixed Breed With Very Long Name That Tests UI Boundaries",
    age_text: "10+ years old",
    sex: "Female",
    standardized_size: "Extra Large",
    primary_image_url: "https://picsum.photos/400/300?random=6",
    status: "pending",
    adoption_url: "https://happytails.org/adopt/long-name",
    organization_id: 1,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    properties: {
      description: "This dog has an extremely long name and description to test how the UI handles long text content. This description goes on and on to test text overflow, wrapping, and responsive design elements.",
      raw_description: "<p>This dog has an <strong>extremely long name</strong> and description to test UI handling.</p>",
    },
    age_category: "Senior",
    organization: mockOrganizations[0],
  },
];

export const mockBreeds: string[] = ["Golden Retriever", "German Shepherd", "Labrador Retriever"];
export const mockBreedGroups: string[] = ["Sporting", "Herding", "Working"];
export const mockLocationCountries: string[] = ["United States", "Germany", "Finland"];
export const mockAvailableCountries: string[] = ["United States", "Germany", "Finland"];
export const mockAvailableRegions = {
  "United States": ["California", "Texas", "New York"],
  "Germany": ["Bavaria", "Berlin"],
};
export type MockAvailableRegions = typeof mockAvailableRegions;

// Helper functions to generate data variations
export const createDog = (overrides: Partial<EnhancedDog>): EnhancedDog => ({
  ...mockDogs[0],
  id: Math.floor(Math.random() * 1000),
  slug: `dog-${Math.random()}`,
  ...overrides,
});

export const createOrganization = (overrides: Partial<Organization>): Organization => ({
  ...mockOrganizations[0],
  id: Math.floor(Math.random() * 1000),
  slug: `org-${Math.random()}`,
  ...overrides,
});

export const getRandomDogs = (count: number = 3): EnhancedDog[] => {
    const shuffled = [...mockDogs].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
};

export const getDogBySlug = (slug: string): EnhancedDog | undefined => {
    return mockDogs.find(dog => dog.slug === slug);
};

export const getDogsWithFilters = (filters: Record<string, any>): EnhancedDog[] => {
    return mockDogs.filter(dog => {
        // Handle search parameter separately
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            const searchableFields = [
                dog.name,
                dog.breed,
                dog.standardized_breed,
                dog.description,
                dog.organization?.name
            ];
            
            const matchesSearch = searchableFields.some(field => 
                field && field.toLowerCase().includes(searchTerm)
            );
            
            if (!matchesSearch) {
                return false;
            }
        }
        
        // Handle other filters
        for (const key in filters) {
            if (key === 'search') continue; // Already handled above
            
            if (filters[key] && dog[key as keyof EnhancedDog] !== filters[key]) {
                return false;
            }
        }
        return true;
    });
};

// Comprehensive filter counts based on mock data
export const mockFilterCounts: FilterCounts = {
  size_options: [
    { value: "Small", label: "Small", count: 1 },
    { value: "Medium", label: "Medium", count: 3 },
    { value: "Large", label: "Large", count: 2 },
    { value: "Extra Large", label: "Extra Large", count: 1 }
  ],
  age_options: [
    { value: "Young", label: "Young (0-2 years)", count: 3 },
    { value: "Adult", label: "Adult (3-7 years)", count: 3 },
    { value: "Senior", label: "Senior (8+ years)", count: 1 }
  ],
  sex_options: [
    { value: "Male", label: "Male", count: 4 },
    { value: "Female", label: "Female", count: 3 }
  ],
  breed_options: [
    { value: "Golden Retriever", label: "Golden Retriever", count: 1 },
    { value: "Labrador Mix", label: "Labrador Mix", count: 1 },
    { value: "Border Collie", label: "Border Collie", count: 1 },
    { value: "French Bulldog", label: "French Bulldog", count: 1 },
    { value: "German Shepherd", label: "German Shepherd", count: 1 },
    { value: "Test Breed", label: "Test Breed", count: 1 },
    { value: "Mixed Breed With Very Long Name That Tests UI Boundaries", label: "Mixed Breed With Very Long Name That Tests UI Boundaries", count: 1 }
  ],
  organization_options: [
    { value: "Happy Tails Rescue", label: "Happy Tails Rescue", count: 7 }
  ],
  location_country_options: [
    { value: "United States", label: "United States", count: 7 }
  ],
  available_country_options: [
    { value: "United States", label: "United States", count: 7 },
    { value: "Canada", label: "Canada", count: 7 }
  ],
  available_region_options: [
    { value: "California", label: "California", count: 2 },
    { value: "Texas", label: "Texas", count: 1 },
    { value: "New York", label: "New York", count: 1 }
  ]
};

// Mock statistics
export const mockStatistics: Statistics = {
  total_dogs: mockDogs.length,
  total_organizations: mockOrganizations.length,
  countries: ["United States", "Canada", "Germany", "Finland"],
  organizations: mockOrganizations.map(org => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
    dog_count: mockDogs.filter(dog => dog.organization_id === org.id).length,
    city: org.city,
    country: org.country
  }))
};

// Search result helpers
export const searchResults = {
  'golden': mockDogs.filter(dog => 
    dog.standardized_breed?.toLowerCase().includes('golden') || 
    dog.name.toLowerCase().includes('golden')
  ),
  'labrador': mockDogs.filter(dog => 
    dog.standardized_breed?.toLowerCase().includes('labrador') || 
    dog.name.toLowerCase().includes('labrador')
  ),
  'small': mockDogs.filter(dog => dog.standardized_size === 'Small'),
  'puppy': mockDogs.filter(dog => dog.age_category === 'Young'),
  'nonexistent': []
};

// Edge case helpers
export const edgeCaseDogs = {
  brokenImage: mockDogs.find(dog => dog.id === 999)!,
  longName: mockDogs.find(dog => dog.id === 1000)!,
  pendingStatus: mockDogs.filter(dog => dog.status === 'pending'),
  availableOnly: mockDogs.filter(dog => dog.status === 'available')
};

// Main testData export for backward compatibility
export const testData = {
  dogs: mockDogs,
  organizations: mockOrganizations,
  breeds: mockBreeds,
  statistics: mockStatistics,
  filterCounts: mockFilterCounts
};


import { Page, Route } from 'playwright/test';
import { 
  mockDogs, 
  mockOrganizations, 
  mockStatistics, 
  mockFilterCounts, 
  searchResults,
  EnhancedDog,
  Statistics,
  FilterCounts
} from './testData';

export interface MockAPIOptions {
  enableDelays?: boolean;
  defaultDelay?: number;
  errorScenarios?: {
    dogs?: boolean;
    statistics?: boolean;
    filters?: boolean;
    search?: boolean;
    organizations?: boolean;
  };
  customResponses?: {
    dogs?: EnhancedDog[];
    statistics?: Statistics;
    filters?: FilterCounts;
  };
}

export class MockAPI {
  private page: Page;
  private options: MockAPIOptions;
  private setupComplete = false;

  constructor(page: Page, options: MockAPIOptions = {}) {
    this.page = page;
    this.options = {
      enableDelays: false,
      defaultDelay: 100,
      errorScenarios: {},
      ...options
    };
  }

  async setup(): Promise<void> {
    if (this.setupComplete) return;

    // Mock organization endpoints FIRST (before animals wildcard)
    await this.setupOrganizationEndpoints();
    
    // Mock dogs API endpoints
    await this.setupDogsEndpoints();
    await this.setupIndividualDogEndpoints();
    
    // Mock statistics API endpoints
    await this.setupStatisticsEndpoints();
    
    // Mock filter endpoints
    await this.setupFilterEndpoints();
    
    // Mock search endpoints
    await this.setupSearchEndpoints();
    this.setupComplete = true;
  }

  private async setupDogsEndpoints(): Promise<void> {
    // Main dogs endpoint with pagination - multiple patterns
    await this.page.route('**/api/v1/dogs**', async (route) => {
      await this.handleDogsRequest(route);
    });
    
    await this.page.route('**/api/dogs**', async (route) => {
      await this.handleDogsRequest(route);
    });
    
    await this.page.route('**/api/animals?**', async (route) => {
      await this.handleDogsRequest(route);
    });
    
    await this.page.route('**/api/animals', async (route) => {
      await this.handleDogsRequest(route);
    });
    
    // Helper method for handling dogs requests
  }
  
  private async handleDogsRequest(route: Route): Promise<void> {
    const url = new URL(route.request().url());
    const params = url.searchParams;
    // console.log(`MockAPI: intercepted dogs request: ${url.toString()}`);
    
    if (this.options.errorScenarios?.dogs) {
      await this.handleError(route, 500, 'Dogs service temporarily unavailable');
      return;
    }

    const page = parseInt(params.get('page') || '1');
    const limit = parseInt(params.get('limit') || '12');
    const offset = (page - 1) * limit;
    
    let filteredDogs = this.options.customResponses?.dogs || mockDogs;
    
    // Apply filters
    const breed = params.get('breed') || params.get('standardized_breed');
    const size = params.get('size') || params.get('standardized_size');
    const age = params.get('age') || params.get('age_category');
    const sex = params.get('sex');
    // const location = params.get('location'); // Currently unused
    const organization = params.get('organization');
    const organizationId = params.get('organization_id');
    const search = params.get('search');
    const curationType = params.get('curation_type');
    
    if (breed) {
      filteredDogs = filteredDogs.filter(dog => dog.standardized_breed === breed);
    }
    if (size) {
      filteredDogs = filteredDogs.filter(dog => dog.standardized_size === size);
    }
    if (age) {
      filteredDogs = filteredDogs.filter(dog => dog.age_category === age);
    }
    if (sex) {
      filteredDogs = filteredDogs.filter(dog => dog.sex === sex);
    }
    if (organization) {
      filteredDogs = filteredDogs.filter(dog => dog.organization?.name === organization);
    }
    if (organizationId) {
      // console.log(`MockAPI: filtering by organization_id=${organizationId}`);
      filteredDogs = filteredDogs.filter(dog => dog.organization_id === parseInt(organizationId));
      // console.log(`MockAPI: found ${filteredDogs.length} dogs for organization_id=${organizationId}`);
    }
    if (search) {
      const searchLower = search.toLowerCase();
      filteredDogs = filteredDogs.filter(dog => 
        dog.name.toLowerCase().includes(searchLower) ||
        dog.standardized_breed?.toLowerCase().includes(searchLower) ||
        dog.properties.description?.toLowerCase().includes(searchLower)
      );
    }
    
    // Backend-specific parameters that should be ignored in E2E tests
    // These would normally be handled by backend curation logic
    const backendOnlyParams = ['curation_type', 'limit', 'offset'];
    
    // Handle curation types for home page - just ignore them in mock
    // The actual curation logic would be handled by the backend
    // No filtering needed here since we want dogs to appear regardless of curation_type
    
    const paginatedDogs = filteredDogs.slice(offset, offset + limit);
    const hasMore = offset + limit < filteredDogs.length;
    
    await this.delayIfEnabled();
    
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(paginatedDogs)
    });
  }

  private async setupIndividualDogEndpoints(): Promise<void> {
    // Individual dog endpoint
    await this.page.route('**/api/v1/dogs/*', async (route) => {
      const url = route.request().url();
      const slug = url.split('/').pop();
      
      const dog = mockDogs.find(d => d.slug === slug);
      
      if (!dog) {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Dog not found' })
        });
        return;
      }
      
      await this.delayIfEnabled();
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ dog })
      });
    });

    // Individual animal endpoint (alternative URL pattern) - IMPORTANT: Keep more specific than organizations
    await this.page.route('**/api/animals/**', async (route) => {
      const url = route.request().url();
      const slug = url.split('/').pop()?.split('?')[0]; // Remove query params if any
      
      // Don't intercept organization calls that might match this pattern
      if (url.includes('/api/organizations/')) {
        route.continue();
        return;
      }
      
      // console.log('MockAPI: intercepted /api/animals/ request for slug:', slug);
      // console.log('MockAPI: available dogs:', mockDogs.map(d => d.slug));
      
      // Handle special data endpoints that aren't dogs
      if (slug === 'breeds') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(['Golden Retriever', 'Labrador Mix', 'Border Collie'])
        });
        return;
      }
      
      if (slug === 'location_countries') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(['United States', 'Canada', 'Germany'])
        });
        return;
      }
      
      if (slug === 'available_countries') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(['United States', 'Canada', 'Germany'])
        });
        return;
      }
      
      if (slug === 'filter_counts') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockFilterCounts)
        });
        return;
      }
      
      // Handle /api/animals/meta/filter_counts endpoint
      if (url.includes('/meta/filter_counts')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockFilterCounts)
        });
        return;
      }
      
      if (slug === 'statistics') {
        if (this.options.errorScenarios?.statistics) {
          await this.handleError(route, 500, 'Statistics service unavailable');
          return;
        }
        
        await this.delayIfEnabled();
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(this.options.customResponses?.statistics || mockStatistics)
        });
        return;
      }
      
      const dog = mockDogs.find(d => d.slug === slug);
      
      if (!dog) {
        // console.log('MockAPI: dog not found for slug:', slug, 'available dogs:', mockDogs.map(d => d.slug));
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Animal not found' })
        });
        return;
      }
      
      // For broken-image-dog, return dog data but with a broken image URL
      if (dog.slug === 'broken-image-dog') {
        const dogWithBrokenImage = {
          ...dog,
          primary_image_url: 'https://broken-image-url-that-will-404.com/image.jpg'
        };
        // console.log('MockAPI: returning broken-image-dog with broken image URL');
        await this.delayIfEnabled();
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(dogWithBrokenImage)
        });
        return;
      }
      
      // console.log('MockAPI: returning dog:', dog.name, dog.slug);
      // console.log('MockAPI: dog organization data:', JSON.stringify(dog.organization, null, 2));
      await this.delayIfEnabled();
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(dog)
      });
    });

    // Related dogs endpoint
    await this.page.route('**/api/v1/dogs/*/related**', async (route) => {
      const url = route.request().url();
      const slug = url.split('/')[url.split('/').length - 2];
      
      const currentDog = mockDogs.find(d => d.slug === slug);
      if (!currentDog) {
        await route.fulfill({ status: 404, body: JSON.stringify({ error: 'Dog not found' }) });
        return;
      }
      
      // Return dogs from same organization excluding current dog
      const relatedDogs = mockDogs
        .filter(dog => dog.organization_id === currentDog.organization_id && dog.id !== currentDog.id)
        .slice(0, 3);
      
      await this.delayIfEnabled();
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ dogs: relatedDogs })
      });
    });
  }

  private async setupStatisticsEndpoints(): Promise<void> {
    await this.page.route('**/api/v1/statistics**', async (route) => {
      if (this.options.errorScenarios?.statistics) {
        await this.handleError(route, 500, 'Statistics service unavailable');
        return;
      }
      
      await this.delayIfEnabled();
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(this.options.customResponses?.statistics || mockStatistics)
      });
    });
  }

  private async setupFilterEndpoints(): Promise<void> {
    await this.page.route('**/api/v1/filters**', async (route) => {
      if (this.options.errorScenarios?.filters) {
        await this.handleError(route, 500, 'Filter service unavailable');
        return;
      }
      
      await this.delayIfEnabled();
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(this.options.customResponses?.filters || mockFilterCounts)
      });
    });
  }

  private async setupSearchEndpoints(): Promise<void> {
    await this.page.route('**/api/v1/search**', async (route) => {
      const url = new URL(route.request().url());
      const query = url.searchParams.get('q') || '';
      
      if (this.options.errorScenarios?.search) {
        await this.handleError(route, 500, 'Search service unavailable');
        return;
      }
      
      let results: EnhancedDog[] = [];
      const queryLower = query.toLowerCase();
      
      if (queryLower) {
        // Use predefined search results or filter all dogs
        results = searchResults[queryLower as keyof typeof searchResults] || 
          mockDogs.filter(dog => 
            dog.name.toLowerCase().includes(queryLower) ||
            dog.standardized_breed?.toLowerCase().includes(queryLower) ||
            dog.properties.description?.toLowerCase().includes(queryLower)
          );
      }
      
      await this.delayIfEnabled();
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          query,
          results,
          total: results.length
        })
      });
    });

    // Search suggestions endpoint
    await this.page.route('**/api/v1/search/suggestions**', async (route) => {
      const url = new URL(route.request().url());
      const partial = url.searchParams.get('q') || '';
      
      const suggestions = [
        'Golden Retriever',
        'Labrador Mix',
        'Border Collie',
        'French Bulldog',
        'German Shepherd'
      ].filter(breed => breed.toLowerCase().includes(partial.toLowerCase()));
      
      await this.delayIfEnabled(50); // Faster for suggestions
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ suggestions })
      });
    });
  }

  private async setupOrganizationEndpoints(): Promise<void> {
    // Handle organizations list endpoint (without v1 prefix)
    await this.page.route('**/api/organizations', async (route) => {
      const url = route.request().url();
      // Don't intercept individual organization calls that contain a slash after "organizations"
      if (url.includes('/api/organizations/')) {
        route.continue();
        return;
      }
      
      if (this.options.errorScenarios?.organizations) {
        await this.handleError(route, 500, 'Organizations service temporarily unavailable');
        return;
      }
      
      await this.delayIfEnabled();
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockOrganizations)
      });
    });

    // Handle organizations list endpoint (with v1 prefix) - for backward compatibility
    await this.page.route('**/api/v1/organizations**', async (route) => {
      if (this.options.errorScenarios?.organizations) {
        await this.handleError(route, 500, 'Organizations service temporarily unavailable');
        return;
      }
      
      await this.delayIfEnabled();
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockOrganizations)
      });
    });

    // Handle both /api/v1/organizations/* and /api/organizations/*
    const handleOrganizationRoute = async (route: Route) => {
      const url = route.request().url();
      const orgIdOrSlug = url.split('/').pop() || '';
      
      // console.log(`MockAPI: intercepting organization request for '${orgIdOrSlug}' at ${url}`);
      
      // Try to find by ID first, then by slug
      const orgId = parseInt(orgIdOrSlug);
      let organization = mockOrganizations.find(org => org.id === orgId);
      
      if (!organization) {
        // Try to find by slug
        organization = mockOrganizations.find(org => org.slug === orgIdOrSlug);
      }
      
      if (!organization) {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Organization not found' })
        });
        return;
      }
      
      await this.delayIfEnabled();
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(organization)
      });
    };

    // Register routes with more specific patterns
    await this.page.route('**/api/v1/organizations/*', handleOrganizationRoute);
    await this.page.route('**/api/organizations/*', handleOrganizationRoute);
  }

  private async delayIfEnabled(customDelay?: number): Promise<void> {
    if (this.options.enableDelays) {
      const delay = customDelay || this.options.defaultDelay || 100;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  private async handleError(route: Route, status: number, message: string): Promise<void> {
    await this.delayIfEnabled();
    
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ error: message })
    });
  }

  // Utility methods for tests
  async enableErrorScenario(endpoint: 'dogs' | 'statistics' | 'filters' | 'search' | 'organizations'): Promise<void> {
    if (!this.options.errorScenarios) {
      this.options.errorScenarios = {};
    }
    this.options.errorScenarios[endpoint] = true;
  }

  async disableErrorScenario(endpoint: 'dogs' | 'statistics' | 'filters' | 'search' | 'organizations'): Promise<void> {
    if (!this.options.errorScenarios) {
      this.options.errorScenarios = {};
    }
    this.options.errorScenarios[endpoint] = false;
  }

  async simulateSlowNetwork(enabled: boolean = true): Promise<void> {
    this.options.enableDelays = enabled;
    this.options.defaultDelay = enabled ? 2000 : 100;
  }

  async updateCustomResponses(responses: Partial<MockAPIOptions['customResponses']>): Promise<void> {
    this.options.customResponses = {
      ...this.options.customResponses,
      ...responses
    };
  }

  async resetToDefaults(): Promise<void> {
    this.options.errorScenarios = {};
    this.options.enableDelays = false;
    this.options.defaultDelay = 100;
    this.options.customResponses = {};
  }

  async cleanup(): Promise<void> {
    await this.page.unrouteAll();
    this.setupComplete = false;
  }
}

// Convenience function to create and setup MockAPI
export async function createMockAPI(page: Page, options: MockAPIOptions = {}): Promise<MockAPI> {
  const mockAPI = new MockAPI(page, options);
  await mockAPI.setup();
  return mockAPI;
}

// Predefined scenarios for common testing situations
export const mockAPIScenarios = {
  // Normal operation with realistic delays
  realistic: {
    enableDelays: true,
    defaultDelay: 300
  },
  
  // Fast responses for quick testing
  fast: {
    enableDelays: false
  },
  
  // Slow network simulation
  slowNetwork: {
    enableDelays: true,
    defaultDelay: 2000
  },
  
  // Error scenarios
  dogsError: {
    errorScenarios: { dogs: true }
  },
  
  statisticsError: {
    errorScenarios: { statistics: true }
  },
  
  searchError: {
    errorScenarios: { search: true }
  },
  
  // Empty states
  emptyResults: {
    customResponses: {
      dogs: []
    }
  },
  
  // Large dataset simulation
  largeDataset: {
    customResponses: {
      dogs: Array.from({ length: 100 }, (_, i) => ({
        ...mockDogs[0],
        id: i + 1,
        slug: `dog-${i + 1}`,
        name: `Dog ${i + 1}`
      }))
    }
  }
};

export default MockAPI;
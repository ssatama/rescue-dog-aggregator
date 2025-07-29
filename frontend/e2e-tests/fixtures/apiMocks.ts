import { Page, Route } from 'playwright/test';
import {
  mockDogs,
  mockOrganizations,
  mockStatistics,
  mockBreeds,
  mockBreedGroups,
  mockLocationCountries,
  mockAvailableCountries,
  mockAvailableRegions,
  mockFilterCounts,
  getRandomDogs,
  getDogBySlug,
  getDogsWithFilters,
  EnhancedDog,
  Organization,
  Statistics,
  FilterCounts,
  MockAvailableRegions,
} from './testData';

export interface ApiMockOptions {
  delay?: number;
  status?: number;
  errorMessage?: string;
  headers?: Record<string, string>;
}

/**
 * Aligns with `services/__mocks__/animalsService.js` by providing a network-level
 * mock that simulates the backend API behavior, ensuring consistency between
 * component/integration tests and E2E tests.
 */
export class ApiMocker {
  constructor(private page: Page) {}

  async mockStandardizedBreeds(breeds: string[] = mockBreeds, options: ApiMockOptions = {}) {
    await this.page.route('**/api/animals/meta/breeds', (route) => this.handleResponse(route, breeds, options));
  }

  async mockBreedGroups(breedGroups: string[] = mockBreedGroups, options: ApiMockOptions = {}) {
    await this.page.route('**/api/animals/meta/breed_groups', (route) => this.handleResponse(route, breedGroups, options));
  }

  async mockLocationCountries(countries: string[] = mockLocationCountries, options: ApiMockOptions = {}) {
    await this.page.route('**/api/animals/meta/location_countries', (route) => this.handleResponse(route, countries, options));
  }

  async mockAvailableCountries(countries: string[] = mockAvailableCountries, options: ApiMockOptions = {}) {
    await this.page.route('**/api/animals/meta/available_countries', (route) => this.handleResponse(route, countries, options));
  }

  async mockAvailableRegions(country: keyof MockAvailableRegions, regions?: string[], options: ApiMockOptions = {}) {
    const mockRegions = regions || mockAvailableRegions[country] || [];
    await this.page.route(`**/api/animals/meta/available_regions?country=${country}`, (route) => this.handleResponse(route, mockRegions, options));
  }

  async mockRandomAnimals(count: number = 3, animals?: EnhancedDog[], options: ApiMockOptions = {}) {
    const randomAnimals = animals || getRandomDogs(count);
    await this.page.route('**/api/animals/random', (route) => this.handleResponse(route, randomAnimals, options));
  }

  async mockAnimalsListWithFilters(options: ApiMockOptions = {}) {
    await this.page.route('**/api/animals', async (route: Route) => {
      const url = new URL(route.request().url());
      const params = Object.fromEntries(url.searchParams);
      
      const filteredDogs = getDogsWithFilters({
        ...params,
        animal_type: params.animal_type || 'dog',
        status: params.status || 'available',
      });

      const limit = parseInt(params.limit || '20', 10);
      const offset = parseInt(params.offset || '0', 10);
      const paginatedDogs = filteredDogs.slice(offset, offset + limit);

      const headers = {
        'Content-Type': 'application/json',
        'X-Total-Count': filteredDogs.length.toString(),
        ...options.headers,
      };

      await this.handleResponse(route, paginatedDogs, { ...options, headers });
    });
  }

  async mockAnimalBySlug(slug: string, animal?: EnhancedDog, options: ApiMockOptions = {}) {
    await this.page.route(`**/api/animals/${slug}`, async (route: Route) => {
      const dog = animal || getDogBySlug(slug);
      if (!dog) {
        await this.handleResponse(route, { error: 'Not Found' }, { ...options, status: 404 });
        return;
      }
      await this.handleResponse(route, dog, options);
    });
  }

  async mockStatistics(statistics: Statistics = mockStatistics, options: ApiMockOptions = {}) {
    await this.page.route('**/api/animals/statistics', (route) => this.handleResponse(route, statistics, options));
  }

  async mockFilterCounts(filterCounts: FilterCounts = mockFilterCounts, options: ApiMockOptions = {}) {
    await this.page.route('**/api/animals/meta/filter_counts', (route) => this.handleResponse(route, filterCounts, options));
  }
  
  async mockOrganizations(organizations: Organization[] = mockOrganizations, options: ApiMockOptions = {}) {
    await this.page.route('**/api/organizations', (route) => this.handleResponse(route, organizations, options));
  }

  async setupAllMocks(options: ApiMockOptions = {}) {
    await this.mockAnimalsListWithFilters(options);
    await this.mockStatistics(mockStatistics, options);
    await this.mockFilterCounts(mockFilterCounts, options);
    await this.mockOrganizations(mockOrganizations, options);
    await this.mockStandardizedBreeds(mockBreeds, options);
    await this.mockBreedGroups(mockBreedGroups, options);
    await this.mockLocationCountries(mockLocationCountries, options);
    await this.mockAvailableCountries(mockAvailableCountries, options);
    await this.mockRandomAnimals(3, undefined, options);

    for (const dog of mockDogs) {
      await this.mockAnimalBySlug(dog.slug, dog, options);
    }
    for (const country of Object.keys(mockAvailableRegions) as (keyof MockAvailableRegions)[]) {
      await this.mockAvailableRegions(country, mockAvailableRegions[country], options);
    }
  }

  private async handleResponse(route: Route, data: any, options: ApiMockOptions) {
    const { delay = 0, status = 200, errorMessage, headers = {} } = options;

    if (delay > 0) {
      await this.page.waitForTimeout(delay);
    }

    if (errorMessage) {
      await route.fulfill({
        status: status >= 400 ? status : 500,
        contentType: 'application/json',
        headers,
        body: JSON.stringify({ error: errorMessage }),
      });
      return;
    }

    await route.fulfill({
      status,
      contentType: 'application/json',
      headers,
      body: JSON.stringify(data),
    });
  }
}

// Helper function for tests that need basic API mocking
export async function setupBasicMocks(page: Page, options: ApiMockOptions = {}) {
  const apiMocker = new ApiMocker(page);
  await apiMocker.setupAllMocks(options);
  return apiMocker;
}

import { Page, Browser, BrowserContext, test as baseTest } from 'playwright/test';
import { MockAPI, createMockAPI, mockAPIScenarios } from '../fixtures/mockAPI';
import { getTimeoutConfig } from './testHelpers';

// Placeholder page object types - will be replaced when page objects are implemented
export interface PageObjectPlaceholder {
  page: Page;
}

export interface TestFixtures {
  mockAPI: MockAPI;
  dogsPage: PageObjectPlaceholder;
  dogDetailPage: PageObjectPlaceholder;
  homePage: PageObjectPlaceholder;
}

export interface WorkerFixtures {
  browser: Browser;
}

// Base test class for common functionality
export class BaseTestSetup {
  protected page: Page;
  protected context: BrowserContext;
  protected mockAPI: MockAPI;
  private timeouts = getTimeoutConfig();

  constructor(page: Page, context: BrowserContext) {
    this.page = page;
    this.context = context;
  }

  async setup(mockAPIOptions = {}): Promise<void> {
    // Create and setup mock API
    this.mockAPI = await createMockAPI(this.page, mockAPIOptions);
    
    // Set default timeouts
    this.page.setDefaultTimeout(this.timeouts.page.load);
    this.page.setDefaultNavigationTimeout(this.timeouts.page.navigation);
    
    // Common page settings
    await this.setupPageSettings();
    
    // Setup console logging for debugging
    await this.setupConsoleLogging();
  }

  private async setupPageSettings(): Promise<void> {
    // Set viewport for consistent testing
    await this.page.setViewportSize({ width: 1280, height: 720 });
    
    // Disable animations for faster, more reliable tests
    await this.page.addInitScript(() => {
      // Disable CSS animations
      const style = document.createElement('style');
      style.innerHTML = `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `;
      document.head.appendChild(style);
      
      // Disable scroll behavior
      document.documentElement.style.scrollBehavior = 'auto';
    });
  }

  private async setupConsoleLogging(): Promise<void> {
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`Browser console error: ${msg.text()}`);
      }
    });
    
    this.page.on('pageerror', error => {
      console.error(`Page error: ${error.message}`);
    });
  }

  async teardown(): Promise<void> {
    if (this.mockAPI) {
      await this.mockAPI.cleanup();
    }
    // Remove event listeners
    this.page.removeAllListeners();
  }

  // Mobile testing helpers
  async setMobileViewport(): Promise<void> {
    await this.page.setViewportSize({ width: 375, height: 667 });
  }

  async setTabletViewport(): Promise<void> {
    await this.page.setViewportSize({ width: 768, height: 1024 });
  }

  async setDesktopViewport(): Promise<void> {
    await this.page.setViewportSize({ width: 1280, height: 720 });
  }

  // Network simulation helpers
  async simulateSlowNetwork(): Promise<void> {
    await this.mockAPI.simulateSlowNetwork(true);
  }

  async restoreNormalNetwork(): Promise<void> {
    await this.mockAPI.simulateSlowNetwork(false);
  }

  // Error simulation helpers
  async simulateAPIError(endpoint: 'dogs' | 'statistics' | 'filters' | 'search'): Promise<void> {
    await this.mockAPI.enableErrorScenario(endpoint);
  }

  async restoreAPIEndpoint(endpoint: 'dogs' | 'statistics' | 'filters' | 'search'): Promise<void> {
    await this.mockAPI.disableErrorScenario(endpoint);
  }

  // Accessibility helpers
  async checkBasicAccessibility(): Promise<void> {
    // Check for basic accessibility requirements
    const hasMainLandmark = await this.page.locator('main, [role="main"]').count() > 0;
    const hasH1 = await this.page.locator('h1').count() > 0;
    const hasSkipLink = await this.page.locator('a[href*="#"]').first().isVisible();
    
    if (!hasMainLandmark) {
      console.warn('Accessibility warning: No main landmark found');
    }
    if (!hasH1) {
      console.warn('Accessibility warning: No H1 heading found');
    }
  }

  // Performance helpers
  async waitForPagePerformance(): Promise<void> {
    // Wait for network to be idle
    await this.page.waitForLoadState('networkidle');
    
    // Wait for any remaining async operations
    await this.page.waitForTimeout(100);
  }

  // Common assertions
  async expectPageToLoad(url?: string): Promise<void> {
    if (url) {
      await this.page.goto(url);
    }
    await this.waitForPagePerformance();
    await this.checkBasicAccessibility();
  }
}

// Feature-specific test base classes
export class DogsListingTestBase extends BaseTestSetup {
  async setupForDogsListing(): Promise<void> {
    await this.setup(mockAPIScenarios.realistic);
    await this.expectPageToLoad('/dogs');
  }

  async waitForDogsToLoad(): Promise<void> {
    await this.page.waitForSelector('[data-testid="dogs-grid"]', { 
      state: 'visible', 
      timeout: this.timeouts.ui.loading 
    });
  }

  async waitForFiltersToLoad(): Promise<void> {
    await this.page.waitForSelector('[data-testid="filter-controls"]', { 
      state: 'visible', 
      timeout: this.timeouts.ui.loading 
    });
  }
}

export class DogDetailTestBase extends BaseTestSetup {
  async setupForDogDetail(dogSlug: string = 'max-golden-retriever'): Promise<void> {
    await this.setup(mockAPIScenarios.realistic);
    await this.expectPageToLoad(`/dogs/${dogSlug}`);
  }

  async waitForDogDetailToLoad(): Promise<void> {
    await this.page.waitForSelector('[data-testid="hero-image-container"]', { 
      state: 'visible', 
      timeout: this.timeouts.ui.loading 
    });
    await this.page.waitForSelector('h1', { 
      state: 'visible', 
      timeout: this.timeouts.ui.loading 
    });
  }
}

export class HomePageTestBase extends BaseTestSetup {
  async setupForHomePage(): Promise<void> {
    await this.setup(mockAPIScenarios.realistic);
    await this.expectPageToLoad('/');
  }

  async waitForHomePageToLoad(): Promise<void> {
    await this.page.waitForSelector('[data-testid="hero-section"]', { 
      state: 'visible', 
      timeout: this.timeouts.ui.loading 
    });
    await this.page.waitForSelector('[data-testid="dog-section"]', { 
      state: 'visible', 
      timeout: this.timeouts.ui.loading 
    });
  }
}

// Mobile-specific test base classes
export class MobileTestBase extends BaseTestSetup {
  async setupForMobile(): Promise<void> {
    await this.setMobileViewport();
    await this.setup(mockAPIScenarios.realistic);
  }

  async openMobileFilter(): Promise<void> {
    const filterButton = this.page.getByTestId('mobile-filter-button');
    await filterButton.click();
    await this.page.waitForSelector('[data-testid="mobile-filter-drawer"]', { 
      state: 'visible', 
      timeout: this.timeouts.ui.animation 
    });
  }

  async closeMobileFilter(): Promise<void> {
    const closeButton = this.page.getByTestId('close-filter-drawer');
    await closeButton.click();
    await this.page.waitForSelector('[data-testid="mobile-filter-drawer"]', { 
      state: 'hidden', 
      timeout: this.timeouts.ui.animation 
    });
  }
}

// Extended test with fixtures
export const test = baseTest.extend<TestFixtures, WorkerFixtures>({
  // Page-level fixtures
  mockAPI: async ({ page }, use) => {
    const mockAPI = await createMockAPI(page, mockAPIScenarios.fast);
    await use(mockAPI);
    await mockAPI.cleanup();
  },

  // Page object fixtures (will be properly implemented when page objects exist)
  dogsPage: async ({ page }, use) => {
    // This will be replaced with actual DogsPage when implemented
    const dogsPage = { page }; // Placeholder
    await use(dogsPage);
  },

  dogDetailPage: async ({ page }, use) => {
    // This will be replaced with actual DogDetailPage when implemented
    const dogDetailPage = { page }; // Placeholder
    await use(dogDetailPage);
  },

  homePage: async ({ page }, use) => {
    // This will be replaced with actual HomePage when implemented
    const homePage = { page }; // Placeholder
    await use(homePage);
  }
});

// Test context helpers
export class TestContext {
  static async createForDogsListing(page: Page, context: BrowserContext): Promise<DogsListingTestBase> {
    const testBase = new DogsListingTestBase(page, context);
    await testBase.setupForDogsListing();
    return testBase;
  }

  static async createForDogDetail(page: Page, context: BrowserContext, dogSlug?: string): Promise<DogDetailTestBase> {
    const testBase = new DogDetailTestBase(page, context);
    await testBase.setupForDogDetail(dogSlug);
    return testBase;
  }

  static async createForHomePage(page: Page, context: BrowserContext): Promise<HomePageTestBase> {
    const testBase = new HomePageTestBase(page, context);
    await testBase.setupForHomePage();
    return testBase;
  }

  static async createForMobile(page: Page, context: BrowserContext): Promise<MobileTestBase> {
    const testBase = new MobileTestBase(page, context);
    await testBase.setupForMobile();
    return testBase;
  }
}

// Common test utilities
export const TestUtils = {
  // Wait for debounced action
  async waitForDebounce(ms: number = 300): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
  },

  // Generate random test data
  generateRandomString(length: number = 8): string {
    return Math.random().toString(36).substring(2, 2 + length);
  },

  // Retry helper
  async retry<T>(
    fn: () => Promise<T>, 
    retries: number = 3, 
    delay: number = 1000
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retry(fn, retries - 1, delay);
      }
      throw error;
    }
  },

  // Screenshot helper
  async takeScreenshot(page: Page, name: string): Promise<void> {
    await page.screenshot({ 
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage: true 
    });
  }
};

export { test as extendedTest };
export default test;
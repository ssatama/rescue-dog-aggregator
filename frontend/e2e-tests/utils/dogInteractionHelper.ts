import { Page, Locator, expect } from 'playwright/test';
import { EnhancedDog } from '../fixtures/testData';
import { 
  DogInteractionResult, 
  SearchInteractionResult, 
  FilterInteractionResult 
} from './dogTestHelperTypes';
import { getTimeoutConfig } from './testHelpers';
import { DogDetailValidator } from './dogDetailValidator';

/**
 * Comprehensive helper class for interacting with dog-related elements and testing user interactions
 */
export class DogInteractionHelper {
  private page: Page;
  private timeouts = getTimeoutConfig();
  private apiCallLog: Array<{ endpoint: string; timestamp: number; method: string }> = [];

  constructor(page: Page) {
    this.page = page;
    this.setupNetworkLogging();
  }

  private setupNetworkLogging(): void {
    this.page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/api/')) {
        this.apiCallLog.push({
          endpoint: url,
          timestamp: Date.now(),
          method: request.method()
        });
      }
    });
  }

  async navigateToDetail(slug: string, expectedDog?: EnhancedDog): Promise<void> {
    await this.page.goto(`/dogs/${slug}`);
    await this.page.waitForLoadState('networkidle');
    if (expectedDog) {
      const detailValidator = new DogDetailValidator(this.page);
      await detailValidator.validateDetailPage(expectedDog);
    }
  }

  async clickCard(index: number = 0): Promise<void> {
    const dogCards = this.page.locator('[data-testid="dog-card"]');
    await dogCards.nth(index).click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickCardByName(dogName: string): Promise<void> {
    await this.page.locator('[data-testid="dog-card"]', { hasText: dogName }).click();
    await this.page.waitForLoadState('networkidle');
  }

  async loadMore(): Promise<void> {
    const loadMoreButton = this.page.getByRole('button', { name: /load more/i });
    if (await loadMoreButton.isVisible()) {
      await loadMoreButton.click();
      await this.waitForDogCardsToLoad();
    }
  }

  /**
   * Click on a dog card and verify the interaction
   */
  async clickDogCard(dogName: string): Promise<DogInteractionResult> {
    const startTime = Date.now();
    
    try {
      // Find dog card by name
      const dogCards = this.page.locator('[data-testid="dog-card"], .dog-card');
      const cardCount = await dogCards.count();
      let targetCard: Locator | null = null;

      for (let i = 0; i < cardCount; i++) {
        const card = dogCards.nth(i);
        const nameElement = card.locator('[data-testid="dog-name"], h2, h3').first();
        const nameText = await nameElement.textContent();
        
        if (nameText?.trim().toLowerCase() === dogName.toLowerCase()) {
          targetCard = card;
          break;
        }
      }

      if (!targetCard) {
        return {
          success: false,
          action: 'clickDogCard',
          target: dogName,
          duration: Date.now() - startTime,
          error: `Dog card with name "${dogName}" not found`
        };
      }

      // Click the card
      await targetCard.click();

      // Wait for navigation or detail page load
      await this.page.waitForTimeout(500);

      // Verify we're on dog detail page or modal opened
      const onDetailPage = await this.page.url().includes('/dogs/');
      const modalOpened = await this.page.locator('[data-testid="dog-modal"], .modal').isVisible().catch(() => false);

      if (!onDetailPage && !modalOpened) {
        return {
          success: false,
          action: 'clickDogCard',
          target: dogName,
          duration: Date.now() - startTime,
          error: 'No navigation or modal opened after clicking dog card'
        };
      }

      return {
        success: true,
        action: 'clickDogCard',
        target: dogName,
        duration: Date.now() - startTime
      };

    } catch (error) {
      return {
        success: false,
        action: 'clickDogCard',
        target: dogName,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Perform search with debouncing validation
   */
  async performSearch(query: string, expectedResultCount?: number): Promise<SearchInteractionResult> {
    const startTime = Date.now();
    const initialApiCallCount = this.apiCallLog.length;

    try {
      const searchInput = this.page.locator('[data-testid="search-input"], input[type="search"]').first();
      await expect(searchInput).toBeVisible({ timeout: this.timeouts.ui.element });

      // Clear existing search
      await searchInput.clear();

      // Type search query character by character to test debouncing
      for (const char of query) {
        await searchInput.type(char);
        await this.page.waitForTimeout(50); // Fast typing
      }

      // Wait for debounce period
      await this.page.waitForTimeout(1000);

      // Wait for search results
      await this.page.waitForSelector('[data-testid="dogs-grid"], .dogs-grid', { 
        state: 'visible', 
        timeout: this.timeouts.ui.loading 
      });

      // Count results
      const dogCards = this.page.locator('[data-testid="dog-card"], .dog-card');
      const resultsCount = await dogCards.count();

      // Check if empty state is shown for zero results
      const emptyState = this.page.locator('[data-testid="empty-state"], .empty-state');
      const isEmptyState = await emptyState.isVisible().catch(() => false);

      // Count API calls made during search
      const searchApiCalls = this.apiCallLog.slice(initialApiCallCount).filter(call => 
        call.endpoint.includes('/api/animals')
      );

      // Check for highlighting
      const highlightElements = this.page.locator('.highlight, mark, [data-highlighted]');
      const highlightingWorking = await highlightElements.count() > 0;

      const totalTime = Date.now() - startTime;
      const averageResponseTime = searchApiCalls.length > 0 
        ? totalTime / searchApiCalls.length 
        : totalTime;

      // Debouncing should result in fewer API calls than characters typed
      const debounceBehaviorCorrect = searchApiCalls.length <= Math.ceil(query.length / 3);

      return {
        query,
        resultsCount: isEmptyState ? 0 : resultsCount,
        searchTime: totalTime,
        debounceWorking: debounceBehaviorCorrect,
        highlightingWorking,
        apiCallsMade: searchApiCalls.length,
        expectedApiCalls: 1, // Should ideally be just one call after debouncing
        performance: {
          averageResponseTime,
          totalSearchTime: totalTime,
          debounceBehaviorCorrect
        }
      };

    } catch (error) {
      return {
        query,
        resultsCount: 0,
        searchTime: Date.now() - startTime,
        debounceWorking: false,
        highlightingWorking: false,
        apiCallsMade: 0,
        expectedApiCalls: 1,
        performance: {
          averageResponseTime: 0,
          totalSearchTime: Date.now() - startTime,
          debounceBehaviorCorrect: false
        }
      };
    }
  }

  /**
   * Apply filters and validate the interaction
   */
  async applyFilters(filters: Record<string, string>): Promise<FilterInteractionResult> {
    const startTime = Date.now();
    const initialApiCallCount = this.apiCallLog.length;

    try {
      const filterControls = this.page.locator('[data-testid="filter-controls"], .filter-controls').first();
      await expect(filterControls).toBeVisible({ timeout: this.timeouts.ui.element });

      // Apply each filter
      for (const [filterType, value] of Object.entries(filters)) {
        const filterElement = filterControls.locator(`[data-testid="${filterType}-filter"], select[name*="${filterType}"]`).first();
        await filterElement.selectOption(value);
        await this.page.waitForTimeout(100); // Small delay between filters
      }

      // Wait for filters to apply
      await this.page.waitForTimeout(500);

      // Wait for results to update
      await this.page.waitForSelector('[data-testid="dogs-grid"], .dogs-grid', { 
        state: 'visible', 
        timeout: this.timeouts.ui.loading 
      });

      // Count results
      const dogCards = this.page.locator('[data-testid="dog-card"], .dog-card');
      const resultsCount = await dogCards.count();

      // Check if URL was updated with filter parameters
      const currentUrl = this.page.url();
      const urlUpdated = Object.keys(filters).some(key => currentUrl.includes(key));

      // Check for filter badges
      const filterBadges = this.page.locator('[data-testid="filter-badge"], .filter-badge');
      const badgesVisible = await filterBadges.count() > 0;

      // Check for clear filters button
      const clearFilters = this.page.locator('[data-testid="clear-filters"], button:has-text("Clear")');
      const clearFiltersVisible = await clearFilters.isVisible().catch(() => false);

      // Count API calls made during filtering
      const filterApiCalls = this.apiCallLog.slice(initialApiCallCount).filter(call => 
        call.endpoint.includes('/api/animals')
      );

      const totalTime = Date.now() - startTime;
      const filterResponseTime = filterApiCalls.length > 0 
        ? totalTime / filterApiCalls.length 
        : totalTime;

      return {
        filtersApplied: filters,
        resultsCount,
        filterTime: totalTime,
        urlUpdated,
        badgesVisible,
        clearFiltersVisible,
        performance: {
          filterResponseTime,
          uiUpdateTime: totalTime
        }
      };

    } catch (error) {
      return {
        filtersApplied: filters,
        resultsCount: 0,
        filterTime: Date.now() - startTime,
        urlUpdated: false,
        badgesVisible: false,
        clearFiltersVisible: false,
        performance: {
          filterResponseTime: 0,
          uiUpdateTime: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Test favorite/unfavorite functionality
   */
  async toggleFavorite(dogName: string): Promise<DogInteractionResult> {
    const startTime = Date.now();

    try {
      // Find dog card by name
      const dogCards = this.page.locator('[data-testid="dog-card"], .dog-card');
      const cardCount = await dogCards.count();
      let targetCard: Locator | null = null;

      for (let i = 0; i < cardCount; i++) {
        const card = dogCards.nth(i);
        const nameElement = card.locator('[data-testid="dog-name"], h2, h3').first();
        const nameText = await nameElement.textContent();
        
        if (nameText?.trim().toLowerCase() === dogName.toLowerCase()) {
          targetCard = card;
          break;
        }
      }

      if (!targetCard) {
        return {
          success: false,
          action: 'toggleFavorite',
          target: dogName,
          duration: Date.now() - startTime,
          error: `Dog card with name "${dogName}" not found`
        };
      }

      // Find and click favorite button
      const favoriteButton = targetCard.locator('[data-testid="favorite-button"], button[aria-label*="favorite"], .favorite-btn').first();
      
      if (!await favoriteButton.isVisible()) {
        return {
          success: false,
          action: 'toggleFavorite',
          target: dogName,
          duration: Date.now() - startTime,
          error: 'Favorite button not found on dog card'
        };
      }

      // Get initial state
      const initialState = await favoriteButton.getAttribute('aria-pressed') === 'true';

      // Click favorite button
      await favoriteButton.click();

      // Wait for state change
      await this.page.waitForTimeout(500);

      // Verify state changed
      const newState = await favoriteButton.getAttribute('aria-pressed') === 'true';

      if (initialState === newState) {
        return {
          success: false,
          action: 'toggleFavorite',
          target: dogName,
          duration: Date.now() - startTime,
          error: 'Favorite state did not change after clicking'
        };
      }

      return {
        success: true,
        action: 'toggleFavorite',
        target: dogName,
        duration: Date.now() - startTime
      };

    } catch (error) {
      return {
        success: false,
        action: 'toggleFavorite',
        target: dogName,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test load more functionality
   */
  async loadMoreDogs(): Promise<DogInteractionResult> {
    const startTime = Date.now();

    try {
      // Get initial dog count
      const initialCards = this.page.locator('[data-testid="dog-card"], .dog-card');
      const initialCount = await initialCards.count();

      // Find load more button
      const loadMoreButton = this.page.locator('[data-testid="load-more-button"], button:has-text("Load More")').first();
      
      if (!await loadMoreButton.isVisible()) {
        return {
          success: false,
          action: 'loadMoreDogs',
          target: 'load-more-button',
          duration: Date.now() - startTime,
          error: 'Load more button not found or not visible'
        };
      }

      // Click load more button
      await loadMoreButton.click();

      // Wait for new dogs to load
      await this.page.waitForTimeout(2000);

      // Get new dog count
      const newCards = this.page.locator('[data-testid="dog-card"], .dog-card');
      const newCount = await newCards.count();

      if (newCount <= initialCount) {
        return {
          success: false,
          action: 'loadMoreDogs',
          target: 'load-more-button',
          duration: Date.now() - startTime,
          error: `No new dogs loaded. Initial: ${initialCount}, New: ${newCount}`
        };
      }

      return {
        success: true,
        action: 'loadMoreDogs',
        target: 'load-more-button',
        duration: Date.now() - startTime
      };

    } catch (error) {
      return {
        success: false,
        action: 'loadMoreDogs',
        target: 'load-more-button',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Clear search and filters
   */
  async clearSearchAndFilters(): Promise<DogInteractionResult> {
    const startTime = Date.now();

    try {
      // Clear search input
      const searchInput = this.page.locator('[data-testid="search-input"], input[type="search"]').first();
      if (await searchInput.isVisible()) {
        await searchInput.clear();
      }

      // Click clear filters button
      const clearFiltersButton = this.page.locator('[data-testid="clear-filters"], button:has-text("Clear")').first();
      if (await clearFiltersButton.isVisible()) {
        await clearFiltersButton.click();
      }

      // Wait for reset
      await this.page.waitForTimeout(1000);

      // Verify search is cleared
      const searchValue = await searchInput.inputValue().catch(() => '');
      
      // Verify filters are cleared (no filter badges)
      const filterBadges = this.page.locator('[data-testid="filter-badge"], .filter-badge');
      const badgeCount = await filterBadges.count();

      if (searchValue.length > 0 || badgeCount > 0) {
        return {
          success: false,
          action: 'clearSearchAndFilters',
          target: 'search-and-filters',
          duration: Date.now() - startTime,
          error: 'Search or filters not fully cleared'
        };
      }

      return {
        success: true,
        action: 'clearSearchAndFilters',
        target: 'search-and-filters',
        duration: Date.now() - startTime
      };

    } catch (error) {
      return {
        success: false,
        action: 'clearSearchAndFilters',
        target: 'search-and-filters',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async waitForDogCardsToLoad(): Promise<void> {
    // Wait for dogs grid to be visible
    await this.page.waitForSelector('[data-testid="dogs-grid"], .dogs-grid', { 
      state: 'visible', 
      timeout: this.timeouts.page.load 
    });

    // Wait for at least one dog card or empty state
    await Promise.race([
      this.page.waitForSelector('[data-testid="dog-card"], .dog-card', { 
        state: 'visible', 
        timeout: this.timeouts.ui.loading 
      }),
      this.page.waitForSelector('[data-testid="empty-state"], .empty-state', { 
        state: 'visible', 
        timeout: this.timeouts.ui.loading 
      })
    ]);

    // Wait for any loading states to finish
    const loadingSpinner = this.page.locator('[data-testid="loading-spinner"], .loading');
    if (await loadingSpinner.isVisible().catch(() => false)) {
      await loadingSpinner.waitFor({ state: 'hidden', timeout: this.timeouts.ui.loading });
    }
  }

  /**
   * Get API call log for analysis
   */
  getApiCallLog(): Array<{ endpoint: string; timestamp: number; method: string }> {
    return [...this.apiCallLog];
  }

  /**
   * Clear API call log
   */
  clearApiCallLog(): void {
    this.apiCallLog = [];
  }

  /**
   * Take screenshot for debugging
   */
  async takeDebugScreenshot(name: string): Promise<void> {
    await this.page.screenshot({ 
      path: `test-results/debug-screenshots/${name}-${Date.now()}.png`,
      fullPage: true 
    });
  }
}

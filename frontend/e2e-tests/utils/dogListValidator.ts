import { Page, Locator, expect } from 'playwright/test';
import { EnhancedDog } from '../fixtures/testData';
import { 
  DogListOptions, 
  DogListValidationResult, 
  ValidationResult,
  DogCardValidationResult 
} from './dogTestHelperTypes';
import { getTimeoutConfig } from './testHelpers';
import { DogCardValidator } from './dogCardValidator';

/**
 * Comprehensive validator for dog listing pages with detailed validation results
 */
export class DogListValidator {
  private page: Page;
  private timeouts = getTimeoutConfig();
  private cardValidator: DogCardValidator;

  constructor(page: Page) {
    this.page = page;
    this.cardValidator = new DogCardValidator(page);
  }

  async validateList(
    expectedDogs: EnhancedDog[],
    options: DogListOptions = {}
  ): Promise<DogListValidationResult> {
    const {
      expectedCount = expectedDogs.length,
      validateOrder = false,
      checkAllImages = false,
      validatePagination = false,
      validateFiltering = false,
      validateSearch = false,
      validateLoadMore = false,
      validateEmptyState = false
    } = options;

    const results: DogListValidationResult = {
      overall: { passed: true, message: 'Dog list validation passed' },
      gridLayout: { passed: true, message: 'Grid layout validation passed' },
      dogCards: [],
      pagination: { passed: true, message: 'Pagination validation skipped' },
      filtering: { passed: true, message: 'Filtering validation skipped' },
      search: { passed: true, message: 'Search validation skipped' },
      loadMore: { passed: true, message: 'Load more validation skipped' },
      emptyState: { passed: true, message: 'Empty state validation skipped' },
      accessibility: { passed: true, message: 'Accessibility validation passed' },
      performance: { passed: true, message: 'Performance validation passed' }
    };

    try {
      // Wait for dogs grid to load
      await this.waitForDogCardsToLoad();

      // Validate grid layout
      results.gridLayout = await this.validateGridLayout();

      // Validate individual dog cards
      results.dogCards = await this.validateDogCards(expectedDogs, expectedCount, checkAllImages);

      // Optional validations
      if (validatePagination) {
        results.pagination = await this.validatePagination();
      }

      if (validateFiltering) {
        results.filtering = await this.validateFiltering();
      }

      if (validateSearch) {
        results.search = await this.validateSearch();
      }

      if (validateLoadMore) {
        results.loadMore = await this.validateLoadMore();
      }

      if (validateEmptyState) {
        results.emptyState = await this.validateEmptyState();
      }

      // Always validate accessibility and performance
      results.accessibility = await this.validateAccessibility();
      results.performance = await this.validatePerformance();

      // Determine overall result
      const allResults = [
        results.gridLayout,
        results.pagination,
        results.filtering,
        results.search,
        results.loadMore,
        results.emptyState,
        results.accessibility,
        results.performance
      ];

      // Add dog card results
      const failedCardResults = results.dogCards.filter(card => !card.overall.passed);
      if (failedCardResults.length > 0) {
        allResults.push({ 
          passed: false, 
          message: `${failedCardResults.length} dog cards failed validation` 
        });
      }

      const failedResults = allResults.filter(result => !result.passed);
      if (failedResults.length > 0) {
        results.overall = {
          passed: false,
          message: `Dog list validation failed: ${failedResults.map(r => r.message).join(', ')}`,
          element: 'dogs-grid'
        };
      }

    } catch (error) {
      results.overall = {
        passed: false,
        message: `Dog list validation failed with error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        element: 'dogs-grid'
      };
    }

    return results;
  }

  private async validateGridLayout(): Promise<ValidationResult> {
    try {
      const dogsGrid = this.page.locator('[data-testid="dogs-grid"], .dogs-grid').first();
      await expect(dogsGrid).toBeVisible({ timeout: this.timeouts.ui.element });

      // Check if grid has responsive classes or styles
      const gridClass = await dogsGrid.getAttribute('class');
      const gridStyle = await dogsGrid.getAttribute('style');

      if (!gridClass?.includes('grid') && !gridStyle?.includes('grid')) {
        return { passed: false, message: 'Dogs grid lacks proper grid layout classes or styles' };
      }

      // Check if grid contains dog cards
      const dogCards = dogsGrid.locator('[data-testid="dog-card"], .dog-card');
      const cardCount = await dogCards.count();

      if (cardCount === 0) {
        return { passed: false, message: 'Dogs grid contains no dog cards' };
      }

      return { passed: true, message: 'Grid layout validation passed' };
    } catch {
      return { passed: false, message: 'Dogs grid not found or not visible' };
    }
  }

  private async validateDogCards(expectedDogs: EnhancedDog[], expectedCount?: number, checkAllImages = false): Promise<DogCardValidationResult[]> {
    const results: DogCardValidationResult[] = [];
    
    try {
      const dogCards = this.page.locator('[data-testid="dog-card"], .dog-card');
      const cardCount = await dogCards.count();

      // Validate expected count
      if (expectedCount !== undefined && cardCount !== expectedCount) {
        const errorResult: DogCardValidationResult = {
          overall: { 
            passed: false, 
            message: `Expected ${expectedCount} dog cards, found ${cardCount}` 
          },
          image: { passed: false, message: 'Count validation failed' },
          name: { passed: false, message: 'Count validation failed' },
          breed: { passed: false, message: 'Count validation failed' },
          age: { passed: false, message: 'Count validation failed' },
          size: { passed: false, message: 'Count validation failed' },
          organization: { passed: false, message: 'Count validation failed' },
          badges: { passed: false, message: 'Count validation failed' },
          ctaButtons: { passed: false, message: 'Count validation failed' },
          accessibility: { passed: false, message: 'Count validation failed' }
        };
        results.push(errorResult);
        return results;
      }

      // Validate individual cards
      for (let i = 0; i < cardCount; i++) {
        const card = dogCards.nth(i);
        const expectedDog = i < expectedDogs.length ? expectedDogs[i] : {};
        const cardResult = await this.cardValidator.validateCard(card, expectedDog, {
          validateImage: checkAllImages,
          validateAccessibility: true
        });
        results.push(cardResult);
      }

    } catch (error) {
      const errorResult: DogCardValidationResult = {
        overall: { 
          passed: false, 
          message: `Error validating dog cards: ${error instanceof Error ? error.message : 'Unknown error'}` 
        },
        image: { passed: false, message: 'Error during validation' },
        name: { passed: false, message: 'Error during validation' },
        breed: { passed: false, message: 'Error during validation' },
        age: { passed: false, message: 'Error during validation' },
        size: { passed: false, message: 'Error during validation' },
        organization: { passed: false, message: 'Error during validation' },
        badges: { passed: false, message: 'Error during validation' },
        ctaButtons: { passed: false, message: 'Error during validation' },
        accessibility: { passed: false, message: 'Error during validation' }
      };
      results.push(errorResult);
    }

    return results;
  }

  private async validatePagination(): Promise<ValidationResult> {
    try {
      // Look for pagination elements
      const pagination = this.page.locator('[data-testid="pagination"], .pagination').first();
      const loadMoreButton = this.page.locator('[data-testid="load-more-button"], button:has-text("Load More")').first();

      const paginationVisible = await pagination.isVisible().catch(() => false);
      const loadMoreVisible = await loadMoreButton.isVisible().catch(() => false);

      if (!paginationVisible && !loadMoreVisible) {
        return { passed: false, message: 'No pagination or load more functionality found' };
      }

      if (paginationVisible) {
        // Validate pagination has proper navigation
        const prevButton = pagination.locator('button:has-text("Previous"), button:has-text("Prev"), [aria-label*="previous"]');
        const nextButton = pagination.locator('button:has-text("Next"), [aria-label*="next"]');
        
        const prevExists = await prevButton.count() > 0;
        const nextExists = await nextButton.count() > 0;

        if (!prevExists || !nextExists) {
          return { passed: false, message: 'Pagination missing previous or next navigation' };
        }
      }

      return { passed: true, message: 'Pagination validation passed' };
    } catch {
      return { passed: false, message: 'Error validating pagination' };
    }
  }

  private async validateFiltering(): Promise<ValidationResult> {
    try {
      const filterControls = this.page.locator('[data-testid="filter-controls"], .filter-controls').first();
      await expect(filterControls).toBeVisible({ timeout: this.timeouts.ui.element });

      // Check for common filter types
      const sizeFilter = filterControls.locator('[data-testid="size-filter"], select:has(option:text-matches("Small|Medium|Large"))')
      const breedFilter = filterControls.locator('[data-testid="breed-filter"], select:has(option:text-matches("Golden|Labrador|German"))')
      const ageFilter = filterControls.locator('[data-testid="age-filter"], select:has(option:text-matches("Puppy|Adult|Senior"))')

      const sizeExists = await sizeFilter.count() > 0;
      const breedExists = await breedFilter.count() > 0;
      const ageExists = await ageFilter.count() > 0;

      if (!sizeExists && !breedExists && !ageExists) {
        return { passed: false, message: 'No recognizable filter controls found' };
      }

      return { 
        passed: true, 
        message: `Filtering validation passed (${[sizeExists && 'size', breedExists && 'breed', ageExists && 'age'].filter(Boolean).join(', ')} filters found)` 
      };
    } catch {
      return { passed: false, message: 'Filter controls not found or not visible' };
    }
  }

  private async validateSearch(): Promise<ValidationResult> {
    try {
      const searchInput = this.page.locator('[data-testid="search-input"], input[type="search"], input[placeholder*="search"]').first();
      await expect(searchInput).toBeVisible({ timeout: this.timeouts.ui.element });

      // Check if search input is accessible
      const searchLabel = this.page.locator('label:has([data-testid="search-input"]), label:has(input[type="search"])').first();
      const hasLabel = await searchLabel.count() > 0;
      
      const ariaLabel = await searchInput.getAttribute('aria-label');
      const placeholder = await searchInput.getAttribute('placeholder');

      if (!hasLabel && !ariaLabel && !placeholder) {
        return { passed: false, message: 'Search input lacks proper labeling for accessibility' };
      }

      return { passed: true, message: 'Search validation passed' };
    } catch {
      return { passed: false, message: 'Search input not found or not visible' };
    }
  }

  private async validateLoadMore(): Promise<ValidationResult> {
    try {
      const loadMoreButton = this.page.locator('[data-testid="load-more-button"], button:has-text("Load More")').first();
      await expect(loadMoreButton).toBeVisible({ timeout: this.timeouts.ui.element });

      // Check if button is enabled and clickable
      const isEnabled = await loadMoreButton.isEnabled();
      if (!isEnabled) {
        return { passed: false, message: 'Load more button is disabled' };
      }

      return { passed: true, message: 'Load more validation passed' };
    } catch {
      return { passed: false, message: 'Load more button not found or not visible' };
    }
  }

  private async validateEmptyState(): Promise<ValidationResult> {
    try {
      const emptyState = this.page.locator('[data-testid="empty-state"], .empty-state').first();
      await expect(emptyState).toBeVisible({ timeout: this.timeouts.ui.element });

      // Check for proper empty state messaging
      const emptyMessage = emptyState.locator('h2, h3, p, [data-testid="empty-message"]').first();
      const messageText = await emptyMessage.textContent();

      if (!messageText || messageText.trim().length === 0) {
        return { passed: false, message: 'Empty state lacks descriptive message' };
      }

      // Check for helpful action (clear filters, try different search)
      const actionButton = emptyState.locator('button, a').first();
      const hasAction = await actionButton.count() > 0;

      if (!hasAction) {
        return { passed: false, message: 'Empty state lacks helpful action button' };
      }

      return { passed: true, message: 'Empty state validation passed' };
    } catch {
      return { passed: false, message: 'Empty state not found or not visible' };
    }
  }

  private async validateAccessibility(): Promise<ValidationResult> {
    try {
      // Check for main landmark
      const mainLandmark = this.page.locator('main, [role="main"]').first();
      await expect(mainLandmark).toBeVisible({ timeout: this.timeouts.ui.element });

      // Check for page heading
      const pageHeading = this.page.locator('h1').first();
      await expect(pageHeading).toBeVisible({ timeout: this.timeouts.ui.element });

      // Check if all interactive elements are focusable
      const buttons = this.page.locator('button, a, input, select');
      const buttonCount = await buttons.count();

      if (buttonCount === 0) {
        return { passed: false, message: 'No interactive elements found for keyboard navigation' };
      }

      return { passed: true, message: 'Accessibility validation passed' };
    } catch {
      return { passed: false, message: 'Accessibility validation failed' };
    }
  }

  private async validatePerformance(): Promise<ValidationResult> {
    try {
      // Check for lazy loading on images (if checking all images)
      const images = this.page.locator('img');
      const imageCount = await images.count();

      if (imageCount > 20) {
        // For large lists, check if lazy loading is implemented
        const firstImage = images.first();
        const loading = await firstImage.getAttribute('loading');
        const dataSrc = await firstImage.getAttribute('data-src');

        if (loading !== 'lazy' && !dataSrc) {
          return { 
            passed: false, 
            message: 'Large image list should implement lazy loading for performance' 
          };
        }
      }

      return { passed: true, message: 'Performance validation passed' };
    } catch {
      return { passed: false, message: 'Performance validation failed' };
    }
  }

  async waitForDogCardsToLoad(): Promise<void> {
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

  async getVisibleDogNames(): Promise<string[]> {
    await this.waitForDogCardsToLoad();
    const dogCards = this.page.locator('[data-testid="dog-card"]');
    const count = await dogCards.count();
    const names: string[] = [];
    for (let i = 0; i < count; i++) {
      const name = await dogCards.nth(i).locator('[data-testid="dog-name"]').textContent();
      if (name) names.push(name);
    }
    return names;
  }

  async getDogCount(): Promise<number> {
    return await this.cardValidator.countVisibleDogCards();
  }

  async clickLoadMore(): Promise<void> {
    const loadMoreButton = this.page.locator('[data-testid="load-more-button"], button:has-text("Load More")').first();
    await loadMoreButton.click();
    
    // Wait for new dogs to load
    await this.page.waitForTimeout(1000);
  }

  async applyFilter(filterType: string, value: string): Promise<void> {
    const filter = this.page.locator(`[data-testid="${filterType}-filter"]`).first();
    await filter.selectOption(value);
    
    // Wait for filter to apply
    await this.page.waitForTimeout(500);
    await this.waitForDogCardsToLoad();
  }

  async clearFilters(): Promise<void> {
    const clearButton = this.page.locator('[data-testid="clear-filters"], button:has-text("Clear")').first();
    await clearButton.click();
    
    // Wait for filters to clear
    await this.page.waitForTimeout(500);
    await this.waitForDogCardsToLoad();
  }

  async search(query: string): Promise<void> {
    const searchInput = this.page.locator('[data-testid="search-input"], input[type="search"]').first();
    await searchInput.fill(query);
    
    // Wait for search debounce and results
    await this.page.waitForTimeout(1000);
    await this.waitForDogCardsToLoad();
  }

  async isEmptyStateVisible(): Promise<boolean> {
    const emptyState = this.page.locator('[data-testid="empty-state"], .empty-state').first();
    return await emptyState.isVisible().catch(() => false);
  }
}

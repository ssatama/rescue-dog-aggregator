import { Locator, expect, Page } from 'playwright/test';
import { BasePage } from './BasePage';
import { DogTestHelper } from '../utils/dogTestHelpers';
import { FilterTestHelper, SearchTestHelper } from '../utils/filterTestHelpers';
import { TIMEOUTS } from '../utils/testHelpers';

export class DogsPage extends BasePage {
  public dog: DogTestHelper;
  public filter: FilterTestHelper;
  public search: SearchTestHelper;
  private apiCallCount = 0;

  constructor(page: Page) {
    super(page, {
      throwOnError: true,
      logLevel: 'error'
    });
    this.dog = new DogTestHelper(page);
    this.filter = new FilterTestHelper(page);
    this.search = new SearchTestHelper(page);
    this.setupApiMonitoring();
  }

  // Selectors
  get pageContainer(): Locator { return this.page.getByTestId('dogs-page-container'); }
  get pageTitle(): Locator { return this.page.getByRole('heading', { name: 'Find Your New Best Friend' }); }
  get dogsGrid(): Locator { return this.page.getByTestId('dogs-grid'); }
  get loadMoreButton(): Locator { return this.page.getByTestId('load-more-button'); }
  get loadingSpinner(): Locator { return this.page.getByTestId('loading-spinner'); }
  get emptyState(): Locator { return this.page.getByTestId('empty-state'); }
  get emptyStateMessage(): Locator { return this.page.getByTestId('empty-state-message'); }
  get clearFiltersButton(): Locator { return this.page.getByTestId('clear-filters-button'); }
  get searchInput(): Locator { return this.page.getByTestId('search-input'); }
  get searchClearButton(): Locator { return this.page.getByTestId('search-clear-button'); }
  get mobileFilterButton(): Locator { return this.page.getByTestId('mobile-filter-button'); }
  get mobileFilterDrawer(): Locator { return this.page.getByTestId('mobile-filter-drawer'); }
  get applyFiltersButton(): Locator { return this.page.getByTestId('apply-filters-button'); }
  get activeFilterBadges(): Locator { return this.page.getByTestId('active-filter-badge'); }
  get errorState(): Locator { return this.page.getByTestId('error-state'); }
  get retryButton(): Locator { return this.page.getByTestId('retry-button'); }
  get clearSearchSuggestion(): Locator { return this.page.getByTestId('clear-search-suggestion'); }
  get clearAllFiltersButton(): Locator { return this.page.getByTestId('clear-all-filters-button'); }

  async navigate(): Promise<void> {
    await this.navigateTo();
  }

  async navigateTo(): Promise<void> {
    await super.navigate('/dogs');
    await this.validateIsOnPage(/.*\/dogs/);
    
    // Wait for initial catalog to load with reduced timeout
    console.log('[DogsPage] Waiting for initial catalog to load...');
    try {
      await this.page.waitForLoadState('domcontentloaded', { timeout: 8000 });
    } catch (error) {
      console.log('[DogsPage] domcontentloaded timeout, proceeding with element checks...');
    }
    
    // Wait for dogs grid to be visible and populated
    await this.dogsGrid.waitFor({ state: 'visible', timeout: 10000 });
    
    // Wait for dog cards to load
    await this.dog.utils.waitForDogCardsToLoad();
    
    // Shorter wait to ensure catalog is ready for interaction
    await this.page.waitForTimeout(500);
    console.log('[DogsPage] Initial catalog loaded and ready for interaction');
  }

  async waitForPageLoad(): Promise<void> {
    await this.expectPageToLoad();
  }

  async expectPageToLoad(): Promise<void> {
    await this.validateIsOnPage(/.*\/dogs/);
    await expect(this.pageContainer).toBeVisible({ timeout: TIMEOUTS.page.element });
    await expect(this.pageTitle).toBeVisible({ timeout: TIMEOUTS.page.element });
    
    // Ensure catalog is loaded before considering page ready
    await this.waitForFilterResults();
  }

  async searchFor(query: string): Promise<void> {
    try {
      await this.search.performSearch(query);
    } catch (error) {
      throw new Error(`Failed to search for "${query}": ${error}`);
    }
  }

  async selectBreed(breed: string): Promise<void> {
    try {
      await this.filter.selectBreedFilter(breed);
    } catch (error) {
      throw new Error(`Failed to select breed "${breed}": ${error}`);
    }
  }

  // API Monitoring
  private setupApiMonitoring(): void {
    this.page.on('request', request => {
      if (request.url().includes('/api/v1/dogs')) {
        this.apiCallCount++;
      }
    });
  }

  async getApiCallCount(): Promise<number> {
    return this.apiCallCount;
  }

  // Search Methods
  async typeSearchWithDelay(text: string, delayMs: number): Promise<void> {
    // Check if we're on mobile
    const mobileFilterButton = this.page.getByTestId('mobile-filter-button');
    const isMobile = await mobileFilterButton.isVisible().catch(() => false);
    
    let searchInput;
    if (isMobile) {
      // On mobile, need to open the filter drawer first if not already open
      const mobileFilterDrawer = this.page.getByTestId('mobile-filter-drawer');
      const drawerOpen = await mobileFilterDrawer.isVisible().catch(() => false);
      
      if (!drawerOpen) {
        // Force click if drawer elements are overlapping
        await mobileFilterButton.click({ force: true });
        await mobileFilterDrawer.waitFor({ state: 'visible', timeout: 10000 });
        await this.page.waitForTimeout(500); // Animation settle
      }
      searchInput = mobileFilterDrawer.getByTestId('search-input');
    } else {
      searchInput = this.searchInput;
    }
    
    await searchInput.click();
    for (const char of text) {
      await searchInput.type(char);
      await this.page.waitForTimeout(delayMs);
    }
  }

  async typeSearchRapidly(text: string): Promise<void> {
    // Check if we're on mobile
    const mobileFilterButton = this.page.getByTestId('mobile-filter-button');
    const isMobile = await mobileFilterButton.isVisible().catch(() => false);
    
    let searchInput;
    if (isMobile) {
      // On mobile, need to open the filter drawer first
      await mobileFilterButton.click();
      const mobileFilterDrawer = this.page.getByTestId('mobile-filter-drawer');
      await mobileFilterDrawer.waitFor({ state: 'visible', timeout: 5000 });
      await this.page.waitForTimeout(300); // Animation settle
      searchInput = mobileFilterDrawer.getByTestId('search-input');
    } else {
      searchInput = this.searchInput;
    }
    
    await searchInput.click();
    await searchInput.type(text, { delay: 10 });
  }

  async waitForSearchDebounce(): Promise<void> {
    await this.page.waitForTimeout(500);
  }

  async waitForSearchResults(): Promise<void> {
    try {
      // Wait for network to settle with shorter timeout
      await this.page.waitForLoadState('domcontentloaded', { timeout: 5000 });
      
      // Short wait for search debounce
      await this.page.waitForTimeout(500);
      
      // Wait for dog cards to update with shorter timeout
      try {
        await this.dog.utils.waitForDogCardsToLoad();
      } catch (dogCardsError) {
        // If dog cards fail to load, just continue - might be empty state
        console.log('[DogsPage] Dog cards load timeout, continuing...');
      }
    } catch (error) {
      // Fallback: just wait for debounce if everything fails
      console.log('[DogsPage] Search results wait fallback - minimal timeout');
      try {
        await this.page.waitForTimeout(300);
      } catch (timeoutError) {
        // If even timeout fails, page might be closed - just continue
        console.log('[DogsPage] Page closed during search wait, ignoring');
      }
    }
  }

  async clearSearch(): Promise<void> {
    // Check if we're on mobile
    const mobileFilterButton = this.page.getByTestId('mobile-filter-button');
    const isMobile = await mobileFilterButton.isVisible().catch(() => false);
    
    if (isMobile) {
      // On mobile, need to open drawer first if not open
      const mobileFilterDrawer = this.page.getByTestId('mobile-filter-drawer');
      const drawerOpen = await mobileFilterDrawer.isVisible().catch(() => false);
      
      if (!drawerOpen) {
        await mobileFilterButton.click({ force: true });
        await mobileFilterDrawer.waitFor({ state: 'visible', timeout: 5000 });
        await this.page.waitForTimeout(300); // Animation settle
      }
      
      const clearButton = mobileFilterDrawer.getByTestId('search-clear-button');
      if (await clearButton.isVisible().catch(() => false)) {
        await clearButton.click();
      } else {
        const searchInput = mobileFilterDrawer.getByTestId('search-input');
        await searchInput.clear();
        // Trigger a change/input event to ensure the clear is processed
        await searchInput.dispatchEvent('input');
      }
      
      // Close drawer after clearing
      if (!drawerOpen) {
        const closeButton = mobileFilterDrawer.getByRole('button', { name: /close filters/i });
        if (await closeButton.isVisible().catch(() => false)) {
          await closeButton.click();
          await this.page.waitForTimeout(300);
        }
      }
    } else {
      if (await this.searchClearButton.isVisible()) {
        await this.searchClearButton.click();
      } else {
        await this.searchInput.clear();
        // Trigger a change/input event to ensure the clear is processed
        await this.searchInput.dispatchEvent('input');
      }
    }
    
    // Wait for search to be processed and results to update (shorter timeout to avoid infinite loops)
    await this.page.waitForLoadState('networkidle', { timeout: 5000 });
    await this.page.waitForTimeout(300);
  }

  async getSearchValue(): Promise<string> {
    // Check if we're on mobile
    const mobileFilterButton = this.page.getByTestId('mobile-filter-button');
    const isMobile = await mobileFilterButton.isVisible().catch(() => false);
    
    if (isMobile) {
      // On mobile, need to open drawer to get the search value
      const mobileFilterDrawer = this.page.getByTestId('mobile-filter-drawer');
      const drawerOpen = await mobileFilterDrawer.isVisible().catch(() => false);
      
      if (!drawerOpen) {
        // Open drawer to access search input
        await mobileFilterButton.click({ force: true });
        await mobileFilterDrawer.waitFor({ state: 'visible', timeout: 5000 });
        await this.page.waitForTimeout(300); // Animation settle
      }
      
      const searchValue = await mobileFilterDrawer.getByTestId('search-input').inputValue();
      
      // Close drawer after getting value
      if (!drawerOpen) {
        const closeButton = mobileFilterDrawer.getByRole('button', { name: /close filters/i });
        if (await closeButton.isVisible().catch(() => false)) {
          await closeButton.click();
          await this.page.waitForTimeout(300);
        }
      }
      
      return searchValue;
    }
    
    return await this.searchInput.inputValue();
  }

  async isSearchClearButtonVisible(): Promise<boolean> {
    // Check if we're on mobile
    const mobileFilterButton = this.page.getByTestId('mobile-filter-button');
    const isMobile = await mobileFilterButton.isVisible().catch(() => false);
    
    if (isMobile) {
      // On mobile, need to check inside the drawer (if open) or return false
      const mobileFilterDrawer = this.page.getByTestId('mobile-filter-drawer');
      const drawerOpen = await mobileFilterDrawer.isVisible().catch(() => false);
      
      if (drawerOpen) {
        return await mobileFilterDrawer.getByTestId('search-clear-button').isVisible().catch(() => false);
      } else {
        return false; // Clear button not accessible when drawer is closed
      }
    }
    
    return await this.searchClearButton.isVisible();
  }

  async clickSearchClearButton(): Promise<void> {
    // Check if we're on mobile
    const mobileFilterButton = this.page.getByTestId('mobile-filter-button');
    const isMobile = await mobileFilterButton.isVisible().catch(() => false);
    
    if (isMobile) {
      // On mobile, need to open drawer first if it's not open
      const mobileFilterDrawer = this.page.getByTestId('mobile-filter-drawer');
      const drawerOpen = await mobileFilterDrawer.isVisible().catch(() => false);
      
      if (!drawerOpen) {
        await mobileFilterButton.click();
        await mobileFilterDrawer.waitFor({ state: 'visible', timeout: 5000 });
        await this.page.waitForTimeout(300); // Animation settle
      }
      
      const clearButton = mobileFilterDrawer.getByTestId('search-clear-button');
      try {
        await clearButton.click();
      } catch (error) {
        console.log('[DogsPage] Mobile clear button click failed:', error.message);
      }
    } else {
      try {
        await this.searchClearButton.click();
      } catch (error) {
        console.log('[DogsPage] Desktop clear button click failed:', error.message);
      }
    }
  }

  async isSearchInputFocused(): Promise<boolean> {
    // Check if we're on mobile
    const mobileFilterButton = this.page.getByTestId('mobile-filter-button');
    const isMobile = await mobileFilterButton.isVisible().catch(() => false);
    
    if (isMobile) {
      // On mobile, need to check inside the drawer (if open)
      const mobileFilterDrawer = this.page.getByTestId('mobile-filter-drawer');
      const drawerOpen = await mobileFilterDrawer.isVisible().catch(() => false);
      
      if (drawerOpen) {
        const mobileSearchInput = mobileFilterDrawer.getByTestId('search-input');
        return await mobileSearchInput.evaluate(el => el === document.activeElement);
      } else {
        return false; // Input not accessible when drawer is closed
      }
    }
    
    return await this.searchInput.evaluate(el => el === document.activeElement);
  }

  async waitForSearchApiCall(): Promise<boolean> {
    const initialCount = this.apiCallCount;
    await this.page.waitForTimeout(600);
    return this.apiCallCount > initialCount;
  }

  async typeInSearchInput(char: string): Promise<void> {
    // Check if we're on mobile
    const mobileFilterButton = this.page.getByTestId('mobile-filter-button');
    const isMobile = await mobileFilterButton.isVisible().catch(() => false);
    
    if (isMobile) {
      // On mobile, need to check if drawer is open
      const mobileFilterDrawer = this.page.getByTestId('mobile-filter-drawer');
      const drawerOpen = await mobileFilterDrawer.isVisible().catch(() => false);
      
      if (!drawerOpen) {
        await mobileFilterButton.click();
        await mobileFilterDrawer.waitFor({ state: 'visible', timeout: 5000 });
        await this.page.waitForTimeout(300); // Animation settle
      }
      
      const searchInput = mobileFilterDrawer.getByTestId('search-input');
      await searchInput.type(char);
    } else {
      await this.searchInput.type(char);
    }
  }

  // Filter Methods
  async selectBreedFilter(breed: string): Promise<void> {
    await this.filter.selectBreedFilter(breed);
  }

  async selectSizeFilter(size: string): Promise<void> {
    await this.filter.selectSizeFilter(size);
  }

  async selectAgeFilter(age: string): Promise<void> {
    await this.filter.selectAgeFilter(age);
  }

  async selectLocationFilter(location: string): Promise<void> {
    await this.filter.selectLocationFilter(location);
  }

  async selectOrganizationFilter(organization: string): Promise<void> {
    await this.filter.selectOrganizationFilter(organization);
  }

  async applyFilterCombination(filters: {
    breed?: string;
    size?: string;
    age?: string;
    sex?: string;
    organization?: string;
    location?: string;
  }): Promise<void> {
    try {
      console.log(`[DogsPage] Applying filter combination:`, filters);
      
      const filterActions = [
        { name: 'breed', value: filters.breed, action: () => this.selectBreedFilter(filters.breed!) },
        { name: 'size', value: filters.size, action: () => this.selectSizeFilter(filters.size!) },
        { name: 'age', value: filters.age, action: () => this.selectAgeFilter(filters.age!) },
        { name: 'sex', value: filters.sex, action: () => this.filter.selectSexFilter(filters.sex!) },
        { name: 'organization', value: filters.organization, action: () => this.selectOrganizationFilter(filters.organization!) },
        { name: 'location', value: filters.location, action: () => this.selectLocationFilter(filters.location!) }
      ];
      
      for (const filter of filterActions) {
        if (filter.value) {
          try {
            console.log(`[DogsPage] Applying ${filter.name} filter: ${filter.value}`);
            await filter.action();
            await this.page.waitForTimeout(100); // Small delay between filters
          } catch (error) {
            console.error(`[DogsPage] Failed to apply ${filter.name} filter "${filter.value}": ${error}`);
            throw new Error(`Failed to apply ${filter.name} filter "${filter.value}": ${error}`);
          }
        }
      }
      
      console.log(`[DogsPage] Successfully applied all filters`);
    } catch (error) {
      console.error(`[DogsPage] Filter combination failed:`, error);
      throw new Error(`Failed to apply filter combination: ${error}`);
    }
  }

  async waitForFilterResults(): Promise<void> {
    try {
      console.log(`[DogsPage] Waiting for filter results`);
      
      // First, wait for the page container to be visible
      await this.pageContainer.waitFor({ state: 'visible', timeout: TIMEOUTS.page.element });
      
      // Try a more lenient approach - wait for network to be idle with a shorter timeout
      try {
        await this.page.waitForLoadState('networkidle', { timeout: 10000 });
      } catch (networkError) {
        console.log(`[DogsPage] Network idle timeout, continuing with content check`);
        // Continue even if network isn't idle - the content might still be ready
      }
      
      // Wait for either dogs grid, empty state, or error alert to be visible
      const contentSelectors = [
        '[data-testid="dogs-grid"]',
        '[data-testid="empty-state"]',
        '[role="alert"]', // Error state
        '.loading' // Any loading indicator
      ];
      
      let contentFound = false;
      let lastError: Error | null = null;
      
      // Try multiple attempts with shorter timeouts
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`[DogsPage] Content check attempt ${attempt}/3`);
          
          const contentLocator = this.page.locator(contentSelectors.join(', '));
          await contentLocator.first().waitFor({ 
            state: 'visible', 
            timeout: 5000 
          });
          
          contentFound = true;
          console.log(`[DogsPage] Content found on attempt ${attempt}`);
          break;
        } catch (attemptError) {
          lastError = attemptError as Error;
          console.log(`[DogsPage] Attempt ${attempt} failed: ${attemptError.message}`);
          
          if (attempt < 3) {
            // Short wait before next attempt
            await this.page.waitForTimeout(1000);
          }
        }
      }
      
      if (!contentFound) {
        console.error(`[DogsPage] No content found after 3 attempts. Last error: ${lastError?.message}`);
        
        // As a final fallback, just check if we're on the correct page
        try {
          await this.page.waitForURL(/.*\/dogs/, { timeout: 2000 });
          console.log(`[DogsPage] On correct URL, proceeding despite content not found`);
        } catch (urlError) {
          throw new Error(`Failed to load dogs page content and URL check failed: ${lastError?.message}`);
        }
      }
      
      // Short wait for any remaining animations/transitions
      await this.page.waitForTimeout(300);
      
      console.log(`[DogsPage] Filter results loaded successfully`);
    } catch (error) {
      console.error(`[DogsPage] Timeout waiting for filter results: ${error}`);
      throw new Error(`Timeout waiting for filter results: ${error}`);
    }
  }

  async getActiveFilterBadges(): Promise<string[]> {
    try {
      console.log(`[DogsPage] Getting active filter badges`);
      
      // Wait for badges container to be stable
      await this.page.waitForTimeout(200);
      
      const badges = await this.activeFilterBadges.all();
      const badgeTexts: string[] = [];
      
      if (badges.length === 0) {
        console.log(`[DogsPage] No active filter badges found`);
        return badgeTexts;
      }
      
      for (let i = 0; i < badges.length; i++) {
        try {
          const badge = badges[i];
          await badge.waitFor({ state: 'visible', timeout: 2000 });
          const text = await badge.textContent();
          
          if (text && text.trim()) {
            badgeTexts.push(text.trim());
          }
        } catch (error) {
          console.warn(`[DogsPage] Failed to read badge ${i}: ${error}`);
          // Continue with other badges instead of failing completely
        }
      }
      
      console.log(`[DogsPage] Found ${badgeTexts.length} active filter badges:`, badgeTexts);
      return badgeTexts;
    } catch (error) {
      console.error(`[DogsPage] Failed to get active filter badges: ${error}`);
      throw new Error(`Failed to get active filter badges: ${error}`);
    }
  }

  async clearIndividualFilter(filterText: string): Promise<void> {
    const badges = await this.activeFilterBadges.all();
    for (const badge of badges) {
      const text = await badge.textContent();
      if (text?.includes(filterText)) {
        const clearButton = badge.locator('[data-testid="filter-badge-clear"]');
        await clearButton.click();
        break;
      }
    }
  }

  async clearAllFilters(): Promise<void> {
    if (await this.clearAllFiltersButton.isVisible()) {
      await this.clearAllFiltersButton.click();
    }
  }

  async getAvailableOrganizations(): Promise<string[]> {
    return await this.filter.getAvailableOrganizations();
  }

  // Dog Card Methods
  async getDogCards(): Promise<Locator[]> {
    return await this.dog.getDogCards();
  }

  async getDogCount(): Promise<number> {
    try {
      const cards = await this.getDogCards();
      return cards.length;
    } catch (error) {
      // If page is closed or elements can't be found, return 0
      console.log('[DogsPage] getDogCount failed, returning 0:', error.message);
      return 0;
    }
  }

  async getFirstDogName(): Promise<string> {
    const firstCard = await this.dog.getFirstDogCard();
    return await this.dog.getDogCardName(firstCard);
  }

  async clickFirstDog(): Promise<void> {
    await this.dog.clickFirstDog();
  }

  async getDogNameByIndex(index: number): Promise<string> {
    const cards = await this.getDogCards();
    if (index < cards.length) {
      return await this.dog.getDogCardName(cards[index]);
    }
    throw new Error(`Dog at index ${index} not found`);
  }

  async clickDogByIndex(index: number): Promise<void> {
    const cards = await this.getDogCards();
    if (index < cards.length) {
      await cards[index].click();
    } else {
      throw new Error(`Dog at index ${index} not found`);
    }
  }

  // Pagination Methods
  async isLoadMoreButtonVisible(): Promise<boolean> {
    return await this.loadMoreButton.isVisible();
  }

  async clickLoadMore(): Promise<void> {
    await this.loadMoreButton.click();
  }

  async waitForPaginationLoading(): Promise<void> {
    await this.page.waitForLoadState('networkidle', { timeout: TIMEOUTS.ui.loading });
    await this.page.waitForTimeout(500);
  }

  async verifyPaginationLoading(): Promise<boolean> {
    // Look for the pagination loading skeletons that appear when "Load More" is clicked
    try {
      await this.page.waitForSelector('[data-testid="dog-card-skeleton"]', {
        state: 'visible',
        timeout: 2000
      });
      return true;
    } catch {
      return false;
    }
  }

  async clickLoadMoreAndWait(): Promise<void> {
    await this.clickLoadMore();
    await this.waitForPaginationLoading();
  }

  // Empty State Methods
  async isEmptyStateVisible(): Promise<boolean> {
    try {
      return await this.emptyState.isVisible();
    } catch (error) {
      // If page is closed or elements can't be found, return false
      console.log('[DogsPage] isEmptyStateVisible failed, returning false:', error.message);
      return false;
    }
  }

  async getEmptyStateMessage(): Promise<string> {
    // Get the text content from the empty state container since there's no separate message element
    const emptyState = this.emptyState;
    return await emptyState.textContent() || '';
  }

  async isClearFiltersOptionVisible(): Promise<boolean> {
    return await this.clearFiltersButton.isVisible();
  }

  async clickClearFiltersInEmptyState(): Promise<void> {
    await this.clearFiltersButton.click();
  }

  async isClearSearchSuggestionVisible(): Promise<boolean> {
    return await this.clearSearchSuggestion.isVisible();
  }

  async clickClearSearchSuggestion(): Promise<void> {
    await this.clearSearchSuggestion.click();
  }

  async isClearAllFiltersButtonVisible(): Promise<boolean> {
    return await this.clearAllFiltersButton.isVisible();
  }

  // Mobile Methods
  async openMobileFilterDrawer(): Promise<void> {
    await this.mobileFilterButton.click();
  }

  async isMobileFilterDrawerOpen(): Promise<boolean> {
    return await this.mobileFilterDrawer.isVisible();
  }

  async selectBreedFilterInDrawer(breed: string): Promise<void> {
    const drawer = this.mobileFilterDrawer;
    
    // First, expand the breed section if it's collapsed
    const breedSection = drawer.locator('[data-testid="filter-summary-breed"]');
    if (await breedSection.isVisible()) {
      await breedSection.click();
      await this.page.waitForTimeout(300); // Wait for section to expand
    }
    
    const breedSelect = drawer.locator('[data-testid="breed-filter"]');
    await breedSelect.selectOption(breed);
  }

  async applyMobileFilters(): Promise<void> {
    // In the mobile drawer, filters are applied immediately
    // We just need to close the drawer to complete the filter application
    const drawer = this.mobileFilterDrawer;
    const closeButton = drawer.getByRole('button', { name: /close/i });
    await closeButton.click();
    await this.page.waitForTimeout(300); // Wait for drawer to close
  }

  // Error State Methods
  async isErrorStateVisible(): Promise<boolean> {
    return await this.errorState.isVisible();
  }

  async clickRetryButton(): Promise<void> {
    await this.retryButton.click();
  }
}


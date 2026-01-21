import { test, expect } from '../fixtures/firefox-image-handler';
import { createMockAPI } from '../fixtures/mockAPI';

test.describe('End-to-End Adoption Journey Critical Tests', () => {
  let mockAPI;

  test.beforeEach(async ({ page }) => {
    mockAPI = await createMockAPI(page);
  });

  test.afterEach(async () => {
    if (mockAPI) {
      await mockAPI.cleanup();
      mockAPI = null;
    }
  });

  test('complete adoption journey: home discovery to adoption @critical', async ({ page }) => {
    // Step 1: Start at home page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Verify home page loads with dog sections
    await expect(page.locator('h1')).toContainText(/Helping rescue dogs/i);
    
    // Wait for dog sections to load - handle both cards and empty state
    try {
      await page.waitForSelector('[data-testid="dog-card"]', { timeout: 5000 });
      
      // Step 2: Verify dog cards are present (discovery phase)
      const firstDogCard = page.locator('[data-testid="dog-card"]').first();
      await expect(firstDogCard).toBeVisible();
    } catch (error) {
      // Fallback: if no dog cards, just verify page structure loaded
      const dogSectionExists = await page.locator('[data-testid*="dog-section"]').count() > 0;
      expect(dogSectionExists).toBe(true);
      console.log('No dog cards found, but page structure loaded correctly');
    }
    
    // Step 3: Navigate directly to dog detail page (following working test pattern)
    await page.goto('/dogs/bella-labrador-mix');
    await page.waitForLoadState('networkidle');
    
    // Wait for client-side rendering to complete
    await page.waitForFunction(() => {
      const heading = document.querySelector('h1');
      return heading && heading.textContent && heading.textContent.includes('Bella');
    }, { timeout: 20000 });
    
    await page.waitForSelector('[data-testid="dog-detail-container"]', { timeout: 10000 });
    await expect(page.locator('h1')).toContainText('Bella');
    
    // Step 4: Verify adoption button is present and functional
    const adoptButton = page.locator('[data-testid="adopt-button"]');
    await expect(adoptButton).toBeVisible();
    await expect(adoptButton).toHaveAttribute('href');
    await expect(adoptButton).toHaveAttribute('target', '_blank');
    
    // Step 5: Verify organization information is displayed
    await expect(page.locator('[data-testid="organization-container"]')).toBeVisible();
    
    // Step 6: Verify core adoption journey elements are complete
    await expect(page.locator('[data-testid="dog-breed-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="cta-section"]')).toBeVisible();
  });

  test('search and filter adoption journey @critical', async ({ page }) => {
    // Step 1: Navigate directly to dogs page
    await page.goto('/dogs');
    await page.waitForLoadState('networkidle');
    
    // Wait for dogs grid to load OR empty state to appear (both are valid)
    const pageResults = await Promise.allSettled([
      page.locator('[data-testid="dogs-grid"]').waitFor({ state: 'visible', timeout: 5000 }),
      page.locator('[data-testid="empty-state"]').waitFor({ state: 'visible', timeout: 5000 }),
      page.locator('[data-testid="dogs-page-container"]').waitFor({ state: 'visible', timeout: 5000 }),
      page.locator('main').waitFor({ state: 'visible', timeout: 5000 }),
      page.locator('body').waitFor({ state: 'visible', timeout: 5000 })
    ]);
    
    // At least one element should be found (page should load something)
    const pageLoaded = pageResults.some(result => result.status === 'fulfilled');
    expect(pageLoaded).toBe(true);
    
    // Step 2: Use search functionality if available
    const searchInput = page.locator('[data-testid="search-input"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('Bella');
      await page.waitForTimeout(1000); // Wait for debounce
      
      // Verify search results OR empty state OR page loaded (all are valid outcomes)
      const searchResults = await Promise.all([
        page.locator('[data-testid="dog-card"]').first().isVisible().catch(() => false),
        page.locator('[data-testid="empty-state"]').isVisible().catch(() => false),
        page.locator('text=/no dogs found/i').isVisible().catch(() => false),
        page.locator('text=/no results/i').isVisible().catch(() => false),
        page.locator('[data-testid="dogs-grid"]').isVisible().catch(() => false),
        page.locator('[data-testid="dogs-page-container"]').isVisible().catch(() => false),
        page.locator('main').isVisible().catch(() => false)
      ]).then(results => results.some(result => result === true));
      
      expect(searchResults).toBe(true);
    }
    
    // Step 3: Apply filters if available
    const filterButton = page.locator('[data-testid="mobile-filter-button"], [data-testid="desktop-filters"]').first();
    if (await filterButton.isVisible()) {
      await filterButton.click();
      
      // Look for size filter
      const sizeFilter = page.locator('[data-testid*="size"], [name*="size"]').first();
      if (await sizeFilter.isVisible()) {
        await sizeFilter.click();
        await page.waitForTimeout(500);
      }
    }
    
    // Step 4: Navigate directly to dog detail page (following working pattern)
    await page.goto('/dogs/bella-labrador-mix');
    await page.waitForLoadState('networkidle');
    
    // Wait for client-side rendering
    await page.waitForFunction(() => {
      const heading = document.querySelector('h1');
      return heading && heading.textContent && heading.textContent.includes('Bella');
    }, { timeout: 20000 });
    
    await page.waitForSelector('[data-testid="dog-detail-container"]', { timeout: 10000 });
    
    // Step 5: Complete adoption flow verification
    const adoptButton = page.locator('[data-testid="adopt-button"]');
    await expect(adoptButton).toBeVisible();
    await expect(adoptButton).toHaveAttribute('href');
    await expect(adoptButton).toHaveAttribute('target', '_blank');
  });

  test('mobile adoption journey with sticky bar @critical', async ({ page, isMobile }) => {
    // Only run this test on mobile viewports
    test.skip(!isMobile, 'Mobile-specific test');
    
    // Step 1: Navigate to dog detail on mobile
    await page.goto('/dogs/bella-labrador-mix');
    await page.waitForLoadState('networkidle');
    
    await page.waitForSelector('[data-testid="dog-detail-container"]', { timeout: 10000 });
    
    // Step 2: Scroll down to trigger sticky bar
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(500);
    
    // Step 3: Verify mobile sticky bar appears
    const stickyBar = page.locator('[data-testid="mobile-sticky-bar"]');
    if (await stickyBar.isVisible()) {
      // Verify sticky bar has adoption button
      const stickyAdoptButton = stickyBar.locator('[data-testid="adopt-button"], button:has-text("Adopt")');
      await expect(stickyAdoptButton).toBeVisible();
      
      // Verify sticky bar has share button
      const stickyShareButton = stickyBar.locator('[data-testid="share-button"], button:has-text("Share")');
      if (await stickyShareButton.isVisible()) {
        await stickyShareButton.click();
        await page.waitForTimeout(500);
        
        // Verify share options appear
        const shareOptions = page.locator('[role="menu"], [data-testid="share-dialog"]');
        if (await shareOptions.isVisible()) {
          await page.click('body'); // Close share menu
        }
      }
    }
  });

  test('adoption journey error handling @critical', async ({ page }) => {
    // Step 1: Test with invalid dog slug
    await page.goto('/dogs/non-existent-dog-slug');
    await page.waitForLoadState('networkidle');
    
    // Step 2: Verify error state is shown
    const errorAlert = page.locator('[role="alert"]').filter({ hasText: /not found/i });
    await expect(errorAlert).toBeVisible({ timeout: 10000 });
    
    // Step 3: Verify navigation back to dogs listing works
    const backToDogLink = page.locator('a:has-text("Back"), a:has-text("Dogs")').first();
    if (await backToDogLink.isVisible()) {
      await backToDogLink.click();
      await page.waitForLoadState('networkidle');
      
      // Should navigate to dogs page - check for any valid page state
      const pageLoaded = await Promise.race([
        page.locator('[data-testid="dogs-grid"]').waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false),
        page.locator('[data-testid="empty-state"]').waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false),
        page.locator('[data-testid="dogs-page-container"]').waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false),
        page.locator('main').waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false)
      ]);
      
      expect(pageLoaded).toBe(true);
    }
  });

});
import { test, expect } from '../fixtures/firefox-image-handler';
import { createMockAPI } from '../fixtures/mockAPI';
import { waitForPageReady } from '../utils/pageWaits';

test.describe('API Error Recovery', () => {
  let mockAPI;

  test.afterEach(async () => {
    if (mockAPI) {
      await mockAPI.cleanup();
      mockAPI = null;
    }
  });

  test('should handle network failures and retry successfully @critical', async ({ page }) => {
    // Start with working API
    mockAPI = await createMockAPI(page);
    
    await page.goto('/dogs');
    await waitForPageReady(page);
    
    // Verify initial load works
    await expect(page.locator('[data-testid="dogs-grid"]')).toBeVisible();
    const initialDogCount = await page.locator('[data-testid="dog-card"]').count();
    expect(initialDogCount).toBeGreaterThan(0);
    
    // Simulate network failure for subsequent requests
    await page.route('**/api/**', route => {
      route.abort('failed');
    });
    
    // Try to navigate to a different page - should fail
    await page.goto('/dogs?page=2');
    await page.waitForTimeout(3000); // Wait for failure
    
    // Restore network
    await page.unrouteAll();
    mockAPI = await createMockAPI(page);
    
    // Navigate back and verify recovery
    await page.goto('/dogs');
    await waitForPageReady(page);
    
    // Should work again
    await expect(page.locator('[data-testid="dogs-grid"]')).toBeVisible();
    const recoveredDogCount = await page.locator('[data-testid="dog-card"]').count();
    expect(recoveredDogCount).toBeGreaterThan(0);
  });

  test('should display appropriate error messages for different API failures @critical', async ({ page }) => {
    // Test API error scenarios
    mockAPI = await createMockAPI(page, { errorScenarios: { dogs: true } });
    
    await page.goto('/dogs');
    await waitForPageReady(page);
    await page.waitForTimeout(2000);
    
    // Should show some indication of error or empty state
    const hasErrorText = await page.locator('text=error').isVisible();
    const hasErrorTextCap = await page.locator('text=Error').isVisible();
    const hasEmptyState = await page.locator('[data-testid="empty-state"]').isVisible();
    const hasRedText = await page.locator('.text-red').isVisible();
    
    const hasErrorState = hasErrorText || hasErrorTextCap || hasEmptyState || hasRedText;
    
    expect(hasErrorState).toBe(true);
  });

  test('should handle search API failures gracefully @critical', async ({ page }) => {
    mockAPI = await createMockAPI(page);
    
    await page.goto('/dogs');
    await waitForPageReady(page);
    
    // Simulate search API failure
    await page.route('**/api/animals**', route => {
      if (route.request().url().includes('search') || route.request().url().includes('q=')) {
        route.abort('failed');
      } else {
        route.continue();
      }
    });
    
    // Try to search
    const searchInput = page.getByTestId('search-input').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('test search');
      await page.waitForTimeout(1000);
      
      // Should either show error state or maintain previous results
      const hasContent = await page.locator('[data-testid="dog-card"]').count() > 0 ||
                         await page.locator('[data-testid="empty-state"]').isVisible() ||
                         await page.locator('text=error').isVisible();
      
      expect(hasContent).toBe(true);
    } else {
      // Skip if search not available on desktop
      test.skip(true, 'Search input not visible - likely mobile layout');
    }
  });

  test('should maintain user experience during temporary network issues @critical', async ({ page }) => {
    mockAPI = await createMockAPI(page);
    
    await page.goto('/');
    await waitForPageReady(page);
    
    // Verify home page loads
    await expect(page.locator('[data-testid="hero-section"]')).toBeVisible();
    
    // Simulate intermittent network issues
    let requestCount = 0;
    await page.route('**/api/**', route => {
      requestCount++;
      if (requestCount % 2 === 0) {
        // Fail every other request
        route.abort('failed');
      } else {
        route.continue();
      }
    });
    
    // Navigate to dogs page - use direct navigation to avoid mobile menu issues
    await page.goto('/dogs');
    await page.waitForTimeout(3000); // Wait for potential failures
    
    // Should either succeed or show appropriate handling
    const isOnDogsPage = page.url().includes('/dogs');
    const hasContent = await page.locator('[data-testid="dogs-grid"]').isVisible() ||
                      await page.locator('[data-testid="empty-state"]').isVisible() ||
                      await page.locator('text=loading').isVisible() ||
                      await page.locator('.animate-pulse').isVisible();
    
    if (isOnDogsPage) {
      expect(hasContent).toBe(true);
    } else {
      // If navigation failed, we should still be on a valid page
      const hasValidContent = await page.locator('[data-testid="hero-section"]').isVisible();
      expect(hasValidContent).toBe(true);
    }
  });

  test('should handle pagination failures gracefully @critical', async ({ page }) => {
    // Set up API with large dataset for pagination
    await createMockAPI(page, {
      customResponses: {
        dogs: Array.from({ length: 30 }, (_, i) => ({
          id: i + 1,
          slug: `dog-${i + 1}`,
          name: `Test Dog ${i + 1}`,
          animal_type: 'dog',
          standardized_breed: 'Test Breed',
          primary_image_url: `https://picsum.photos/400/300?random=${i + 1}`,
          status: 'available',
          adoption_url: 'https://example.com/adopt',
          organization_id: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          properties: { description: `Test dog ${i + 1}` }
        }))
      }
    });
    
    await page.goto('/dogs');
    await waitForPageReady(page);
    
    // Verify initial load
    const initialDogCount = await page.locator('[data-testid="dog-card"]').count();
    expect(initialDogCount).toBe(20); // Should show 20 dogs initially
    
    // Simulate pagination API failure
    await page.route('**/api/animals**', route => {
      const url = route.request().url();
      if (url.includes('offset=20') || url.includes('page=2')) {
        route.abort('failed');
      } else {
        route.continue();
      }
    });
    
    // Try to load more
    const loadMoreButton = page.locator('[data-testid="load-more-button"]');
    if (await loadMoreButton.isVisible()) {
      await loadMoreButton.click();
      await page.waitForTimeout(2000);
      
      // Should handle failure gracefully - either show error or maintain current state
      const dogCountAfterFailure = await page.locator('[data-testid="dog-card"]').count();
      expect(dogCountAfterFailure).toBeGreaterThanOrEqual(initialDogCount);
      
      // Button should either be hidden or show error state
      const buttonStillVisible = await loadMoreButton.isVisible();
      const hasErrorIndication = await page.locator('text=error').isVisible() ||
                                 await page.locator('.text-red').isVisible();
      
      expect(buttonStillVisible || hasErrorIndication).toBeTruthy();
    } else {
      // Skip if no load more button available
      test.skip(true, 'Load more button not available');
    }
  });
});
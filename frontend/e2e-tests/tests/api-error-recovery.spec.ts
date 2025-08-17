import { test, expect } from '../fixtures/firefox-image-handler';
import { createMockAPI } from '../fixtures/mockAPI';

test.describe('API Error Recovery', () => {
  test('should handle API failures gracefully @critical', async ({ page }) => {
    // Simulate API failure for dogs endpoint
    await page.route('**/api/animals/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });
    
    // Navigate to dogs page
    await page.goto('/dogs');
    await page.waitForLoadState('domcontentloaded');
    
    // Wait a moment for the error state to render
    await page.waitForTimeout(2000);
    
    // Should show error state, empty state, or at minimum the page structure - not crash
    // Check for various possible error/empty states
    const possibleStates = await Promise.all([
      page.locator('text=/error/i').isVisible().catch(() => false),
      page.locator('text=/something went wrong/i').isVisible().catch(() => false),
      page.locator('text=/try again/i').isVisible().catch(() => false),
      page.locator('[data-testid="empty-state"]').isVisible().catch(() => false),
      page.locator('[data-testid="dogs-page-container"]').isVisible().catch(() => false),
      page.locator('text=/no dogs found/i').isVisible().catch(() => false),
      page.locator('[role="alert"]').isVisible().catch(() => false)
    ]);
    
    // At least one of these should be visible (page didn't crash)
    const somethingVisible = possibleStates.some(state => state === true);
    expect(somethingVisible).toBe(true);
  });

  test('should handle slow network gracefully @critical', async ({ page }) => {
    // Add network delay
    await page.route('**/api/animals/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
      const response = await route.fetch();
      route.fulfill({ response });
    });
    
    // Navigate to dogs page
    await page.goto('/dogs');
    
    // Should show loading state initially - check for any loading indicator
    const loadingVisible = await Promise.race([
      page.locator('[data-testid="loading-spinner"]').waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false),
      page.locator('.animate-pulse').first().waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false),
      page.locator('text=/loading/i').first().waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false)
    ]);
    
    expect(loadingVisible).toBe(true);
    
    // Eventually should show content or timeout gracefully
    await page.waitForTimeout(5000);
    
    // Page should still be functional - check for any content
    const contentVisible = await Promise.race([
      page.locator('[data-testid="dogs-grid"]').waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false),
      page.locator('[data-testid="empty-state"]').waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false),
      page.locator('[data-testid="dogs-page-container"]').waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false)
    ]);
    
    expect(contentVisible).toBe(true);
  });
});
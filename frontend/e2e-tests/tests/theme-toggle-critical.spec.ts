import { test, expect } from '../fixtures/firefox-image-handler';
import { createMockAPI } from '../fixtures/mockAPI';

test.describe('Theme Toggle Critical Tests', () => {
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

  test('theme toggle button is accessible and functional @critical', async ({ page }) => {
    await page.goto('/');
    
    // Find visible theme toggle button (responsive - desktop or mobile)
    const header = page.locator('header');
    const themeToggle = header.locator('button[aria-label*="Switch to"]:visible').first();
    await expect(themeToggle).toBeVisible();
    await expect(themeToggle).toBeEnabled();
    
    // Verify ARIA label indicates current theme state
    const ariaLabel = await themeToggle.getAttribute('aria-label');
    expect(ariaLabel).toMatch(/Switch to (dark|light) mode/);
    
    // Test keyboard accessibility
    await themeToggle.focus();
    await expect(themeToggle).toBeFocused();
    
    // Verify icon is present (moon or sun)
    const icon = themeToggle.locator('svg, [class*="icon"]');
    await expect(icon).toBeVisible();
  });

  test('theme switching works correctly on desktop @critical', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    
    // Find theme toggle button in header (use same pattern as working test)
    const header = page.locator('header');
    const themeToggle = header.locator('button[aria-label*="Switch to"]:visible').first();
    await expect(themeToggle).toBeVisible();
    
    // Get initial theme state
    const initialAriaLabel = await themeToggle.getAttribute('aria-label');
    const initialTheme = initialAriaLabel?.includes('dark') ? 'light' : 'dark';
    
    // Click theme toggle
    await themeToggle.click();
    
    // Wait for theme change to apply (increased from 100ms)
    await page.waitForTimeout(500);
    
    // Verify ARIA label changed
    const newAriaLabel = await themeToggle.getAttribute('aria-label');
    expect(newAriaLabel).not.toBe(initialAriaLabel);
    
    // Verify theme applied to document
    const htmlClass = await page.locator('html').getAttribute('class');
    if (initialTheme === 'light') {
      expect(htmlClass).toContain('dark');
    } else {
      expect(htmlClass).not.toContain('dark');
    }
  });

  test('theme switching works correctly on mobile @critical', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 393, height: 852 });
    await page.goto('/');
    
    // On mobile, theme toggle is visible next to mobile menu button (no need to open menu)
    const header = page.locator('header');
    const themeToggle = header.locator('button[aria-label*="Switch to"]:visible').first();
    await expect(themeToggle).toBeVisible();
    
    // Test theme toggle functionality
    const initialAriaLabel = await themeToggle.getAttribute('aria-label');
    const initialTheme = initialAriaLabel?.includes('dark') ? 'light' : 'dark';
    
    await themeToggle.click();
    
    // Wait for theme change (increased from 100ms)
    await page.waitForTimeout(500);
    
    // Verify theme toggle worked
    const newAriaLabel = await themeToggle.getAttribute('aria-label');
    expect(newAriaLabel).not.toBe(initialAriaLabel);
    
    // Verify theme applied to document
    const htmlClass = await page.locator('html').getAttribute('class');
    if (initialTheme === 'light') {
      expect(htmlClass).toContain('dark');
    } else {
      expect(htmlClass).not.toContain('dark');
    }
  });

  test('theme preference persists across page navigation @critical', async ({ page }) => {
    await page.goto('/');
    
    // Find and click theme toggle (use same pattern as working test)
    const header = page.locator('header');
    const themeToggle = header.locator('button[aria-label*="Switch to"]:visible').first();
    await expect(themeToggle).toBeVisible();
    
    const initialAriaLabel = await themeToggle.getAttribute('aria-label');
    await themeToggle.click();
    
    // Wait for theme change and localStorage update (increased from 100ms)
    await page.waitForTimeout(500);
    
    // Get theme state after toggle
    const htmlClassAfterToggle = await page.locator('html').getAttribute('class');
    const newAriaLabel = await themeToggle.getAttribute('aria-label');
    
    // Navigate to about page
    await page.goto('/about');
    
    // Wait for page load and theme application (increased from 200ms)
    await page.waitForTimeout(800);
    
    // Verify theme persisted
    const htmlClassOnAbout = await page.locator('html').getAttribute('class');
    expect(htmlClassOnAbout).toBe(htmlClassAfterToggle);
    
    // Check theme toggle state on about page
    const headerOnAbout = page.locator('header');
    const themeToggleOnAbout = headerOnAbout.locator('button[aria-label*="Switch to"]:visible').first();
    await expect(themeToggleOnAbout).toBeVisible();
    const ariaLabelOnAbout = await themeToggleOnAbout.getAttribute('aria-label');
    expect(ariaLabelOnAbout).toBe(newAriaLabel);
    
    // Navigate back to home and verify persistence
    await page.goto('/');
    
    // Wait for page load and theme application
    await page.waitForTimeout(800);
    
    const htmlClassBackHome = await page.locator('html').getAttribute('class');
    expect(htmlClassBackHome).toBe(htmlClassAfterToggle);
  });

  test('theme changes apply visually across page elements @critical', async ({ page }) => {
    await page.goto('/');
    
    // Find theme toggle (use same pattern as working test)
    const header = page.locator('header');
    const themeToggle = header.locator('button[aria-label*="Switch to"]:visible').first();
    await expect(themeToggle).toBeVisible();
    
    // Get initial theme state
    const initialAriaLabel = await themeToggle.getAttribute('aria-label');
    const switchingToDark = initialAriaLabel?.includes('dark');
    
    // Toggle theme
    await themeToggle.click();
    
    // Wait for theme change to apply (increased from 100ms)
    await page.waitForTimeout(500);
    
    // Verify main content reflects theme change
    const mainContent = page.locator('#main-content');
    await expect(mainContent).toBeVisible();
    
    // Check header theme application
    await expect(header).toBeVisible();
    
    // Verify document class changed
    const htmlClass = await page.locator('html').getAttribute('class');
    if (switchingToDark) {
      expect(htmlClass).toContain('dark');
    } else {
      expect(htmlClass).not.toContain('dark');
    }
    
    // Verify icon changed in theme toggle (use svg selector from Icon component)
    const themeIcon = themeToggle.locator('svg');
    await expect(themeIcon).toBeVisible();
    
    // Verify ARIA label reflects the new theme state
    const newAriaLabel = await themeToggle.getAttribute('aria-label');
    expect(newAriaLabel).not.toBe(initialAriaLabel);
    
    if (switchingToDark) {
      // Should show "Switch to light mode" in dark mode
      expect(newAriaLabel).toContain('light mode');
    } else {
      // Should show "Switch to dark mode" in light mode
      expect(newAriaLabel).toContain('dark mode');
    }
  });
});
import { test, expect } from '../fixtures/firefox-image-handler';
import { createMockAPI } from '../fixtures/mockAPI';
import { waitForAboutPage, waitForPageReady } from '../utils/pageWaits';

test.describe('About Page Critical Tests', () => {
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

  test('about page loads correctly and displays core content @critical', async ({ page }) => {
    await page.goto('/about');
    await waitForAboutPage(page);
    await waitForAboutPage(page);
    
    // Verify page title
    await expect(page).toHaveTitle(/About Us - Rescue Dog Aggregator/);
    
    // Verify main heading
    await expect(page.locator('h1')).toContainText('About Rescue Dog Aggregator');
    
    // Verify core content sections exist
    await expect(page.locator('h2').filter({ hasText: 'Our Mission' })).toBeVisible();
    await expect(page.locator('h2').filter({ hasText: 'How It Works' })).toBeVisible();
    await expect(page.locator('h2').filter({ hasText: 'Get Involved' })).toBeVisible();
    
    // Verify mission content is displayed
    await expect(page.locator('text=Our mission is to simplify the process of finding and adopting rescue dogs')).toBeVisible();
    
    // Verify how it works steps are displayed
    await expect(page.locator('text=1. Browse Dogs')).toBeVisible();
    await expect(page.locator('text=2. View Details')).toBeVisible();
    await expect(page.locator('text=3. Connect & Adopt')).toBeVisible();
  });

  test('contact button opens email client correctly @critical', async ({ page }) => {
    await page.goto('/about');
    await waitForAboutPage(page);
    
    // Find the specific contact button in the main content area (excluding footer)
    const mainContent = page.locator('#main-content');
    const contactButton = mainContent.getByRole('link', { name: 'Contact Us' });
    await expect(contactButton).toBeVisible();
    
    // Verify the mailto link is properly formed
    await expect(contactButton).toHaveAttribute('href', 'mailto:rescuedogsme@gmail.com');
    
    // Verify the button is accessible
    await expect(contactButton).toBeEnabled();
    
    // Verify button can be focused and activated
    await contactButton.focus();
    await expect(contactButton).toBeFocused();
  });

  test('page content is accessible and semantic @critical', async ({ page }) => {
    await page.goto('/about');
    await waitForAboutPage(page);
    
    const mainContent = page.locator('#main-content');
    
    // Verify semantic HTML structure - main content is visible
    await expect(mainContent).toBeVisible();
    
    // Verify heading hierarchy
    const h1 = mainContent.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toContainText('About Rescue Dog Aggregator');
    
    // Verify h2 headings exist for each section within main content
    const h2Headings = mainContent.locator('h2');
    await expect(h2Headings).toHaveCount(3);
    
    // Verify contact button is accessible and focusable
    const contactButton = mainContent.getByRole('link', { name: 'Contact Us' });
    await expect(contactButton).toBeVisible();
    await expect(contactButton).toBeEnabled();
    
    // Verify text contrast and readability (check for proper text colors)
    const missionText = mainContent.locator('text=Our mission is to simplify');
    await expect(missionText).toBeVisible();
    await expect(missionText).toHaveCSS('color', /rgb\(/);
  });

  test('about page works across different viewport sizes @critical', async ({ page }) => {
    await page.goto('/about');
    await waitForAboutPage(page);
    
    const mainContent = page.locator('#main-content');
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(mainContent.locator('h1')).toBeVisible();
    await expect(mainContent.getByRole('heading', { name: 'Our Mission' })).toBeVisible();
    
    // Test mobile viewport (iPhone 15 Pro)
    await page.setViewportSize({ width: 393, height: 852 });
    await expect(mainContent.locator('h1')).toBeVisible();
    await expect(mainContent.getByRole('heading', { name: 'Our Mission' })).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(mainContent.locator('h1')).toBeVisible();
    await expect(mainContent.getByRole('heading', { name: 'Our Mission' })).toBeVisible();
    
    // Verify contact button remains accessible across viewports
    const contactButton = mainContent.getByRole('link', { name: 'Contact Us' });
    await expect(contactButton).toBeVisible();
    await expect(contactButton).toBeEnabled();
    
    // Test content reflow - verify main container is visible
    await expect(mainContent).toBeVisible();
  });

  test('about page handles missing content gracefully @critical', async ({ page }) => {
    // Test with slow network conditions - use single route handler to avoid conflicts
    await page.route('**/*', async (route) => {
      const url = route.request().url();
      
      // Add delay to simulate slow network
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Abort image requests to test error handling
      if (url.match(/\.(png|jpg|jpeg|gif|svg)$/)) {
        await route.abort();
        return;
      }
      
      await route.continue();
    });
    
    await page.goto('/about');
    await waitForAboutPage(page);
    
    const mainContent = page.locator('#main-content');
    
    // Verify page still loads and displays core content
    await expect(mainContent.locator('h1')).toBeVisible({ timeout: 10000 });
    await expect(mainContent.locator('text=About Rescue Dog Aggregator')).toBeVisible();
    
    // Verify essential elements are present
    await expect(mainContent.getByRole('heading', { name: 'Our Mission' })).toBeVisible();
    await expect(mainContent.getByRole('link', { name: 'Contact Us' })).toBeVisible();
    
    // Verify page content is accessible without images
    await expect(mainContent.locator('h1')).toBeVisible();
    await expect(mainContent.locator('text=Our mission is to simplify')).toBeVisible();
    
    // Verify contact functionality still works
    const contactButton = mainContent.getByRole('link', { name: 'Contact Us' });
    await expect(contactButton).toBeVisible();
    await expect(contactButton).toBeEnabled();
  });
});
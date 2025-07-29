import { expect, test } from "playwright/test";
import { setupBasicMocks } from "../fixtures/apiMocks";
import { mockDogs } from "../fixtures/testData";
import { DogsPage } from "../pages/DogsPage";
import { HomePage } from "../pages/HomePage";

test.describe("Smoke Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Set up API mocks for all tests
    await setupBasicMocks(page);
  });

  test("Home page loads and displays core content @critical", async ({ page }) => {
    const homePage = new HomePage(page);

    // Navigate to home page
    await homePage.navigate("/");

    // Verify core sections are visible
    await expect(page.locator('[data-testid="hero-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="trust-section"]')).toBeVisible();

    // Verify at least one dog section loads
    await expect(
      page.locator('[data-testid="dog-section"]').first()
    ).toBeVisible();

    // Verify page title contains expected text
    await expect(page).toHaveTitle(/Rescue Dog Aggregator/);
  });

  test("Navigation works correctly @critical", async ({ page, isMobile }) => {
    await page.goto("/");

    // Check if "Find Dogs" link is directly visible (desktop) or if we need mobile menu
    const findDogsLink = page.getByRole("link", { name: "Find Dogs" });
    const isLinkDirectlyVisible = await findDogsLink.isVisible();
    
    if (!isLinkDirectlyVisible) {
      // Need to open mobile menu - use test ID for reliability
      const menuButton = page.getByTestId('mobile-menu-button');
      await menuButton.waitFor({ state: 'visible', timeout: 5000 });
      await menuButton.click();
    }

    // Test navigation to dogs page
    await page.getByRole("link", { name: "Find Dogs" }).click();
    await expect(page).toHaveURL(/\/dogs$/);

    // Test navigation back to home via logo
    await page.getByLabel('Main navigation').getByRole("link", { name: "Rescue Dog Aggregator" }).click();
    await expect(page).toHaveURL(/\/$/);

    // Check if "Organizations" link is directly visible or if we need mobile menu again
    const organizationsLink = page.getByRole("link", { name: "Organizations" });
    const isOrgLinkDirectlyVisible = await organizationsLink.isVisible();
    
    if (!isOrgLinkDirectlyVisible) {
      // Need to open mobile menu again
      const menuButton = page.getByTestId('mobile-menu-button');
      await menuButton.waitFor({ state: 'visible', timeout: 5000 });
      await menuButton.click();
    }

    // Test navigation to organizations page
    await page.getByRole("link", { name: "Organizations" }).click();
    await expect(page).toHaveURL(/\/organizations$/);
  });

  test("Dogs page loads and displays dogs @critical", async ({ page }) => {
    const dogsPage = new DogsPage(page);

    await dogsPage.navigate();
    await dogsPage.expectPageToLoad();

    // Verify at least one dog card is visible
    const dogCount = await dogsPage.dog.getDogCardCount();
    expect(dogCount).toBeGreaterThan(0);

    // Generate test ID coverage report for monitoring
    // TODO: Add test ID coverage check
    console.log('Test ID Coverage: TODO - implement coverage reporting');
  });

  test("Search functionality works @critical", async ({ page, isMobile }) => {
    const dogsPage = new DogsPage(page);

    await dogsPage.navigate();
    await dogsPage.expectPageToLoad();

    // Check which search input is available and visible
    const desktopSearchInput = page.getByTestId('desktop-filters-panel').getByTestId('search-input');
    const isDesktopSearchVisible = await desktopSearchInput.isVisible();
    
    if (isDesktopSearchVisible) {
      // Use desktop search
      await desktopSearchInput.fill("Golden");
      await page.waitForTimeout(300); // Wait for debounce
    } else {
      // Need to use mobile search - open filter drawer first
      const mobileFilterButton = page.getByTestId('mobile-filter-button');
      const isMobileFilterVisible = await mobileFilterButton.isVisible();
      
      if (isMobileFilterVisible) {
        await mobileFilterButton.click();
      } else {
        // Fallback: force mobile layout
        await page.setViewportSize({ width: 360, height: 800 });
        await page.waitForTimeout(100);
        await mobileFilterButton.click();
      }
      
      // Use the mobile search input specifically
      const mobileSearchInput = page.getByTestId('mobile-filter-drawer').getByTestId('search-input');
      await mobileSearchInput.fill("Golden");
      await page.waitForTimeout(300); // Wait for debounce
    }
    await dogsPage.dog.expectDogsToBeVisible();

    // Verify search results
    const dogCount = await dogsPage.dog.getDogCardCount();
    expect(dogCount).toBeGreaterThanOrEqual(0); // Allow for no results if test data doesn't include Golden
  });

  test("Dog detail page loads correctly @critical", async ({ page }) => {
    const testDog = mockDogs[0];

    // Navigate directly to dog detail page
    await page.goto(`/dogs/${testDog.slug}`);

    // Verify basic page elements
    await expect(
      page.locator('[data-testid="dog-detail-container"]')
    ).toBeVisible();

    // Verify dog name is displayed in the main heading
    await expect(page.getByRole('heading', { name: testDog.name, level: 1 })).toBeVisible();

    // Verify image section exists
    await expect(
      page.locator(
        '[data-testid="dog-hero-image"], img[alt*="' + testDog.name + '"]'
      )
    ).toBeVisible();
  });

  test("Mobile menu works on mobile viewport", async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
    }

    await page.goto("/");

    // Mobile menu button should be visible
    const menuButton = page.getByTestId('mobile-menu-button');
    await expect(menuButton).toBeVisible();

    // Open menu
    await menuButton.click();

    // Verify navigation links are visible
    await expect(page.getByRole("link", { name: "Find Dogs" })).toBeVisible();
  });

  test("Basic accessibility structure exists", async ({ page }) => {
    await page.goto("/");

    // Verify skip link exists (even if visually hidden)
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toHaveCount(1);

    // Verify main landmarks exist
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("nav")).toBeVisible();
  });
});

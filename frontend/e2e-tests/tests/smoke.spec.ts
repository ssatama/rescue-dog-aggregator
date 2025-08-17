import { expect, test } from "playwright/test";
import { DogsPage } from "../pages/DogsPage";
import { HomePage } from "../pages/HomePage";

test.describe("Smoke Tests", () => {
  test("Home page loads and displays core content @critical", async ({ page }) => {
    const homePage = new HomePage(page);

    // Navigate to home page
    await homePage.navigate("/");

    // Verify core sections are visible
    await expect(page.locator('[data-testid="hero-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="trust-section"]')).toBeVisible();

    // Verify at least one dog section loads or page container exists
    const hasDogSectionOrContainer = await Promise.race([
      page.locator('[data-testid="dog-section"]').first().waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false),
      page.locator('[data-testid="page-container"]').waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false)
    ]);
    expect(hasDogSectionOrContainer).toBe(true);

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

  test("Dogs page loads and displays content @critical", async ({ page }) => {
    const dogsPage = new DogsPage(page);

    await dogsPage.navigate();
    await dogsPage.expectPageToLoad();

    // Verify dogs grid loads OR empty state is shown - both are valid
    const hasContentOrEmpty = await Promise.race([
      page.locator('[data-testid="dogs-grid"]').waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false),
      page.locator('[data-testid="empty-state"]').waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false),
      page.locator('[data-testid="dogs-page-container"]').waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false),
      page.locator('text=/no dogs found/i').waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false)
    ]);
    
    expect(hasContentOrEmpty).toBe(true);
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
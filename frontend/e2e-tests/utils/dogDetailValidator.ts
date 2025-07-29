import { Page, Locator, expect } from 'playwright/test';
import { EnhancedDog } from '../fixtures/testData';
import { 
  DogDetailValidationOptions, 
  DogDetailValidationResult, 
  ValidationResult 
} from './dogTestHelperTypes';
import { getTimeoutConfig } from './testHelpers';

/**
 * Comprehensive validator for dog detail pages with detailed validation results
 */
export class DogDetailValidator {
  private page: Page;
  private timeouts = getTimeoutConfig();

  constructor(page: Page) {
    this.page = page;
  }

  async validateDetailPage(
    expectedDog: EnhancedDog,
    options: DogDetailValidationOptions = {}
  ): Promise<DogDetailValidationResult> {
    const {
      validateHeroImage = true,
      validateMetadataCards = true,
      validateOrganization = true,
      validateDescription = true,
      validateRelatedDogs = true,
      validateCTAButtons = true,
      validateBreadcrumbs = true,
      validateGallery = false,
      validateAccessibility = true,
      validateSEO = true
    } = options;

    const results: DogDetailValidationResult = {
      overall: { passed: true, message: 'Dog detail validation passed' },
      heroImage: { passed: true, message: 'Hero image validation skipped' },
      dogInfo: { passed: true, message: 'Dog info validation passed' },
      metadataCards: { passed: true, message: 'Metadata cards validation skipped' },
      description: { passed: true, message: 'Description validation skipped' },
      organization: { passed: true, message: 'Organization validation skipped' },
      relatedDogs: { passed: true, message: 'Related dogs validation skipped' },
      ctaButtons: { passed: true, message: 'CTA buttons validation skipped' },
      breadcrumbs: { passed: true, message: 'Breadcrumbs validation skipped' },
      gallery: { passed: true, message: 'Gallery validation skipped' },
      accessibility: { passed: true, message: 'Accessibility validation skipped' },
      seo: { passed: true, message: 'SEO validation skipped' }
    };

    try {
      // Wait for page to load
      await this.waitForDogDetailPageLoad();

      // Validate basic dog info (name, breed, etc.)
      results.dogInfo = await this.validateDogInfo(expectedDog);

      // Optional validations
      if (validateHeroImage) {
        results.heroImage = await this.validateHeroImage(expectedDog.primary_image_url, expectedDog.name);
      }

      if (validateMetadataCards) {
        results.metadataCards = await this.validateMetadataCards(expectedDog);
      }

      if (validateOrganization) {
        results.organization = await this.validateOrganization(expectedDog.organization?.name);
      }

      if (validateDescription) {
        results.description = await this.validateDescription(expectedDog.properties?.description);
      }

      if (validateRelatedDogs) {
        results.relatedDogs = await this.validateRelatedDogs();
      }

      if (validateCTAButtons) {
        results.ctaButtons = await this.validateCTAButtons();
      }

      if (validateBreadcrumbs) {
        results.breadcrumbs = await this.validateBreadcrumbs(expectedDog.name);
      }

      if (validateGallery) {
        results.gallery = await this.validateGallery();
      }

      if (validateAccessibility) {
        results.accessibility = await this.validateAccessibility();
      }

      if (validateSEO) {
        results.seo = await this.validateSEO(expectedDog);
      }

      // Determine overall result
      const allResults = [
        results.heroImage,
        results.dogInfo,
        results.metadataCards,
        results.description,
        results.organization,
        results.relatedDogs,
        results.ctaButtons,
        results.breadcrumbs,
        results.gallery,
        results.accessibility,
        results.seo
      ];

      const failedResults = allResults.filter(result => !result.passed);
      if (failedResults.length > 0) {
        results.overall = {
          passed: false,
          message: `Dog detail validation failed: ${failedResults.map(r => r.message).join(', ')}`,
          element: 'dog-detail-page'
        };
      }

    } catch (error) {
      results.overall = {
        passed: false,
        message: `Dog detail validation failed with error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        element: 'dog-detail-page'
      };
    }

    return results;
  }

  private async validateHeroImage(expectedSrc?: string, dogName?: string): Promise<ValidationResult> {
    try {
      const heroContainer = this.page.locator('[data-testid="hero-image-container"], .hero-image');
      await expect(heroContainer).toBeVisible({ timeout: this.timeouts.ui.element });

      const heroImage = heroContainer.locator('img').first();
      await expect(heroImage).toBeVisible({ timeout: this.timeouts.ui.element });

      // Check image src
      const src = await heroImage.getAttribute('src');
      if (!src) {
        return { passed: false, message: 'Hero image has no src attribute' };
      }

      if (expectedSrc && src !== expectedSrc) {
        return { 
          passed: false, 
          message: `Hero image src mismatch: expected "${expectedSrc}", got "${src}"` 
        };
      }

      // Check for alt text
      const alt = await heroImage.getAttribute('alt');
      if (!alt) {
        return { passed: false, message: 'Hero image missing alt text for accessibility' };
      }

      if (dogName && !alt.toLowerCase().includes(dogName.toLowerCase())) {
        return { 
          passed: false, 
          message: `Hero image alt text should include dog name "${dogName}"` 
        };
      }

      // Check if image loaded successfully
      const naturalWidth = await heroImage.evaluate((img: HTMLImageElement) => img.naturalWidth);
      if (naturalWidth === 0) {
        return { passed: false, message: 'Hero image failed to load' };
      }

      return { passed: true, message: 'Hero image validation passed' };
    } catch {
      return { passed: false, message: 'Hero image element not found or not visible' };
    }
  }

  private async validateDogInfo(expectedDog: EnhancedDog): Promise<ValidationResult> {
    try {
      // Validate dog name (H1)
      const nameElement = this.page.locator('h1').first();
      await expect(nameElement).toBeVisible({ timeout: this.timeouts.ui.element });
      
      const nameText = await nameElement.textContent();
      if (!nameText?.includes(expectedDog.name)) {
        return { 
          passed: false, 
          message: `Dog name mismatch: expected "${expectedDog.name}", got "${nameText?.trim()}"` 
        };
      }

      return { passed: true, message: 'Dog info validation passed' };
    } catch {
      return { passed: false, message: 'Dog info elements not found or not visible' };
    }
  }

  private async validateMetadataCards(expectedDog: EnhancedDog): Promise<ValidationResult> {
    try {
      const metadataCards = this.page.locator('[data-testid="metadata-card"], .metadata-card');
      const cardCount = await metadataCards.count();

      if (cardCount === 0) {
        return { passed: false, message: 'No metadata cards found' };
      }

      // Check for key metadata (age, size, breed, sex)
      const expectedFields = ['age', 'size', 'breed', 'sex'];
      const foundFields: string[] = [];

      for (let i = 0; i < cardCount; i++) {
        const card = metadataCards.nth(i);
        const cardText = await card.textContent();
        
        for (const field of expectedFields) {
          if (cardText?.toLowerCase().includes(field)) {
            foundFields.push(field);
          }
        }
      }

      const missingFields = expectedFields.filter(field => !foundFields.includes(field));
      if (missingFields.length > 0) {
        return { 
          passed: false, 
          message: `Missing metadata fields: ${missingFields.join(', ')}` 
        };
      }

      return { passed: true, message: 'Metadata cards validation passed' };
    } catch {
      return { passed: false, message: 'Error validating metadata cards' };
    }
  }

  private async validateOrganization(expectedOrgName?: string): Promise<ValidationResult> {
    try {
      const orgElement = this.page.locator('[data-testid="organization-info"], .organization-info').first();
      await expect(orgElement).toBeVisible({ timeout: this.timeouts.ui.element });

      if (expectedOrgName) {
        const orgText = await orgElement.textContent();
        if (!orgText?.includes(expectedOrgName)) {
          return { 
            passed: false, 
            message: `Organization name not found: expected "${expectedOrgName}"` 
          };
        }
      }

      return { passed: true, message: 'Organization validation passed' };
    } catch {
      return { passed: false, message: 'Organization info not found or not visible' };
    }
  }

  private async validateDescription(expectedDescription?: string): Promise<ValidationResult> {
    try {
      const descElement = this.page.locator('[data-testid="dog-description"], .description').first();
      await expect(descElement).toBeVisible({ timeout: this.timeouts.ui.element });

      const descText = await descElement.textContent();
      if (!descText || descText.trim().length === 0) {
        return { passed: false, message: 'Dog description is empty' };
      }

      if (expectedDescription && !descText.includes(expectedDescription)) {
        return { 
          passed: false, 
          message: 'Description content does not match expected content' 
        };
      }

      return { passed: true, message: 'Description validation passed' };
    } catch {
      return { passed: false, message: 'Description element not found or not visible' };
    }
  }

  private async validateRelatedDogs(): Promise<ValidationResult> {
    try {
      const relatedSection = this.page.locator('[data-testid="related-dogs"], .related-dogs').first();
      await expect(relatedSection).toBeVisible({ timeout: this.timeouts.ui.element });

      const relatedCards = relatedSection.locator('[data-testid="dog-card"], .dog-card');
      const cardCount = await relatedCards.count();

      if (cardCount === 0) {
        return { passed: false, message: 'No related dogs found' };
      }

      // Validate each related dog card has basic info
      for (let i = 0; i < Math.min(cardCount, 3); i++) {
        const card = relatedCards.nth(i);
        const nameElement = card.locator('h3, [data-testid="dog-name"]').first();
        const nameText = await nameElement.textContent();
        
        if (!nameText || nameText.trim().length === 0) {
          return { passed: false, message: `Related dog ${i + 1} has no name` };
        }
      }

      return { passed: true, message: 'Related dogs validation passed' };
    } catch {
      return { passed: false, message: 'Related dogs section not found or not visible' };
    }
  }

  private async validateCTAButtons(): Promise<ValidationResult> {
    try {
      // Look for primary adoption button
      const adoptButton = this.page.locator('[data-testid="adopt-button"], button:has-text("Adopt"), button:has-text("Contact")').first();
      await expect(adoptButton).toBeVisible({ timeout: this.timeouts.ui.element });

      // Check for share/favorite buttons
      const shareButton = this.page.locator('[data-testid="share-button"], button:has-text("Share")').first();
      const favoriteButton = this.page.locator('[data-testid="favorite-button"], button:has-text("Favorite")').first();

      // At least one additional action button should be present
      const shareVisible = await shareButton.isVisible().catch(() => false);
      const favoriteVisible = await favoriteButton.isVisible().catch(() => false);

      if (!shareVisible && !favoriteVisible) {
        return { passed: false, message: 'No secondary action buttons (share/favorite) found' };
      }

      return { passed: true, message: 'CTA buttons validation passed' };
    } catch {
      return { passed: false, message: 'Primary adoption button not found or not visible' };
    }
  }

  private async validateBreadcrumbs(expectedDogName?: string): Promise<ValidationResult> {
    try {
      const breadcrumbs = this.page.locator('[data-testid="breadcrumbs"], .breadcrumbs, nav[aria-label*="breadcrumb"]').first();
      await expect(breadcrumbs).toBeVisible({ timeout: this.timeouts.ui.element });

      const breadcrumbText = await breadcrumbs.textContent();
      if (!breadcrumbText?.includes('Dogs')) {
        return { passed: false, message: 'Breadcrumbs missing "Dogs" link' };
      }

      if (expectedDogName && !breadcrumbText.includes(expectedDogName)) {
        return { 
          passed: false, 
          message: `Breadcrumbs missing dog name "${expectedDogName}"` 
        };
      }

      return { passed: true, message: 'Breadcrumbs validation passed' };
    } catch {
      return { passed: false, message: 'Breadcrumbs not found or not visible' };
    }
  }

  private async validateGallery(): Promise<ValidationResult> {
    try {
      const gallery = this.page.locator('[data-testid="image-gallery"], .image-gallery').first();
      await expect(gallery).toBeVisible({ timeout: this.timeouts.ui.element });

      const galleryImages = gallery.locator('img');
      const imageCount = await galleryImages.count();

      if (imageCount === 0) {
        return { passed: false, message: 'Gallery has no images' };
      }

      // Validate first few images have proper attributes
      for (let i = 0; i < Math.min(imageCount, 3); i++) {
        const img = galleryImages.nth(i);
        const src = await img.getAttribute('src');
        const alt = await img.getAttribute('alt');

        if (!src) {
          return { passed: false, message: `Gallery image ${i + 1} has no src` };
        }
        if (!alt) {
          return { passed: false, message: `Gallery image ${i + 1} has no alt text` };
        }
      }

      return { passed: true, message: 'Gallery validation passed' };
    } catch {
      return { passed: false, message: 'Gallery not found or not visible' };
    }
  }

  private async validateAccessibility(): Promise<ValidationResult> {
    try {
      // Check for main landmark
      const mainLandmark = this.page.locator('main, [role="main"]').first();
      await expect(mainLandmark).toBeVisible({ timeout: this.timeouts.ui.element });

      // Check for H1
      const h1 = this.page.locator('h1').first();
      await expect(h1).toBeVisible({ timeout: this.timeouts.ui.element });

      // Check for proper heading hierarchy
      const headings = this.page.locator('h1, h2, h3, h4, h5, h6');
      const headingCount = await headings.count();
      if (headingCount < 2) {
        return { passed: false, message: 'Insufficient heading structure for accessibility' };
      }

      return { passed: true, message: 'Accessibility validation passed' };
    } catch {
      return { passed: false, message: 'Accessibility validation failed' };
    }
  }

  private async validateSEO(expectedDog: EnhancedDog): Promise<ValidationResult> {
    try {
      // Check page title
      const title = await this.page.title();
      if (!title || title.trim().length === 0) {
        return { passed: false, message: 'Page has no title' };
      }

      if (!title.includes(expectedDog.name)) {
        return { 
          passed: false, 
          message: `Page title missing dog name "${expectedDog.name}"` 
        };
      }

      // Check meta description
      const metaDescription = await this.page.locator('meta[name="description"]').getAttribute('content');
      if (!metaDescription || metaDescription.trim().length === 0) {
        return { passed: false, message: 'Page missing meta description' };
      }

      return { passed: true, message: 'SEO validation passed' };
    } catch {
      return { passed: false, message: 'SEO validation failed' };
    }
  }

  async waitForDogDetailPageLoad(): Promise<void> {
    // Wait for hero image container
    await this.page.waitForSelector('[data-testid="hero-image-container"], .hero-image', { 
      state: 'visible', 
      timeout: this.timeouts.page.load 
    });

    // Wait for dog name (H1)
    await this.page.waitForSelector('h1', { 
      state: 'visible', 
      timeout: this.timeouts.ui.element 
    });

    // Wait for any loading states to finish
    const loadingSpinner = this.page.locator('[data-testid="loading-spinner"], .loading');
    if (await loadingSpinner.isVisible().catch(() => false)) {
      await loadingSpinner.waitFor({ state: 'hidden', timeout: this.timeouts.ui.loading });
    }
  }

  async getDogNameFromPage(): Promise<string> {
    const nameElement = this.page.locator('h1').first();
    const nameText = await nameElement.textContent();
    return nameText?.trim() || '';
  }

  async isAdoptionButtonVisible(): Promise<boolean> {
    const adoptButton = this.page.locator('[data-testid="adopt-button"], button:has-text("Adopt"), button:has-text("Contact")').first();
    return await adoptButton.isVisible().catch(() => false);
  }

  async clickAdoptionButton(): Promise<void> {
    const adoptButton = this.page.locator('[data-testid="adopt-button"], button:has-text("Adopt"), button:has-text("Contact")').first();
    await adoptButton.click();
  }

  async getRelatedDogsCount(): Promise<number> {
    const relatedCards = this.page.locator('[data-testid="related-dogs"] [data-testid="dog-card"], .related-dogs .dog-card');
    return await relatedCards.count();
  }
}

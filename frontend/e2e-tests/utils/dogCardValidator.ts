import { Page, Locator, expect } from 'playwright/test';
import { EnhancedDog } from '../fixtures/testData';
import { 
  DogCardValidationOptions, 
  DogCardValidationResult, 
  ValidationResult 
} from './dogTestHelperTypes';
import { getTimeoutConfig } from './testHelpers';

/**
 * Comprehensive validator for dog cards with detailed validation results
 */
export class DogCardValidator {
  private page: Page;
  private timeouts = getTimeoutConfig();

  constructor(page: Page) {
    this.page = page;
  }

  async validateCard(
    cardElement: Locator,
    expectedDog: Partial<EnhancedDog>,
    options: DogCardValidationOptions = {}
  ): Promise<DogCardValidationResult> {
    const {
      validateImage = true,
      validateOrganization = true,
      validateBadges = true,
      validateMetadata = true,
      validateCTAButtons = true,
      validateAccessibility = true,
      validateResponsive = false
    } = options;

    const results: DogCardValidationResult = {
      overall: { passed: true, message: 'Dog card validation passed' },
      image: { passed: true, message: 'Image validation skipped' },
      name: { passed: true, message: 'Name validation passed' },
      breed: { passed: true, message: 'Breed validation passed' },
      age: { passed: true, message: 'Age validation passed' },
      size: { passed: true, message: 'Size validation passed' },
      organization: { passed: true, message: 'Organization validation skipped' },
      badges: { passed: true, message: 'Badges validation skipped' },
      ctaButtons: { passed: true, message: 'CTA buttons validation skipped' },
      accessibility: { passed: true, message: 'Accessibility validation skipped' }
    };

    try {
      // Validate card container exists and is visible
      await expect(cardElement).toBeVisible({ timeout: this.timeouts.ui.element });

      // Validate required elements
      results.name = await this.validateDogName(cardElement, expectedDog.name);
      results.breed = await this.validateDogBreed(cardElement, expectedDog.standardized_breed);
      results.age = await this.validateDogAge(cardElement, expectedDog.age_category);
      results.size = await this.validateDogSize(cardElement, expectedDog.standardized_size);

      // Optional validations
      if (validateImage) {
        results.image = await this.validateDogImage(cardElement, expectedDog.primary_image_url);
      }

      if (validateOrganization) {
        results.organization = await this.validateOrganization(cardElement, expectedDog.organization?.name);
      }

      if (validateBadges) {
        results.badges = await this.validateBadges(cardElement);
      }

      if (validateCTAButtons) {
        results.ctaButtons = await this.validateCTAButtons(cardElement);
      }

      if (validateAccessibility) {
        results.accessibility = await this.validateAccessibility(cardElement);
      }

      // Determine overall result
      const allResults = [
        results.name,
        results.breed,
        results.age,
        results.size,
        results.image,
        results.organization,
        results.badges,
        results.ctaButtons,
        results.accessibility
      ];

      const failedResults = allResults.filter(result => !result.passed);
      if (failedResults.length > 0) {
        results.overall = {
          passed: false,
          message: `Dog card validation failed: ${failedResults.map(r => r.message).join(', ')}`,
          element: await cardElement.getAttribute('data-testid') || 'dog-card'
        };
      }

    } catch (error) {
      results.overall = {
        passed: false,
        message: `Dog card validation failed with error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        element: await cardElement.getAttribute('data-testid') || 'dog-card'
      };
    }

    return results;
  }

  private async validateDogName(cardElement: Locator, expectedName?: string): Promise<ValidationResult> {
    try {
      const nameElement = cardElement.locator('[data-testid="dog-name"], h2, h3').first();
      await expect(nameElement).toBeVisible({ timeout: this.timeouts.ui.element });
      
      const nameText = await nameElement.textContent();
      if (!nameText || nameText.trim().length === 0) {
        return { passed: false, message: 'Dog name is empty' };
      }

      if (expectedName && nameText.trim() !== expectedName) {
        return { 
          passed: false, 
          message: `Dog name mismatch: expected "${expectedName}", got "${nameText.trim()}"` 
        };
      }

      return { passed: true, message: 'Dog name validation passed' };
    } catch {
      return { passed: false, message: 'Dog name element not found or not visible' };
    }
  }

  private async validateDogBreed(cardElement: Locator, expectedBreed?: string): Promise<ValidationResult> {
    try {
      const breedElement = cardElement.locator('[data-testid="dog-breed"], .breed, p').first();
      await expect(breedElement).toBeVisible({ timeout: this.timeouts.ui.element });
      
      const breedText = await breedElement.textContent();
      if (!breedText || breedText.trim().length === 0) {
        return { passed: false, message: 'Dog breed is empty' };
      }

      if (expectedBreed && !breedText.includes(expectedBreed)) {
        return { 
          passed: false, 
          message: `Dog breed mismatch: expected "${expectedBreed}", got "${breedText.trim()}"` 
        };
      }

      return { passed: true, message: 'Dog breed validation passed' };
    } catch {
      return { passed: false, message: 'Dog breed element not found or not visible' };
    }
  }

  private async validateDogAge(cardElement: Locator, expectedAge?: string): Promise<ValidationResult> {
    try {
      // Use verified selector from audit: age-category or formatted-age
      const ageElement = cardElement.locator('[data-testid="age-category"], [data-testid="formatted-age"]').first();
      await expect(ageElement).toBeVisible({ timeout: this.timeouts.ui.element });
      
      const ageText = await ageElement.textContent();
      if (!ageText || ageText.trim().length === 0) {
        return { passed: false, message: 'Dog age is empty' };
      }

      if (expectedAge && !ageText.includes(expectedAge)) {
        return { 
          passed: false, 
          message: `Dog age mismatch: expected "${expectedAge}", got "${ageText.trim()}"` 
        };
      }

      return { passed: true, message: 'Dog age validation passed' };
    } catch {
      return { passed: false, message: 'Dog age element not found or not visible' };
    }
  }

  private async validateDogSize(cardElement: Locator, expectedSize?: string): Promise<ValidationResult> {
    try {
      // Note: Size is not displayed on dog cards in current implementation
      // Skipping size validation for cards, return success
      return { passed: true, message: 'Dog size validation skipped (not displayed on cards)' };
    } catch {
      return { passed: false, message: 'Dog size element not found or not visible' };
    }
  }

  private async validateDogImage(cardElement: Locator, expectedSrc?: string): Promise<ValidationResult> {
    try {
      // Use verified selector from audit: image-container img
      const imageElement = cardElement.locator('[data-testid="image-container"] img').first();
      await expect(imageElement).toBeVisible({ timeout: this.timeouts.ui.element });

      // Check if image has loaded successfully
      const src = await imageElement.getAttribute('src');
      if (!src) {
        return { passed: false, message: 'Dog image has no src attribute' };
      }

      if (expectedSrc && src !== expectedSrc) {
        return { 
          passed: false, 
          message: `Dog image src mismatch: expected "${expectedSrc}", got "${src}"` 
        };
      }

      // Check for alt text
      const alt = await imageElement.getAttribute('alt');
      if (!alt) {
        return { passed: false, message: 'Dog image missing alt text for accessibility' };
      }

      // Check for error state
      const naturalWidth = await imageElement.evaluate((img: HTMLImageElement) => img.naturalWidth);
      if (naturalWidth === 0) {
        return { passed: false, message: 'Dog image failed to load' };
      }

      return { passed: true, message: 'Dog image validation passed' };
    } catch {
      return { passed: false, message: 'Dog image element not found or not visible' };
    }
  }

  private async validateOrganization(cardElement: Locator, expectedOrgName?: string): Promise<ValidationResult> {
    try {
      // Use verified selector from audit: location-display is used for organization
      const orgElement = cardElement.locator('[data-testid="location-display"]').first();
      await expect(orgElement).toBeVisible({ timeout: this.timeouts.ui.element });
      
      const orgText = await orgElement.textContent();
      if (!orgText || orgText.trim().length === 0) {
        return { passed: false, message: 'Dog organization is empty' };
      }

      if (expectedOrgName && !orgText.includes(expectedOrgName)) {
        return { 
          passed: false, 
          message: `Organization name mismatch: expected "${expectedOrgName}", got "${orgText.trim()}"` 
        };
      }

      return { passed: true, message: 'Dog organization validation passed' };
    } catch {
      return { passed: false, message: 'Dog organization element not found or not visible' };
    }
  }

  private async validateBadges(cardElement: Locator): Promise<ValidationResult> {
    try {
      // Use verified selector from audit: new-badge and status badges
      const badgeElements = cardElement.locator('[data-testid="new-badge"], .badge');
      const badgeCount = await badgeElements.count();

      if (badgeCount > 0) {
        // If badges exist, validate they have content
        for (let i = 0; i < badgeCount; i++) {
          const badge = badgeElements.nth(i);
          const badgeText = await badge.textContent();
          if (!badgeText || badgeText.trim().length === 0) {
            return { passed: false, message: `Badge ${i + 1} is empty` };
          }
        }
      }

      return { passed: true, message: 'Dog badges validation passed' };
    } catch {
      return { passed: false, message: 'Error validating dog badges' };
    }
  }

  private async validateCTAButtons(cardElement: Locator): Promise<ValidationResult> {
    try {
      // Look for common CTA buttons (View Details, Adopt, Favorite)
      const ctaButtons = cardElement.locator('button, a[role="button"], [data-testid*="button"]');
      const buttonCount = await ctaButtons.count();

      if (buttonCount === 0) {
        return { passed: false, message: 'No CTA buttons found on dog card' };
      }

      // Validate each button is interactive and has accessible text
      for (let i = 0; i < buttonCount; i++) {
        const button = ctaButtons.nth(i);
        await expect(button).toBeVisible({ timeout: this.timeouts.ui.element });
        
        const buttonText = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');
        
        if (!buttonText?.trim() && !ariaLabel?.trim()) {
          return { passed: false, message: `CTA button ${i + 1} lacks accessible text` };
        }
      }

      return { passed: true, message: 'CTA buttons validation passed' };
    } catch {
      return { passed: false, message: 'Error validating CTA buttons' };
    }
  }

  private async validateAccessibility(cardElement: Locator): Promise<ValidationResult> {
    try {
      // Check if card is focusable or contains focusable elements
      const focusableElements = cardElement.locator('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
      const focusableCount = await focusableElements.count();

      if (focusableCount === 0) {
        return { passed: false, message: 'Dog card has no focusable elements' };
      }

      // Check for proper ARIA attributes
      const cardRole = await cardElement.getAttribute('role');
      if (cardRole === 'button' || cardRole === 'link') {
        const ariaLabel = await cardElement.getAttribute('aria-label');
        const cardText = await cardElement.textContent();
        
        if (!ariaLabel && (!cardText || cardText.trim().length === 0)) {
          return { passed: false, message: 'Interactive dog card lacks accessible name' };
        }
      }

      return { passed: true, message: 'Accessibility validation passed' };
    } catch {
      return { passed: false, message: 'Error validating accessibility' };
    }
  }

  async validateAllDogCards(options: DogCardValidationOptions = {}): Promise<DogCardValidationResult[]> {
    const cardElements = this.page.locator('[data-testid="dog-card"], .dog-card');
    const cardCount = await cardElements.count();
    const results: DogCardValidationResult[] = [];

    for (let i = 0; i < cardCount; i++) {
      const card = cardElements.nth(i);
      const result = await this.validateCard(card, {}, options);
      results.push(result);
    }

    return results;
  }

  async countVisibleDogCards(): Promise<number> {
    const cardElements = this.page.locator('[data-testid="dog-card"], .dog-card');
    return await cardElements.count();
  }

  async getDogCardByName(dogName: string): Promise<Locator | null> {
    const cards = this.page.locator('[data-testid="dog-card"], .dog-card');
    const cardCount = await cards.count();

    for (let i = 0; i < cardCount; i++) {
      const card = cards.nth(i);
      const nameElement = card.locator('[data-testid="dog-name"], h2, h3').first();
      const nameText = await nameElement.textContent();
      
      if (nameText?.trim().toLowerCase() === dogName.toLowerCase()) {
        return card;
      }
    }

    return null;
  }

  async getDogCardByIndex(index: number): Promise<Locator> {
    const cards = this.page.locator('[data-testid="dog-card"], .dog-card');
    return cards.nth(index);
  }
}

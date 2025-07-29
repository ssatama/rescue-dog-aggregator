import { Page, Locator, expect } from 'playwright/test';
import { getTimeoutConfig } from './testHelpers';
import { DogCardValidator } from './dogCardValidator';
import { DogDetailValidator } from './dogDetailValidator';
import { DogListValidator } from './dogListValidator';
import { DogInteractionHelper } from './dogInteractionHelper';
import { LazyImageTestHelper } from './lazyImageTestHelper';
import { DogCardValidationOptions, DogDetailValidationOptions, DogListOptions } from './dogTestHelperTypes';

export { DogCardValidationOptions, DogDetailValidationOptions, DogListOptions };

export class SharedValidationUtils {
    private timeouts = getTimeoutConfig();
    constructor(private page: Page) {}

    async validateElementExists(locator: Locator, description: string, context: string): Promise<void> {
        try {
            await expect(locator).toBeVisible({ timeout: this.timeouts.page.element });
        } catch (error) {
            throw new Error(`Validation failed: ${description} not visible in ${context}. Details: ${error}`);
        }
    }

    async validateElementText(locator: Locator, expectedText: string, description: string, context: string): Promise<void> {
        await this.validateElementExists(locator, description, context);
        try {
            await expect(locator).toContainText(expectedText, { timeout: this.timeouts.page.element });
        } catch (error) {
            const actualText = await locator.textContent();
            throw new Error(`Validation failed: ${description} text mismatch in ${context}. Expected to contain "${expectedText}", but got "${actualText}". Details: ${error}`);
        }
    }

    async validateImageElement(locator: Locator, context: string, expectedAltText?: string): Promise<void> {
        await this.validateElementExists(locator, 'Image', context);
        await expect(locator).toHaveJSProperty('complete', true, { timeout: this.timeouts.media.image });
        const naturalWidth = await locator.evaluate((img: HTMLImageElement) => img.naturalWidth);
        if (naturalWidth === 0) {
            throw new Error(`Image in ${context} failed to load (naturalWidth is 0).`);
        }
        if (expectedAltText) {
            await expect(locator).toHaveAttribute('alt', expectedAltText);
        }
    }

    async waitForDogCardsToLoad(): Promise<void> {
        await this.page.waitForSelector('[data-testid="dogs-grid"]', { state: 'visible', timeout: this.timeouts.ui.loading });
    }
}

export class DogTestHelper {
  public cardValidator: DogCardValidator;
  public detailValidator: DogDetailValidator;
  public listValidator: DogListValidator;
  public interactionHelper: DogInteractionHelper;
  public lazyImageHelper: LazyImageTestHelper;
  public utils: SharedValidationUtils;
  private timeouts = getTimeoutConfig();

  constructor(private page: Page) {
    this.cardValidator = new DogCardValidator(page);
    this.detailValidator = new DogDetailValidator(page);
    this.listValidator = new DogListValidator(page);
    this.interactionHelper = new DogInteractionHelper(page);
    this.lazyImageHelper = new LazyImageTestHelper(page);
    this.utils = new SharedValidationUtils(page);
  }

  // Enhanced methods for E2E tests
  async getDogCards(): Promise<Locator[]> {
    try {
      const dogsGrid = this.page.getByTestId('dogs-grid');
      const cards = await dogsGrid.locator('[data-testid="dog-card"]').all();
      return cards;
    } catch (error) {
      // If page is closed or elements can't be found, return empty array
      console.log('[DogTestHelper] getDogCards failed, returning empty array:', error.message);
      return [];
    }
  }

  async getDogCardCount(): Promise<number> {
    const cards = await this.getDogCards();
    return cards.length;
  }

  async expectDogsToBeVisible(): Promise<void> {
    const dogsGrid = this.page.getByTestId('dogs-grid');
    await expect(dogsGrid).toBeVisible();
    
    // Wait a bit for any loading to complete
    await this.page.waitForTimeout(500);
    
    const cards = await this.getDogCards();
    if (cards.length === 0) {
      // Check if this is an empty state scenario (search with no results)
      const emptyStateSelectors = [
        '[data-testid="empty-state"]',
        '[data-testid="no-results"]', 
        '.empty-state',
        ':text("No dogs found")',
        ':text("No results")',
        ':text("Try different filters")',
        ':text("adjust your search")',
        'div:has-text("No dogs")'
      ];
      
      let hasEmptyState = false;
      for (const selector of emptyStateSelectors) {
        const element = this.page.locator(selector);
        if (await element.count() > 0 && await element.first().isVisible()) {
          hasEmptyState = true;
          break;
        }
      }
      
      if (hasEmptyState) {
        // This is OK - search returned no results
        return;
      } else {
        // Wait a bit longer for possible loading
        await this.page.waitForTimeout(1000);
        const cardsAfterWait = await this.getDogCards();
        if (cardsAfterWait.length === 0) {
          throw new Error('No dog cards found in the dogs grid and no empty state displayed');
        }
        // Cards appeared after waiting
        await expect(cardsAfterWait[0]).toBeVisible();
        return;
      }
    }
    
    // Verify at least the first card is visible
    await expect(cards[0]).toBeVisible();
  }

  async getFirstDogCard(): Promise<Locator> {
    const cards = await this.getDogCards();
    if (cards.length === 0) {
      throw new Error('No dog cards found');
    }
    return cards[0];
  }

  async getDogCardName(card: Locator): Promise<string> {
    const nameElement = card.locator('[data-testid="dog-name"]');
    return await nameElement.textContent() || '';
  }

  async clickFirstDog(): Promise<void> {
    const firstCard = await this.getFirstDogCard();
    // Click on the first navigation link to ensure navigation works
    const dogLink = firstCard.locator('a[href^="/dogs/"]').first();
    await dogLink.click();
  }

  async testDogCardHover(): Promise<boolean> {
    const firstCard = await this.getFirstDogCard();
    await firstCard.hover();
    
    const hasHoverEffect = await firstCard.evaluate(el => {
      const style = window.getComputedStyle(el);
      return style.transform !== 'none' || style.boxShadow !== 'none';
    });
    
    return hasHoverEffect;
  }

  async validateDogCardInformation(card: Locator): Promise<{
    name: string;
    breed: string;
    age: string;
    location: string;
  }> {
    const name = await this.getDogCardName(card);
    const breed = await card.locator('[data-testid="dog-breed"]').textContent() || '';
    const age = await card.locator('[data-testid="dog-age"]').textContent() || '';
    const location = await card.locator('[data-testid="dog-location"]').textContent() || '';
    
    return { name, breed, age, location };
  }

  async testDogCardNavigation(card: Locator): Promise<void> {
    const dogName = await this.getDogCardName(card);
    await card.click();
    
    await this.page.waitForURL(/\/dogs\/[^\/]+$/);
    
    const pageTitle = await this.page.locator('h1').textContent();
    if (!pageTitle?.includes(dogName)) {
      throw new Error(`Navigation failed: Expected page title to contain "${dogName}"`);
    }
  }

  async verifyDogCardBadges(card: Locator): Promise<string[]> {
    const badges = await card.locator('[data-testid="dog-badge"]').all();
    const badgeTexts = [];
    for (const badge of badges) {
      const text = await badge.textContent();
      if (text) badgeTexts.push(text.trim());
    }
    return badgeTexts;
  }

  async validateDogMetadata(expectedMetadata: {
    name?: string;
    breed?: string;
    age?: string;
    size?: string;
    sex?: string;
  }): Promise<void> {
    const page = this.page;
    
    if (expectedMetadata.name) {
      const nameElement = page.locator('[data-testid="dog-name"]');
      await expect(nameElement).toContainText(expectedMetadata.name);
    }
    
    if (expectedMetadata.breed) {
      const breedElement = page.locator('[data-testid="dog-breed-card"]');
      await expect(breedElement).toContainText(expectedMetadata.breed);
    }
    
    if (expectedMetadata.age) {
      const ageElement = page.locator('[data-testid="dog-age-card"]');
      await expect(ageElement).toContainText(expectedMetadata.age);
    }
    
    if (expectedMetadata.size) {
      const sizeElement = page.locator('[data-testid="dog-size-card"]');
      await expect(sizeElement).toContainText(expectedMetadata.size);
    }
    
    if (expectedMetadata.sex) {
      const sexElement = page.locator('[data-testid="dog-sex-card"]');
      await expect(sexElement).toContainText(expectedMetadata.sex);
    }
  }

  async testDogDescriptionDisplay(): Promise<string> {
    const descriptionElement = this.page.locator('[data-testid="about-section"] p');
    await expect(descriptionElement).toBeVisible();
    return await descriptionElement.textContent() || '';
  }

  async validateOrganizationInfo(expectedOrg: {
    name?: string;
    location?: string;
  }): Promise<void> {
    const orgContainer = this.page.locator('[data-testid="organization-container"]');
    
    if (expectedOrg.name) {
      const orgName = orgContainer.locator('h3');
      await expect(orgName).toContainText(expectedOrg.name);
    }
    
    if (expectedOrg.location) {
      const orgLocation = orgContainer.locator('.text-muted-foreground');
      await expect(orgLocation).toContainText(expectedOrg.location);
    }
  }

  async testRelatedDogsInteraction(): Promise<void> {
    const relatedDogsSection = this.page.locator('[data-testid="related-dogs-section"]');
    await expect(relatedDogsSection).toBeVisible();
    
    const relatedCards = relatedDogsSection.locator('[data-testid="dog-card"]');
    const cardCount = await relatedCards.count();
    
    if (cardCount > 0) {
      const firstRelated = relatedCards.first();
      const relatedDogName = await this.getDogCardName(firstRelated);
      await firstRelated.click();
      
      await this.page.waitForURL(/\/dogs\/[^\/]+$/);
      
      const newPageTitle = await this.page.locator('h1').textContent();
      if (!newPageTitle?.includes(relatedDogName)) {
        throw new Error(`Related dog navigation failed: Expected page title to contain "${relatedDogName}"`);
      }
    }
  }

  async testAdoptionCTAClick(): Promise<void> {
    const adoptButton = this.page.locator('[data-testid="adopt-button"]');
    await expect(adoptButton).toBeVisible();
    
    const adoptUrl = await adoptButton.getAttribute('href');
    if (!adoptUrl || !adoptUrl.startsWith('http')) {
      throw new Error('Adoption button does not have a valid external URL');
    }
    
    const target = await adoptButton.getAttribute('target');
    if (target !== '_blank') {
      throw new Error('Adoption button should open in a new tab');
    }
  }

  async validateExternalAdoptionLinks(): Promise<void> {
    const adoptButton = this.page.locator('[data-testid="adopt-button"]');
    const contactButton = this.page.locator('[data-testid="contact-organization-button"]');
    
    if (await adoptButton.isVisible()) {
      const adoptUrl = await adoptButton.getAttribute('href');
      if (adoptUrl && !adoptUrl.startsWith('http')) {
        throw new Error('Adoption URL is not external');
      }
    }
    
    if (await contactButton.isVisible()) {
      const contactUrl = await contactButton.getAttribute('href');
      if (contactUrl && !contactUrl.startsWith('http') && !contactUrl.startsWith('mailto:')) {
        throw new Error('Contact URL is not external or email');
      }
    }
  }
}

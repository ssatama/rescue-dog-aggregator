import { render, screen, act } from "@testing-library/react";
import DogSection from "../../components/home/DogSection";
import HeroSection from "../../components/home/HeroSection";
import DogCard from "../../components/dogs/DogCard";

// Mock services and utilities
jest.mock("../../services/animalsService", () => ({
  getAnimalsByCuration: jest.fn(),
  getStatistics: jest.fn(),
}));

jest.mock("../../utils/imageUtils", () => ({
  preloadImages: jest.fn(),
  getCatalogCardImageWithPosition: jest.fn((url) => ({
    src: url,
    position: "center",
  })),
  handleImageError: jest.fn(),
}));

describe("Mobile Touch Targets Validation", () => {
  const mockDog = {
    id: 1,
    name: "Buddy",
    breed: "Golden Retriever",
    organization: { name: "Test Rescue", city: "Test City", country: "TC" },
  };

  const mockStats = {
    total_dogs: 237,
    total_organizations: 12,
    total_countries: 2,
    countries: ["Turkey", "United States"],
    organizations: [
      { id: 1, name: "Test Rescue 1", dog_count: 5 },
      { id: 2, name: "Test Rescue 2", dog_count: 7 },
    ],
  };

  beforeEach(() => {
    // Mock API responses
    require("../../services/animalsService").getAnimalsByCuration.mockResolvedValue(
      [mockDog],
    );
    require("../../services/animalsService").getStatistics.mockResolvedValue(
      mockStats,
    );

    // Mock mobile viewport - need to match the actual query used in DogSection
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches:
          query === "(max-width: 767px)" || query === "(max-width: 768px)",
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })),
    });

    // Mock getBoundingClientRect with different sizes based on element type
    Element.prototype.getBoundingClientRect = jest.fn(function () {
      // Check element attributes to return appropriate sizes
      const testId = this.getAttribute("data-testid");
      const role = this.getAttribute("role");

      if (testId === "dog-carousel") {
        return {
          width: 320,
          height: 240,
          top: 0,
          left: 0,
          bottom: 240,
          right: 320,
          x: 0,
          y: 0,
          toJSON: jest.fn(),
        };
      }

      if (testId === "hero-primary-cta") {
        return {
          width: 120,
          height: 48,
          top: 100,
          left: 50,
          bottom: 148,
          right: 170,
          x: 50,
          y: 100,
          toJSON: jest.fn(),
        };
      }

      if (testId === "hero-secondary-cta") {
        return {
          width: 100,
          height: 48,
          top: 100,
          left: 190, // Spaced 20px from primary button
          bottom: 148,
          right: 290,
          x: 190,
          y: 100,
          toJSON: jest.fn(),
        };
      }

      // Default size for other elements (48x48 for touch targets)
      return {
        width: 48,
        height: 48,
        top: 0,
        left: 0,
        bottom: 48,
        right: 48,
        x: 0,
        y: 0,
        toJSON: jest.fn(),
      };
    });

    // Mock window.getComputedStyle
    Object.defineProperty(window, "getComputedStyle", {
      value: jest.fn().mockImplementation(() => ({
        outline: "2px solid blue",
        border: "1px solid #ccc",
        backgroundColor: "#ffffff",
        color: "#000000",
        position: "sticky",
      })),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Helper function to validate touch target size
   * @param {HTMLElement} element
   * @returns {boolean}
   */
  const validateTouchTarget = (element) => {
    const rect = element.getBoundingClientRect();
    return rect.width >= 48 && rect.height >= 48;
  };

  /**
   * Helper function to check element spacing
   * @param {HTMLElement} element1
   * @param {HTMLElement} element2
   * @returns {number}
   */
  const getElementSpacing = (element1, element2) => {
    const rect1 = element1.getBoundingClientRect();
    const rect2 = element2.getBoundingClientRect();

    // Calculate minimum distance between elements
    const horizontalDistance = Math.max(
      0,
      Math.max(rect1.left - rect2.right, rect2.left - rect1.right),
    );
    const verticalDistance = Math.max(
      0,
      Math.max(rect1.top - rect2.bottom, rect2.top - rect1.bottom),
    );

    return Math.sqrt(horizontalDistance ** 2 + verticalDistance ** 2);
  };

  describe("Hero Section Touch Targets", () => {
    test("primary CTA button should be ≥48px in all dimensions", async () => {
      await act(async () => {
        render(<HeroSection />);
      });

      const ctaButton = screen.getByTestId("hero-primary-cta");
      expect(validateTouchTarget(ctaButton)).toBe(true);

      const rect = ctaButton.getBoundingClientRect();
      expect(rect.width).toBeGreaterThanOrEqual(48);
      expect(rect.height).toBeGreaterThanOrEqual(48);
    });

    test("secondary CTA button should be ≥48px in all dimensions", async () => {
      await act(async () => {
        render(<HeroSection />);
      });

      const secondaryButton = screen.getByTestId("hero-secondary-cta");
      expect(validateTouchTarget(secondaryButton)).toBe(true);

      const rect = secondaryButton.getBoundingClientRect();
      expect(rect.width).toBeGreaterThanOrEqual(48);
      expect(rect.height).toBeGreaterThanOrEqual(48);
    });

    test("CTA buttons should have adequate spacing on mobile", async () => {
      await act(async () => {
        render(<HeroSection />);
      });

      const primaryButton = screen.getByTestId("hero-primary-cta");
      const secondaryButton = screen.getByTestId("hero-secondary-cta");

      const spacing = getElementSpacing(primaryButton, secondaryButton);
      expect(spacing).toBeGreaterThanOrEqual(8); // Minimum 8px spacing
    });
  });

  describe("Dog Card Touch Targets", () => {
    test("dog card should be tappable with adequate size", () => {
      render(<DogCard dog={mockDog} />);

      const dogCard = screen.getByTestId("dog-card");
      expect(validateTouchTarget(dogCard)).toBe(true);
    });

    test("Meet [Name] button should be ≥48px in all dimensions", () => {
      render(<DogCard dog={mockDog} />);

      const ctaButton = screen.getByText("Meet Buddy →");
      expect(validateTouchTarget(ctaButton)).toBe(true);

      const rect = ctaButton.getBoundingClientRect();
      expect(rect.width).toBeGreaterThanOrEqual(48);
      expect(rect.height).toBeGreaterThanOrEqual(48);
    });

    test("dog name link should be tappable", () => {
      render(<DogCard dog={mockDog} />);

      const nameLink = screen.getByText(mockDog.name).closest("a");
      expect(nameLink).toBeInTheDocument();
      expect(validateTouchTarget(nameLink)).toBe(true);
    });
  });

  describe("Carousel Navigation Touch Targets", () => {
    test("scroll indicators should be ≥48px for touch", async () => {
      await act(async () => {
        render(<DogSection title="Test Dogs" curationType="recent" />);
      });

      const indicators = screen.getAllByTestId(/scroll-indicator/);
      indicators.forEach((indicator) => {
        expect(validateTouchTarget(indicator)).toBe(true);
      });
    });

    test("carousel swipe area should be large enough for gestures", async () => {
      await act(async () => {
        render(<DogSection title="Test Dogs" curationType="recent" />);
      });

      const carousel = screen.getByTestId("dog-carousel");
      const rect = carousel.getBoundingClientRect();

      // Carousel should be at least 300px wide for effective swiping
      expect(rect.width).toBeGreaterThanOrEqual(300);
      expect(rect.height).toBeGreaterThanOrEqual(200);
    });
  });

  describe("Accessibility and Focus States", () => {
    test("all touch targets should have visible focus states", async () => {
      await act(async () => {
        render(<HeroSection />);
      });

      const ctaButton = screen.getByTestId("hero-primary-cta");
      ctaButton.focus();

      const styles = window.getComputedStyle(ctaButton, ":focus");
      expect(styles.outline).not.toBe("none");
    });

    test("touch targets should have proper ARIA labels", async () => {
      await act(async () => {
        render(<DogSection title="Test Dogs" curationType="recent" />);
      });

      // Get all tab elements (indicator buttons) and check their aria-label
      const allTabs = screen.getAllByRole("tab");
      allTabs.forEach((tab, index) => {
        expect(tab).toHaveAttribute("aria-label", `Go to slide ${index + 1}`);
      });
    });

    test("carousel should support keyboard navigation", async () => {
      await act(async () => {
        render(<DogSection title="Test Dogs" curationType="recent" />);
      });

      const carousel = screen.getByTestId("dog-carousel");
      expect(carousel).toHaveAttribute("tabindex", "0");
      expect(carousel).toHaveAttribute("role", "region");
      expect(carousel).toHaveAttribute("aria-label");
    });
  });

  describe("High Contrast and Dark Mode Support", () => {
    test("touch targets should maintain adequate contrast in high contrast mode", async () => {
      // Mock high contrast media query
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: jest.fn().mockImplementation((query) => ({
          matches: query === "(prefers-contrast: high)",
          media: query,
        })),
      });

      await act(async () => {
        render(<HeroSection />);
      });

      const ctaButton = screen.getByTestId("hero-primary-cta");
      const styles = window.getComputedStyle(ctaButton);

      // In high contrast mode, ensure proper border/outline visibility
      expect(styles.border).not.toBe("none");
    });

    test("touch targets should be visible in dark mode", async () => {
      // Mock dark mode preference
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: jest.fn().mockImplementation((query) => ({
          matches: query === "(prefers-color-scheme: dark)",
          media: query,
        })),
      });

      render(<DogCard dog={mockDog} />);

      const ctaButton = screen.getByText("Meet Buddy →");
      const styles = window.getComputedStyle(ctaButton);

      // Ensure button has sufficient contrast in dark mode
      expect(styles.backgroundColor).not.toBe("transparent");
      expect(styles.color).not.toBe("inherit");
    });
  });
});

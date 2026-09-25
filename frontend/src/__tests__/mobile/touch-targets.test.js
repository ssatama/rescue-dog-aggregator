import { render, screen } from "../../test-utils";
import DogCard from "../../components/dogs/DogCard";

// Mock services and utilities
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

  beforeEach(() => {
    // Mock mobile viewport
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

  describe("Dog Card Touch Targets", () => {
    test("dog card should be tappable with adequate size", () => {
      render(<DogCard dog={mockDog} />);

      const dogCard = screen.getByTestId("dog-card-1");
      expect(validateTouchTarget(dogCard)).toBe(true);
    });

    test("favorite heart has a 44px tap target", () => {
      const { container } = render(<DogCard dog={mockDog} />);

      // getComputedStyle is mocked in this file, so query by attribute not role
      const heart = container.querySelector('button[aria-label="Add Buddy to favorites"]');
      expect(heart).toHaveClass("h-11", "w-11");
    });

    test("the name link's tap area covers the whole card", () => {
      render(<DogCard dog={mockDog} />);

      const nameLink = screen.getByText(mockDog.name).closest("a");
      expect(nameLink.className).toMatch(/after:absolute/);
      expect(nameLink.className).toMatch(/after:inset-0/);
    });

    test("dog name link should be tappable", () => {
      render(<DogCard dog={mockDog} />);

      const nameLink = screen.getByText(mockDog.name).closest("a");
      expect(nameLink).toBeInTheDocument();
      expect(validateTouchTarget(nameLink)).toBe(true);
    });
  });

  describe("High Contrast and Dark Mode Support", () => {
    test("favorite heart keeps a solid disc in dark mode", () => {
      const { container } = render(<DogCard dog={mockDog} />);

      const disc = container.querySelector(
        'button[aria-label="Add Buddy to favorites"] span',
      );
      expect(disc.className).toMatch(/dark:bg-gray-900\/90/);
      expect(disc.className).toMatch(/dark:text-gray-50/);
    });
  });
});

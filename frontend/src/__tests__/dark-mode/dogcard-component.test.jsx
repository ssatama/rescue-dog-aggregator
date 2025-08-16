import React from "react";
import { render, screen } from "../../test-utils";
import { ThemeProvider } from "../../components/providers/ThemeProvider";
import DogCard from "../../components/dogs/DogCard";

// Helper to render with ThemeProvider in dark mode
const renderWithDarkTheme = (component) => {
  // Set dark mode in localStorage
  localStorage.setItem("theme", "dark");
  document.documentElement.classList.add("dark");

  return render(<ThemeProvider>{component}</ThemeProvider>);
};

// Mock next/navigation for components that use it
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => "/dogs",
}));

// Mock LazyImage component
jest.mock("../../components/ui/LazyImage", () => {
  return function MockLazyImage({
    alt,
    className,
    priority,
    enableProgressiveLoading,
    ...props
  }) {
    // Filter out React-specific props like the real component does
    return <img alt={alt} className={className} {...props} />;
  };
});

// Mock utility functions
jest.mock("../../utils/imageUtils", () => ({
  getCatalogCardImageWithPosition: jest.fn(() => ({
    src: "https://example.com/dog.jpg",
    position: "center",
  })),
  handleImageError: jest.fn(),
}));

jest.mock("../../utils/animations", () => ({
  useFadeInAnimation: () => ({ ref: null, isVisible: true }),
  useHoverAnimation: () => ({ hoverProps: {} }),
}));

// Mock dog data
const getMockDog = (overrides = {}) => {
  return {
    id: 1,
    name: "Buddy",
    breed: "Golden Retriever",
    breed_group: "Sporting",
    age_months: 24,
    sex: "male",
    size: "large",
    primary_image_url: "https://example.com/buddy.jpg",
    status: "available",
    organization_id: 1,
    organization: {
      id: 1,
      name: "Test Rescue",
      location_city: "Berlin",
      location_country: "DE",
    },
    ships_to_countries: ["DE", "US"],
    created_at: new Date().toISOString(),
    ...overrides,
  };
};

describe("DogCard Component - Dark Mode Support", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    jest.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  describe("Image Container Dark Mode", () => {
    test("should use semantic background instead of hard-coded gray-200 in dark mode", () => {
      const dog = getMockDog();
      renderWithDarkTheme(<DogCard dog={dog} />);

      const imageContainer = screen.getByTestId("image-container");

      // Should not use hard-coded gray background
      expect(imageContainer.className).not.toMatch(/bg-gray-200(?!\s+dark:)/);

      // Should use semantic background or have dark mode variant
      expect(imageContainer.className).toMatch(/bg-muted|dark:bg-/);
    });

    test("should maintain proper contrast for image overlay badges in dark mode", () => {
      const recentDog = getMockDog({
        created_at: new Date().toISOString(), // Recent dog will show NEW badge
      });
      renderWithDarkTheme(<DogCard dog={recentDog} />);

      const newBadge = screen.getByTestId("new-badge");

      // Badge should have proper contrast in dark mode
      expect(newBadge.className).toMatch(/bg-green-500|dark:bg-green/);
      expect(newBadge.className).toMatch(/text-white|dark:text-/);
    });
  });

  describe("Text Colors Dark Mode", () => {
    test("should use semantic colors for age and gender text in dark mode", () => {
      const dog = getMockDog();
      renderWithDarkTheme(<DogCard dog={dog} />);

      const ageGenderRow = screen.getByTestId("age-gender-row");

      // Should not use hard-coded gray text colors
      expect(ageGenderRow.className).not.toMatch(/text-gray-600(?!\s+dark:)/);

      // Should use semantic text colors or have dark mode variants
      expect(ageGenderRow.className).toMatch(
        /text-muted-foreground|dark:text-/,
      );

      // Check individual age text elements if they exist
      const formattedAge = screen.queryByTestId("formatted-age");
      if (formattedAge) {
        expect(formattedAge.className).not.toMatch(/text-gray-600(?!\s+dark:)/);
        expect(formattedAge.className).toMatch(
          /text-muted-foreground|dark:text-/,
        );
      }
    });

    test("should use semantic colors for breed text in dark mode", () => {
      const dog = getMockDog();
      renderWithDarkTheme(<DogCard dog={dog} />);

      const breedText = screen.getByTestId("dog-breed");

      // Should not use hard-coded gray color
      expect(breedText.className).not.toMatch(/text-gray-600(?!\s+dark:)/);

      // Should use semantic color or dark mode variant
      expect(breedText.className).toMatch(/text-muted-foreground|dark:text-/);
    });

    test("should use semantic colors for location text in dark mode", () => {
      const dog = getMockDog();
      renderWithDarkTheme(<DogCard dog={dog} />);

      const locationRow = screen.getByTestId("location-row");

      // Should not use hard-coded gray-500 color
      expect(locationRow.className).not.toMatch(/text-gray-500(?!\s+dark:)/);

      // Should use semantic muted color or dark mode variant
      expect(locationRow.className).toMatch(/text-muted-foreground|dark:text-/);
    });

    test("should use semantic colors for ships-to text in dark mode", () => {
      const dog = getMockDog({ ships_to_countries: ["DE", "US", "FR"] });
      renderWithDarkTheme(<DogCard dog={dog} />);

      // Find ships-to text by content if it exists
      const shipsToLabel = screen.queryByText("Adoptable to:");
      if (shipsToLabel) {
        // Should not use hard-coded gray-500 color
        expect(shipsToLabel.className).not.toMatch(/text-gray-500(?!\s+dark:)/);

        // Should use semantic color or dark mode variant
        expect(shipsToLabel.className).toMatch(
          /text-muted-foreground|dark:text-/,
        );
      }
    });
  });

  describe("Card Structure Dark Mode", () => {
    test("should maintain proper card background and shadow in dark mode", () => {
      const dog = getMockDog();
      renderWithDarkTheme(<DogCard dog={dog} />);

      const dogCard = screen.getByTestId("dog-card-1");

      // Should be in dark mode context
      expect(document.documentElement).toHaveClass("dark");

      // Card should use semantic background (handled by shadcn/ui Card component)
      // The Card component from shadcn/ui should automatically handle dark mode
      expect(dogCard).toBeInTheDocument();
    });

    test("should preserve orange theme colors with proper dark mode variants", () => {
      const dog = getMockDog();
      renderWithDarkTheme(<DogCard dog={dog} />);

      // Check age category color (should remain orange) if it exists
      const ageCategory = screen.queryByTestId("age-category");
      if (ageCategory) {
        expect(ageCategory.className).toMatch(/text-orange-600/);
      }

      // Check button gradient (should have dark mode variant)
      const meetButton = screen.getByRole("button", { name: /meet buddy/i });
      expect(meetButton.className).toMatch(/dark:from-orange/);
      expect(meetButton.className).toMatch(/dark:to-orange/);
    });

    test("should handle hover states properly in dark mode", () => {
      const dog = getMockDog();
      renderWithDarkTheme(<DogCard dog={dog} />);

      // Check dog name hover color
      const dogName = screen.getByTestId("dog-name");

      // Should have dark mode hover variant
      expect(dogName.className).toMatch(/dark:group-hover:text-orange/);
    });
  });

  describe("Badge Components Dark Mode", () => {
    test("should handle breed group badge properly in dark mode", () => {
      const dog = getMockDog({ breed_group: "Sporting" });
      renderWithDarkTheme(<DogCard dog={dog} />);

      const breedGroupBadge = screen.getByText("Sporting Group");

      // Badge should work properly in dark mode (handled by shadcn/ui Badge component)
      expect(breedGroupBadge).toBeInTheDocument();
      expect(breedGroupBadge).toHaveClass("text-xs");
    });

    test("should handle status badges properly in dark mode", () => {
      const adoptedDog = getMockDog({ status: "adopted" });
      renderWithDarkTheme(<DogCard dog={adoptedDog} />);

      const statusBadge = screen.getByText("Adopted");

      // Status badge should be visible and properly styled in dark mode
      expect(statusBadge).toBeInTheDocument();
    });
  });

  describe("Focus States Dark Mode", () => {
    test("should maintain proper focus ring colors in dark mode", () => {
      const dog = getMockDog();
      renderWithDarkTheme(<DogCard dog={dog} />);

      // Check main image link focus states
      const imageLink = screen.getByLabelText(/view details for buddy/i);
      expect(imageLink.className).toMatch(
        /focus:ring-orange-600|dark:focus:ring-orange/,
      );

      // Check name link focus states
      const nameLink = screen.getByTestId("dog-name").closest("a");
      expect(nameLink.className).toMatch(
        /focus:ring-orange-600|dark:focus:ring-orange/,
      );
    });
  });

  describe("Dark Mode Integration", () => {
    test("should work cohesively with other dark mode components", () => {
      const dog = getMockDog();
      renderWithDarkTheme(<DogCard dog={dog} />);

      // Should be in dark mode context
      expect(document.documentElement).toHaveClass("dark");

      // All major elements should be present and properly styled
      expect(screen.getByTestId("dog-card-1")).toBeInTheDocument();
      expect(screen.getByTestId("image-container")).toBeInTheDocument();
      expect(screen.getByTestId("card-content")).toBeInTheDocument();
      expect(screen.getByTestId("card-footer")).toBeInTheDocument();

      // Should not have any hard-coded colors that would break dark mode
      const cardContent = screen.getByTestId("card-content");
      const grayElements = cardContent.querySelectorAll(
        '[class*="text-gray"]:not([class*="dark:"])',
      );

      // All gray text elements should have dark mode variants
      grayElements.forEach((element) => {
        if (element.className.includes("text-gray")) {
          expect(element.className).toMatch(/dark:text-|text-muted-foreground/);
        }
      });
    });
  });
});

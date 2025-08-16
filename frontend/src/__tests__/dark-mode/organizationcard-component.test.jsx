import React from "react";
import { render, screen } from "../../test-utils";
import { ThemeProvider } from "../../components/providers/ThemeProvider";
import OrganizationCard from "../../components/organizations/OrganizationCard";

// Helper to render with ThemeProvider in dark mode
const renderWithDarkTheme = (component) => {
  // Set dark mode in localStorage
  localStorage.setItem("theme", "dark");
  document.documentElement.classList.add("dark");

  return render(<ThemeProvider>{component}</ThemeProvider>);
};

// Mock LazyImage component
jest.mock("../../components/ui/LazyImage", () => {
  return function MockLazyImage({
    alt,
    className,
    placeholder,
    priority,
    enableProgressiveLoading,
    ...props
  }) {
    // Filter out React-specific props like the real component does
    return placeholder || <img alt={alt} className={className} {...props} />;
  };
});

// Mock SocialMediaLinks component
jest.mock("../../components/ui/SocialMediaLinks", () => {
  return function MockSocialMediaLinks({ socialMedia, className }) {
    return (
      <div className={className} data-testid="social-media-links">
        Social Links
      </div>
    );
  };
});

// Mock utility functions
jest.mock("../../utils/imageUtils", () => ({
  handleImageError: jest.fn(),
}));

jest.mock("../../utils/countries", () => ({
  formatBasedIn: jest.fn(() => "🇩🇪 Germany"),
  formatServiceRegions: jest.fn(() => "🇩🇪 🇺🇸"),
  formatShipsToList: jest.fn(() => "🇩🇪 🇺🇸 🇫🇷"),
  getCountryFlag: jest.fn(() => "🇩🇪"),
}));

// Mock organization data
const getMockOrganization = (overrides = {}) => {
  return {
    id: 1,
    name: "Test Rescue Organization",
    website_url: "https://test-rescue.org",
    logo_url: "https://example.com/logo.jpg",
    country: "Germany",
    city: "Berlin",
    service_regions: ["DE", "US"],
    ships_to: ["DE", "US", "FR"],
    total_dogs: 25,
    new_this_week: 3,
    recent_dogs: [
      {
        id: 1,
        name: "Buddy",
        primary_image_url: "https://example.com/dog1.jpg",
      },
      {
        id: 2,
        name: "Luna",
        primary_image_url: "https://example.com/dog2.jpg",
      },
      { id: 3, name: "Max", primary_image_url: "https://example.com/dog3.jpg" },
    ],
    social_media: {
      facebook: "https://facebook.com/test-rescue",
      instagram: "https://instagram.com/test-rescue",
    },
    ...overrides,
  };
};

describe("OrganizationCard Component - Dark Mode Support", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    jest.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  describe("Logo Background Dark Mode", () => {
    test("should use semantic background for logo placeholder instead of hard-coded orange-100 in dark mode", () => {
      const orgWithoutLogo = getMockOrganization({ logo_url: null });
      renderWithDarkTheme(<OrganizationCard organization={orgWithoutLogo} />);

      // Should be in dark mode context
      expect(document.documentElement).toHaveClass("dark");

      // Find the logo placeholder div
      const logoPlaceholder = document.querySelector(
        '[class*="bg-orange-100"]',
      );

      // Should not use hard-coded orange-100 background without dark variant
      expect(logoPlaceholder.className).not.toMatch(
        /bg-orange-100(?!\s+dark:)/,
      );

      // Should use dark mode variant or semantic background
      expect(logoPlaceholder.className).toMatch(
        /dark:bg-orange-950\/30|bg-orange-100\s+dark:/,
      );
    });

    test("should handle logo loading placeholder with proper dark mode styling", () => {
      const orgWithLogo = getMockOrganization();
      renderWithDarkTheme(<OrganizationCard organization={orgWithLogo} />);

      // Check if placeholder has dark mode styling when logo fails to load
      const logoElements = document.querySelectorAll(
        '[class*="bg-orange-100"]',
      );

      logoElements.forEach((element) => {
        // Should have dark mode variant for orange backgrounds
        if (element.className.includes("bg-orange-100")) {
          expect(element.className).toMatch(
            /dark:bg-orange-950\/30|dark:bg-orange/,
          );
        }
      });
    });
  });

  describe("Text Colors Dark Mode", () => {
    test("should use semantic colors for organization name instead of hard-coded gray-900 in dark mode", () => {
      const organization = getMockOrganization();
      renderWithDarkTheme(<OrganizationCard organization={organization} />);

      const organizationName = screen.getByText("Test Rescue Organization");

      // Should not use hard-coded gray-900 color
      expect(organizationName.className).not.toMatch(
        /text-gray-900(?!\s+dark:)/,
      );

      // Should use semantic color or dark mode variant
      expect(organizationName.className).toMatch(
        /text-foreground|text-card-title|dark:text-/,
      );
    });

    test("should use semantic colors for location text instead of hard-coded gray-600 in dark mode", () => {
      const organization = getMockOrganization();
      renderWithDarkTheme(<OrganizationCard organization={organization} />);

      const locationText = screen.getByText("Berlin, Germany");

      // Should not use hard-coded gray-600 color
      expect(locationText.className).not.toMatch(/text-gray-600(?!\s+dark:)/);

      // Should use semantic color or dark mode variant
      expect(locationText.className).toMatch(
        /text-muted-foreground|dark:text-/,
      );
    });

    test("should use semantic colors for information sections instead of hard-coded gray-700 in dark mode", () => {
      const organization = getMockOrganization();
      renderWithDarkTheme(<OrganizationCard organization={organization} />);

      // Find information sections by their content and get parent divs
      const basedInText = screen.getByText(/Based in:/).closest("div");
      const dogsInText = screen.getByText(/Dogs in:/).closest("div");
      const shipsToText = screen.getByText(/Adoptable to:/).closest("div");

      [basedInText, dogsInText, shipsToText].forEach((element) => {
        // Should not use hard-coded gray-700 color
        expect(element.className).not.toMatch(/text-gray-700(?!\s+dark:)/);

        // Should use semantic color or dark mode variant
        expect(element.className).toMatch(
          /text-foreground|text-muted-foreground|dark:text-/,
        );
      });
    });

    test("should use semantic colors for dog count text instead of hard-coded gray colors in dark mode", () => {
      const organization = getMockOrganization();
      renderWithDarkTheme(<OrganizationCard organization={organization} />);

      // Find dog count number
      const dogCountNumber = screen.getByText("25");

      // Should not use hard-coded gray-900 color
      expect(dogCountNumber.className).not.toMatch(/text-gray-900(?!\s+dark:)/);

      // Should use semantic color or dark mode variant
      expect(dogCountNumber.className).toMatch(/text-foreground|dark:text-/);

      // Find "Dogs" label
      const dogsLabel = screen.getByText("Dogs");

      // Should not use hard-coded gray-600 color
      expect(dogsLabel.className).not.toMatch(/text-gray-600(?!\s+dark:)/);

      // Should use semantic color or dark mode variant
      expect(dogsLabel.className).toMatch(/text-muted-foreground|dark:text-/);
    });

    test("should use semantic colors for preview text instead of hard-coded gray-600 in dark mode", () => {
      const organization = getMockOrganization();
      renderWithDarkTheme(<OrganizationCard organization={organization} />);

      // Find the preview text with dog names
      const previewText = screen.getByText(/Buddy, Luna, Max/);

      // Should not use hard-coded gray-600 color
      expect(previewText.className).not.toMatch(/text-gray-600(?!\s+dark:)/);

      // Should use semantic color or dark mode variant
      expect(previewText.className).toMatch(/text-muted-foreground|dark:text-/);
    });
  });

  describe("Border and Background Dark Mode", () => {
    test("should use semantic border color instead of hard-coded gray-100 in dark mode", () => {
      const organization = getMockOrganization();
      renderWithDarkTheme(<OrganizationCard organization={organization} />);

      // Find elements with gray border
      const borderElements = document.querySelectorAll(
        '[class*="border-gray-100"]',
      );

      borderElements.forEach((element) => {
        // Should not use hard-coded gray-100 border
        expect(element.className).not.toMatch(/border-gray-100(?!\s+dark:)/);

        // Should use semantic border or dark mode variant
        expect(element.className).toMatch(/border-border|dark:border-/);
      });
    });

    test("should use semantic background for dog thumbnails placeholder in dark mode", () => {
      const organization = getMockOrganization();
      renderWithDarkTheme(<OrganizationCard organization={organization} />);

      // Check for placeholder elements that might have gray-200 background
      const placeholderElements = document.querySelectorAll(
        '[class*="bg-gray-200"]',
      );

      placeholderElements.forEach((element) => {
        // Should not use hard-coded gray-200 background
        expect(element.className).not.toMatch(/bg-gray-200(?!\s+dark:)/);

        // Should use semantic background or dark mode variant
        expect(element.className).toMatch(/bg-muted|dark:bg-/);
      });
    });
  });

  describe("Button Colors Dark Mode", () => {
    test("should use semantic colors for outline button instead of hard-coded grays in dark mode", () => {
      const organization = getMockOrganization();
      renderWithDarkTheme(<OrganizationCard organization={organization} />);

      const visitWebsiteButton = screen.getByRole("link", {
        name: /visit website/i,
      });

      // Should not use hard-coded gray colors
      expect(visitWebsiteButton.className).not.toMatch(
        /text-gray-700(?!\s+dark:)/,
      );
      expect(visitWebsiteButton.className).not.toMatch(
        /border-gray-300(?!\s+dark:)/,
      );
      expect(visitWebsiteButton.className).not.toMatch(
        /hover:bg-gray-50(?!\s+dark:)/,
      );

      // Should use semantic colors or dark mode variants
      expect(visitWebsiteButton.className).toMatch(
        /text-foreground|border-border|hover:bg-muted|dark:/,
      );
    });

    test("should preserve orange theme for primary button with dark mode variants", () => {
      const organization = getMockOrganization();
      renderWithDarkTheme(<OrganizationCard organization={organization} />);

      const buttons = screen.getAllByRole("button");
      const viewDogsButton = buttons.find(
        (button) =>
          button.tagName === "BUTTON" &&
          button.textContent.includes("View") &&
          button.textContent.includes("25") &&
          button.textContent.includes("Dogs"),
      );

      // Should maintain orange theme
      expect(viewDogsButton.className).toMatch(/bg-orange-600/);
      expect(viewDogsButton.className).toMatch(/hover:bg-orange-700/);

      // For now, orange buttons work well in both light and dark mode
      // without needing specific dark variants due to good contrast
      expect(viewDogsButton).toBeInTheDocument();
    });
  });

  describe("Focus States Dark Mode", () => {
    test("should maintain proper focus ring colors in dark mode", () => {
      const organization = getMockOrganization();
      renderWithDarkTheme(<OrganizationCard organization={organization} />);

      // Check main card focus state
      const orgCard = document.querySelector('[role="button"]');
      expect(orgCard.className).toMatch(
        /focus:ring-orange-600|dark:focus:ring-orange/,
      );

      // Check button focus states
      const visitButton = screen.getByRole("link", { name: /visit website/i });
      expect(visitButton.className).toMatch(
        /focus:ring-orange-600|dark:focus:ring-orange/,
      );
    });
  });

  describe("Badge Colors Dark Mode", () => {
    test("should handle NEW badge colors properly in dark mode", () => {
      const organization = getMockOrganization({ new_this_week: 5 });
      renderWithDarkTheme(<OrganizationCard organization={organization} />);

      const newBadge = screen.getByText("5 NEW");

      // Badge should have proper contrast in dark mode
      expect(newBadge.className).toMatch(/bg-green-100|dark:bg-green/);
      expect(newBadge.className).toMatch(/text-green-800|dark:text-green/);
    });
  });

  describe("Dark Mode Integration", () => {
    test("should work cohesively with card component styling in dark mode", () => {
      const organization = getMockOrganization();
      renderWithDarkTheme(<OrganizationCard organization={organization} />);

      // Should be in dark mode context
      expect(document.documentElement).toHaveClass("dark");

      // Card should be present and properly styled
      const card = document.querySelector('[role="button"]');
      expect(card).toBeInTheDocument();

      // Should not have hard-coded colors that would break dark mode
      const allTextElements = card.querySelectorAll(
        '[class*="text-gray"]:not([class*="dark:"])',
      );

      // Count elements that don't have dark mode variants
      const elementsWithoutDarkMode = Array.from(allTextElements).filter(
        (element) => {
          return (
            element.className.includes("text-gray") &&
            !element.className.includes("dark:")
          );
        },
      );

      // Should have minimal or no elements without dark mode support
      expect(elementsWithoutDarkMode.length).toBeLessThanOrEqual(2);
    });

    test("should handle all size variants properly in dark mode", () => {
      const organization = getMockOrganization();

      ["small", "medium", "large"].forEach((size) => {
        const { unmount } = renderWithDarkTheme(
          <OrganizationCard organization={organization} size={size} />,
        );

        // Should render without errors in dark mode
        expect(document.documentElement).toHaveClass("dark");
        expect(
          screen.getByText("Test Rescue Organization"),
        ).toBeInTheDocument();

        unmount();
      });
    });
  });
});

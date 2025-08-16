// src/components/organizations/__tests__/EnhancedOrganizationCard.test.jsx

import React from "react";
import { render, screen, fireEvent } from "../../../test-utils";
import "@testing-library/jest-dom";
import OrganizationCard from "../OrganizationCard";

// Mock Next.js components
jest.mock("next/link", () => {
  return function MockedLink({ children, href, ...props }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

// Mock LazyImage component
jest.mock("../../ui/LazyImage", () => {
  return function MockedLazyImage({
    src,
    alt,
    className,
    onError,
    placeholder,
  }) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        onError={onError}
        data-testid="lazy-image"
      />
    );
  };
});

// Mock SocialMediaLinks component
jest.mock("../../ui/SocialMediaLinks", () => {
  return function MockedSocialMediaLinks({ socialMedia, className, size }) {
    return (
      <div data-testid="social-media-links" className={className}>
        {Object.keys(socialMedia || {}).map((platform) => (
          <span key={platform} data-testid={`social-${platform}`}>
            {platform}
          </span>
        ))}
      </div>
    );
  };
});

// Mock countries utility
jest.mock("../../../utils/countries", () => ({
  formatBasedIn: jest.fn((country, city, abbreviate) =>
    abbreviate ? `🇹🇷 ${country}` : `🇹🇷 Turkey`,
  ),
  formatServiceRegions: jest.fn((regions, showNames, abbreviate) =>
    abbreviate ? "🇹🇷 TR, 🇷🇴 RO" : "🇹🇷 Turkey, 🇷🇴 Romania",
  ),
  formatShipsToList: jest.fn((countries, maxShow) =>
    countries.length <= maxShow ? "🇩🇪 🇳🇱 🇧🇪" : "🇩🇪 🇳🇱 🇧🇪 +2 more",
  ),
  getCountryFlag: jest.fn((code) => (code === "TR" ? "🇹🇷" : "🇩🇪")),
}));

describe("EnhancedOrganizationCard", () => {
  const mockOrganization = {
    id: 1,
    name: "Pets in Turkey",
    website_url: "https://petsinturkey.org",
    logo_url: "https://example.com/logo.jpg",
    country: "TR",
    city: "Istanbul",
    service_regions: ["TR", "RO"],
    ships_to: ["DE", "NL", "BE", "FR", "AT"],
    total_dogs: 33,
    new_this_week: 3,
    recent_dogs: [
      { id: 1, name: "Buddy", thumbnail_url: "https://example.com/dog1.jpg" },
      { id: 2, name: "Max", thumbnail_url: "https://example.com/dog2.jpg" },
      { id: 3, name: "Luna", thumbnail_url: "https://example.com/dog3.jpg" },
    ],
    social_media: {
      facebook: "petsinturkey",
      instagram: "petsinturkey_ig",
    },
  };

  describe("Basic Rendering", () => {
    test("renders organization card with all main elements", () => {
      render(<OrganizationCard organization={mockOrganization} />);

      // Check organization name and location
      expect(screen.getByText("Pets in Turkey")).toBeInTheDocument();
      expect(screen.getByText("Istanbul, TR")).toBeInTheDocument();

      // Check if it's clickable as a button (should find the main card button)
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThanOrEqual(1); // Card + View Dogs button
    });

    test("renders with minimal organization data", () => {
      const minimalOrg = {
        id: 2,
        name: "Basic Rescue",
        total_dogs: 5,
      };

      render(<OrganizationCard organization={minimalOrg} />);

      expect(screen.getByText("Basic Rescue")).toBeInTheDocument();
      expect(screen.getByText("5")).toBeInTheDocument();
    });

    test("renders with sample data when no organization provided", () => {
      render(<OrganizationCard organization={null} />);

      expect(screen.getByText("Sample Organization")).toBeInTheDocument();
    });
  });

  describe("1. Organization Logo (64px with fallback to initials)", () => {
    test("renders logo image when logo_url is provided", () => {
      render(<OrganizationCard organization={mockOrganization} />);

      const logoImage = screen.getAllByTestId("lazy-image")[0]; // First image is the logo
      expect(logoImage).toHaveAttribute("src", "https://example.com/logo.jpg");
      expect(logoImage).toHaveAttribute("alt", "Pets in Turkey logo");
      expect(logoImage).toHaveClass("w-16", "h-16", "rounded-lg");
    });

    test("renders initials when no logo_url provided", () => {
      const orgWithoutLogo = { ...mockOrganization, logo_url: null };
      render(<OrganizationCard organization={orgWithoutLogo} />);

      expect(screen.getByText("PI")).toBeInTheDocument(); // Pets in -> PI
    });

    test("generates correct initials for single word", () => {
      const singleWordOrg = {
        ...mockOrganization,
        name: "REAN",
        logo_url: null,
      };
      render(<OrganizationCard organization={singleWordOrg} />);

      expect(screen.getByText("R")).toBeInTheDocument();
    });

    test("generates correct initials for multiple words", () => {
      const multiWordOrg = {
        ...mockOrganization,
        name: "Tierschutzverein Europa e.V.",
        logo_url: null,
      };
      render(<OrganizationCard organization={multiWordOrg} />);

      expect(screen.getByText("TE")).toBeInTheDocument(); // Tierschutzverein Europa -> TE
    });
  });

  describe("2. Three Location Info Lines", () => {
    test('renders "Based in" information', () => {
      render(<OrganizationCard organization={mockOrganization} />);

      expect(screen.getByText("Based in:")).toBeInTheDocument();
      // Mock returns "🇹🇷 Turkey"
      expect(screen.getByText("🇹🇷 Turkey")).toBeInTheDocument();
    });

    test('renders "Dogs in" information for service regions', () => {
      render(<OrganizationCard organization={mockOrganization} />);

      expect(screen.getByText("Dogs in:")).toBeInTheDocument();
      // Mock returns "🇹🇷 Turkey, 🇷🇴 Romania"
      expect(screen.getByText("🇹🇷 Turkey, 🇷🇴 Romania")).toBeInTheDocument();
    });

    test('renders "Adoptable to" information', () => {
      render(<OrganizationCard organization={mockOrganization} />);

      expect(screen.getByText("Adoptable to:")).toBeInTheDocument();
      // Check that ships to information is displayed (mock function called with ships_to array)
      const shipsToElements = screen.getAllByText("🇩🇪 🇳🇱 🇧🇪 +2 more");
      expect(shipsToElements.length).toBeGreaterThanOrEqual(1); // Should find at least one (could be 2 for responsive)
    });

    test("hides location lines when data is not available", () => {
      const orgWithoutLocation = {
        ...mockOrganization,
        country: null,
        service_regions: [],
        ships_to: [],
      };

      render(<OrganizationCard organization={orgWithoutLocation} />);

      expect(screen.queryByText("Based in:")).not.toBeInTheDocument();
      expect(screen.queryByText("Dogs in:")).not.toBeInTheDocument();
      expect(screen.queryByText("Adoptable to:")).not.toBeInTheDocument();
    });
  });

  describe('3. Dog Count with "NEW this week" Badge', () => {
    test("displays correct dog count", () => {
      render(<OrganizationCard organization={mockOrganization} />);

      expect(screen.getByText("33")).toBeInTheDocument();
      expect(screen.getByText("Dogs")).toBeInTheDocument();
    });

    test('handles singular "Dog" for count of 1', () => {
      const singleDogOrg = { ...mockOrganization, total_dogs: 1 };
      render(<OrganizationCard organization={singleDogOrg} />);

      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("Dog")).toBeInTheDocument();
    });

    test('displays "NEW" badge when new_this_week > 0', () => {
      render(<OrganizationCard organization={mockOrganization} />);

      expect(screen.getByText("3 NEW")).toBeInTheDocument();
      expect(screen.getByText("3 NEW")).toHaveClass(
        "bg-green-100",
        "text-green-800",
      );
    });

    test('hides "NEW" badge when new_this_week is 0', () => {
      const noNewDogsOrg = { ...mockOrganization, new_this_week: 0 };
      render(<OrganizationCard organization={noNewDogsOrg} />);

      expect(screen.queryByText("NEW")).not.toBeInTheDocument();
    });
  });

  describe("4. Preview of 3 Most Recent Dog Thumbnails", () => {
    test("renders recent dog thumbnails when available", () => {
      render(<OrganizationCard organization={mockOrganization} />);

      const dogImages = screen.getAllByTestId("lazy-image");
      // One for logo, three for recent dogs
      expect(dogImages).toHaveLength(4);

      // Check dog thumbnails specifically
      const dogThumbnails = dogImages.slice(1); // Skip logo
      expect(dogThumbnails[0]).toHaveAttribute(
        "src",
        "https://example.com/dog1.jpg",
      );
      expect(dogThumbnails[1]).toHaveAttribute(
        "src",
        "https://example.com/dog2.jpg",
      );
      expect(dogThumbnails[2]).toHaveAttribute(
        "src",
        "https://example.com/dog3.jpg",
      );
    });

    test("renders dog names in preview text", () => {
      render(<OrganizationCard organization={mockOrganization} />);

      expect(
        screen.getByText("Buddy, Max, Luna and 30 more looking for homes"),
      ).toBeInTheDocument();
    });

    test("handles case with exactly 3 dogs", () => {
      const threeDogOrg = {
        ...mockOrganization,
        total_dogs: 3,
        recent_dogs: mockOrganization.recent_dogs,
      };

      render(<OrganizationCard organization={threeDogOrg} />);

      expect(screen.getByText("Buddy, Max, Luna")).toBeInTheDocument();
      expect(
        screen.queryByText("and 0 more looking for homes"),
      ).not.toBeInTheDocument();
    });

    test("hides dog preview when no recent dogs available", () => {
      const noRecentDogsOrg = { ...mockOrganization, recent_dogs: [] };
      render(<OrganizationCard organization={noRecentDogsOrg} />);

      const dogImages = screen.getAllByTestId("lazy-image");
      expect(dogImages).toHaveLength(1); // Only logo
    });
  });

  describe("5. Social Media Links in Row", () => {
    test("renders social media links when available", () => {
      render(<OrganizationCard organization={mockOrganization} />);

      expect(screen.getByTestId("social-media-links")).toBeInTheDocument();
      expect(screen.getByTestId("social-facebook")).toBeInTheDocument();
      expect(screen.getByTestId("social-instagram")).toBeInTheDocument();
    });

    test("hides social media section when no links available", () => {
      const noSocialOrg = { ...mockOrganization, social_media: {} };
      render(<OrganizationCard organization={noSocialOrg} />);

      expect(
        screen.queryByTestId("social-media-links"),
      ).not.toBeInTheDocument();
    });
  });

  describe('6. Two CTAs: "Visit Website" and "View X Dogs →"', () => {
    test("renders both CTA buttons", () => {
      render(<OrganizationCard organization={mockOrganization} />);

      expect(screen.getByText("Visit Website")).toBeInTheDocument();
      expect(screen.getByText("33 Dogs")).toBeInTheDocument();
    });

    test("Visit Website button has correct attributes", () => {
      render(<OrganizationCard organization={mockOrganization} />);

      const visitButton = screen.getByText("Visit Website");
      const link = visitButton.closest("a");

      expect(link).toHaveAttribute("href", "https://petsinturkey.org");
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });

    test("View Dogs button shows correct count", () => {
      render(<OrganizationCard organization={mockOrganization} />);

      expect(screen.getByText("33 Dogs")).toBeInTheDocument();
    });

    test("View Dogs button handles singular form", () => {
      const singleDogOrg = { ...mockOrganization, total_dogs: 1 };
      render(<OrganizationCard organization={singleDogOrg} />);

      expect(screen.getByText("1 Dog")).toBeInTheDocument();
    });
  });

  describe("Card Styling Requirements", () => {
    test("has correct hover state classes", () => {
      render(<OrganizationCard organization={mockOrganization} />);

      const cardButtons = screen.getAllByRole("button");
      const mainCard = cardButtons.find(
        (button) => button.getAttribute("tabindex") === "0",
      );
      expect(mainCard).toHaveClass(
        "hover:shadow-lg",
        "hover:-translate-y-1",
        "transition-all",
      );
    });

    test("entire card is clickable", () => {
      render(<OrganizationCard organization={mockOrganization} />);

      const cardButtons = screen.getAllByRole("button");
      const mainCard = cardButtons.find(
        (button) => button.getAttribute("tabindex") === "0",
      );
      expect(mainCard).toBeInTheDocument();
      expect(mainCard).toHaveAttribute("role", "button");
    });

    test("logo has correct 64px size", () => {
      render(<OrganizationCard organization={mockOrganization} />);

      const logoImage = screen.getAllByTestId("lazy-image")[0]; // First image is the logo
      expect(logoImage).toHaveClass("w-16", "h-16"); // w-16 h-16 = 64px
    });
  });

  describe("Mobile Responsiveness", () => {
    test("has responsive classes for location display", () => {
      render(<OrganizationCard organization={mockOrganization} />);

      // Check for responsive text elements
      const basedInDesktop = screen.getByText("🇹🇷 Turkey");
      expect(basedInDesktop.closest("span")).toHaveClass("hidden", "sm:inline");
    });

    test("renders mobile-specific abbreviated content", () => {
      render(<OrganizationCard organization={mockOrganization} />);

      // Should have both desktop and mobile versions
      const mobileElements = document.querySelectorAll(".sm\\:hidden");
      expect(mobileElements.length).toBeGreaterThan(0);
    });
  });

  describe("Error Handling and Edge Cases", () => {
    test("handles missing organization data gracefully", () => {
      const incompleteOrg = {
        id: 1,
        name: "Incomplete Org",
        // Missing most fields
      };

      render(<OrganizationCard organization={incompleteOrg} />);

      expect(screen.getByText("Incomplete Org")).toBeInTheDocument();
      expect(screen.getByText("0")).toBeInTheDocument(); // Default total_dogs
      expect(screen.getByText("Dogs")).toBeInTheDocument();
    });

    test("handles website URL gracefully when invalid", () => {
      const invalidUrlOrg = { ...mockOrganization, website_url: "#" };
      render(<OrganizationCard organization={invalidUrlOrg} />);

      const visitButton = screen.getByText("Visit Website");
      const link = visitButton.closest("a");
      expect(link).toHaveAttribute("href", "#");
    });

    test("handles very long organization names", () => {
      const longNameOrg = {
        ...mockOrganization,
        name: "Very Long Organization Name That Should Be Truncated Properly",
      };

      render(<OrganizationCard organization={longNameOrg} />);

      const nameElement = screen.getByText(
        "Very Long Organization Name That Should Be Truncated Properly",
      );
      expect(nameElement).toHaveClass("truncate");
    });
  });

  describe("Accessibility", () => {
    test("has proper alt text for logo", () => {
      render(<OrganizationCard organization={mockOrganization} />);

      const logoImage = screen.getAllByTestId("lazy-image")[0]; // First image is the logo
      expect(logoImage).toHaveAttribute("alt", "Pets in Turkey logo");
    });

    test("has proper alt text for dog thumbnails", () => {
      render(<OrganizationCard organization={mockOrganization} />);

      const dogImages = screen.getAllByTestId("lazy-image");
      const dogThumbnails = dogImages.slice(1); // Skip logo

      expect(dogThumbnails[0]).toHaveAttribute("alt", "Buddy");
      expect(dogThumbnails[1]).toHaveAttribute("alt", "Max");
      expect(dogThumbnails[2]).toHaveAttribute("alt", "Luna");
    });

    test("external links have proper security attributes", () => {
      render(<OrganizationCard organization={mockOrganization} />);

      const visitButton = screen.getByText("Visit Website");
      const link = visitButton.closest("a");

      expect(link).toHaveAttribute("rel", "noopener noreferrer");
      expect(link).toHaveAttribute("target", "_blank");
    });
  });
});

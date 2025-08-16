/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from "../../test-utils";
import "@testing-library/jest-dom";
import OrganizationCard from "../../components/organizations/OrganizationCard";

// Mock LazyImage component
jest.mock("../../components/ui/LazyImage", () => {
  return function MockLazyImage({ alt, className, placeholder }) {
    return (
      placeholder || (
        <div className={className} data-testid="lazy-image">
          {alt}
        </div>
      )
    );
  };
});

// Mock SocialMediaLinks component
jest.mock("../../components/ui/SocialMediaLinks", () => {
  return function MockSocialMediaLinks({ socialMedia, className, size }) {
    return (
      <div
        className={className}
        data-testid="social-media-links"
        data-size={size}
      >
        {Object.keys(socialMedia).map((platform) => (
          <a
            key={platform}
            href={socialMedia[platform]}
            data-testid={`social-${platform}`}
          >
            {platform}
          </a>
        ))}
      </div>
    );
  };
});

// Mock image utils
jest.mock("../../utils/imageUtils", () => ({
  handleImageError: jest.fn(),
}));

// Mock country utils
jest.mock("../../utils/countries", () => ({
  formatBasedIn: jest.fn((country) => `${country} flag ${country}`),
  formatServiceRegions: jest.fn((regions) => regions.join(", ")),
  formatShipsToList: jest.fn((countries) => countries.join(", ")),
  getCountryFlag: jest.fn((country) => `${country} flag`),
}));

describe("OrganizationCard CTA Button Spacing Tests", () => {
  const mockOrganization = {
    id: 1,
    name: "Test Organization",
    website_url: "https://example.com",
    logo_url: "https://example.com/logo.jpg",
    country: "DE",
    city: "Berlin",
    service_regions: ["DE", "AT"],
    ships_to: ["DE", "AT", "CH"],
    total_dogs: 25,
    new_this_week: 3,
    recent_dogs: [
      { id: 1, name: "Buddy", thumbnail_url: "https://example.com/buddy.jpg" },
      { id: 2, name: "Max", thumbnail_url: "https://example.com/max.jpg" },
    ],
    social_media: {
      website: "https://example.com",
      facebook: "https://facebook.com/testorg",
    },
  };

  describe("Small Size CTA Button Spacing", () => {
    test("has improved footer padding for small size", () => {
      render(<OrganizationCard organization={mockOrganization} size="small" />);

      const visitButton = screen.getByText("Visit Website");
      const cardFooter = visitButton.closest('[class*="p-5"]');

      expect(cardFooter).toBeInTheDocument();
      // Small size should have p-5 md:p-6 padding for better spacing
      expect(cardFooter).toHaveClass("p-5");
      expect(cardFooter).toHaveClass("md:p-6");
    });

    test("CTA buttons have responsive height for small size", () => {
      render(<OrganizationCard organization={mockOrganization} size="small" />);

      const visitButton = screen.getByText("Visit Website");
      const viewDogsButton = screen.getByText("Meet 25").closest("button");

      // Both buttons should have responsive height: 44px mobile, 48px desktop
      expect(visitButton).toHaveClass("min-h-[44px]");
      expect(visitButton).toHaveClass("md:min-h-[48px]");
      expect(viewDogsButton).toHaveClass("min-h-[44px]");
      expect(viewDogsButton).toHaveClass("md:min-h-[48px]");
    });

    test("buttons have proper spacing between them", () => {
      render(<OrganizationCard organization={mockOrganization} size="small" />);

      const buttonContainer = screen.getByText("Visit Website").closest("div");

      // Button container should have responsive spacing: space-x-3 mobile, space-x-6 desktop
      expect(buttonContainer).toHaveClass("space-x-3");
      expect(buttonContainer).toHaveClass("md:space-x-6");
    });

    test("buttons do not touch card edges", () => {
      render(<OrganizationCard organization={mockOrganization} size="small" />);

      const visitButton = screen.getByText("Visit Website");
      const cardFooter = visitButton.closest('[class*="p-5"]');

      // CardFooter should have proper padding to prevent buttons from touching edges
      expect(cardFooter).toBeInTheDocument();
      expect(cardFooter).toHaveClass("p-5");
    });
  });

  describe("Medium Size CTA Button Spacing", () => {
    test("has consistent footer padding for medium size", () => {
      render(
        <OrganizationCard organization={mockOrganization} size="medium" />,
      );

      const visitButton = screen.getByText("Visit Website");
      const cardFooter = visitButton.closest('[class*="p-5"]');

      expect(cardFooter).toBeInTheDocument();
      expect(cardFooter).toHaveClass("p-5");
    });

    test("CTA buttons have minimum 44px height for medium size", () => {
      render(
        <OrganizationCard organization={mockOrganization} size="medium" />,
      );

      const visitButton = screen.getByText("Visit Website");
      const buttons = screen.getAllByRole("button");
      const viewDogsButton = buttons.find(
        (button) =>
          button.tagName === "BUTTON" &&
          button.textContent.includes("View") &&
          button.textContent.includes("25") &&
          button.textContent.includes("Dogs"),
      );

      expect(visitButton).toHaveClass("min-h-[44px]");
      expect(viewDogsButton).toHaveClass("min-h-[44px]");
    });
  });

  describe("Large Size CTA Button Spacing", () => {
    test("has adequate footer padding for large size", () => {
      render(<OrganizationCard organization={mockOrganization} size="large" />);

      const visitButton = screen.getByText("Visit Website");
      const cardFooter = visitButton.closest('[class*="p-4"]');

      expect(cardFooter).toBeInTheDocument();
      // Large size should have p-4 sm:p-6 padding
      expect(cardFooter).toHaveClass("p-4");
    });

    test("CTA buttons have minimum 44px height for large size", () => {
      render(<OrganizationCard organization={mockOrganization} size="large" />);

      const visitButton = screen.getByText("Visit Website");
      const buttons = screen.getAllByRole("button");
      const viewDogsButton = buttons.find(
        (button) =>
          button.tagName === "BUTTON" &&
          button.textContent.includes("View") &&
          button.textContent.includes("25") &&
          button.textContent.includes("Dogs"),
      );

      expect(visitButton).toHaveClass("min-h-[44px]");
      expect(viewDogsButton).toHaveClass("min-h-[44px]");
    });
  });

  describe("Button Layout and Accessibility", () => {
    test("buttons have consistent width sizing", () => {
      render(<OrganizationCard organization={mockOrganization} size="small" />);

      const visitButton = screen.getByText("Visit Website");
      const viewDogsButton = screen.getByText("Meet 25").closest("button");

      // Buttons should have flex-1 for consistent widths in grid layout
      expect(visitButton).toHaveClass("flex-1");
      expect(viewDogsButton).toHaveClass("flex-1");
    });

    test("buttons have proper visual hierarchy", () => {
      render(<OrganizationCard organization={mockOrganization} size="small" />);

      const visitButton = screen.getByText("Visit Website");
      const viewDogsButton = screen.getByText("Meet 25").closest("button");

      // Visit button should be secondary (outline) - it's an <a> tag with focus:ring-2
      expect(visitButton.closest("a")).toHaveClass("focus:ring-2");

      // View Dogs button should be primary (solid orange)
      expect(viewDogsButton).toHaveClass("bg-orange-600");
    });

    test("buttons have proper focus states", () => {
      render(<OrganizationCard organization={mockOrganization} size="small" />);

      const visitButton = screen.getByText("Visit Website");
      const viewDogsButton = screen.getByText("Meet 25").closest("button");

      // Visit button (link) should have focus ring for accessibility
      expect(visitButton.closest("a")).toHaveClass("focus:ring-2");

      // View Dogs button should be focusable
      expect(viewDogsButton).toBeInTheDocument();
      expect(viewDogsButton.closest("button")).toBeInTheDocument();
    });

    test("buttons handle keyboard navigation", () => {
      render(<OrganizationCard organization={mockOrganization} size="small" />);

      const visitButton = screen.getByText("Visit Website");
      const viewDogsButton = screen.getByText("Meet 25").closest("button");

      // Test Tab navigation
      visitButton.focus();
      expect(document.activeElement).toBe(visitButton);

      // Test Enter key
      fireEvent.keyDown(visitButton, { key: "Enter" });
      expect(visitButton).toBeInTheDocument();

      // Test Space key on buttons
      fireEvent.keyDown(viewDogsButton, { key: " " });
      expect(viewDogsButton).toBeInTheDocument();
    });
  });

  describe("Responsive Button Behavior", () => {
    test("buttons have responsive spacing classes", () => {
      render(<OrganizationCard organization={mockOrganization} size="small" />);

      const buttonContainer = screen.getByText("Visit Website").closest("div");

      // Should have responsive spacing: space-x-3 on mobile, space-x-6 on desktop
      expect(buttonContainer).toHaveClass("space-x-3");
      expect(buttonContainer).toHaveClass("md:space-x-6");
    });

    test("buttons maintain spacing on mobile screens", () => {
      // Mock mobile viewport
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<OrganizationCard organization={mockOrganization} size="small" />);

      const buttonContainer = screen.getByText("Visit Website").closest("div");

      // Should have space-x-3 for mobile (12px)
      expect(buttonContainer).toHaveClass("space-x-3");
    });

    test("buttons handle text overflow properly", () => {
      const longOrganization = {
        ...mockOrganization,
        total_dogs: 9999,
        name: "Very Long Organization Name That Could Potentially Wrap",
      };

      render(<OrganizationCard organization={longOrganization} size="small" />);

      const viewDogsButton = screen.getByText("Meet 9999").closest("button");

      // Button should handle long text without breaking layout
      expect(viewDogsButton).toBeInTheDocument();
      expect(viewDogsButton).toHaveClass("flex-1");
    });
  });

  describe("Touch Target Accessibility", () => {
    test("buttons meet minimum 44px touch target requirement", () => {
      render(<OrganizationCard organization={mockOrganization} size="small" />);

      const visitButton = screen.getByText("Visit Website");
      const viewDogsButton = screen.getByText("Meet 25").closest("button");

      // Both buttons should have min-h-[44px] for accessibility
      expect(visitButton).toHaveClass("min-h-[44px]");
      expect(viewDogsButton).toHaveClass("min-h-[44px]");
    });

    test("buttons have adequate padding for touch interaction", () => {
      render(<OrganizationCard organization={mockOrganization} size="small" />);

      const visitButton = screen.getByText("Visit Website");
      const cardFooter = visitButton.closest('[class*="p-5"]');

      // CardFooter should have adequate padding from card edges
      expect(cardFooter).toBeInTheDocument();
      expect(cardFooter).toHaveClass("p-5");
    });
  });

  describe("Cross-Size Consistency", () => {
    test("all sizes maintain consistent button spacing", () => {
      const sizes = ["small", "medium", "large"];

      sizes.forEach((size) => {
        const { unmount } = render(
          <OrganizationCard organization={mockOrganization} size={size} />,
        );

        const buttonContainer = screen
          .getByText("Visit Website")
          .closest("div");
        expect(buttonContainer).toHaveClass("space-x-3");
        expect(buttonContainer).toHaveClass("md:space-x-6");

        unmount();
      });
    });

    test("all sizes meet minimum touch target requirements", () => {
      const sizes = ["small", "medium", "large"];

      sizes.forEach((size) => {
        const { unmount } = render(
          <OrganizationCard organization={mockOrganization} size={size} />,
        );

        const visitButton = screen.getByText("Visit Website");
        const buttons = screen.getAllByRole("button");
        const viewDogsButton =
          size === "small"
            ? buttons.find(
                (button) =>
                  button.tagName === "BUTTON" &&
                  button.textContent.includes("Meet 25"),
              )
            : buttons.find(
                (button) =>
                  button.tagName === "BUTTON" &&
                  button.textContent.includes("View") &&
                  button.textContent.includes("25") &&
                  button.textContent.includes("Dogs"),
              );

        expect(visitButton).toHaveClass("min-h-[44px]");
        expect(viewDogsButton).toHaveClass("min-h-[44px]");

        unmount();
      });
    });
  });
});

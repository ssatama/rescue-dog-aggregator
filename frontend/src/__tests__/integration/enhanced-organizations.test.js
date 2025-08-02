// src/__tests__/integration/enhanced-organizations.test.js

import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import OrganizationsClient from "../../app/organizations/OrganizationsClient";
import * as organizationsService from "../../services/organizationsService";

// Mock the organizations service
jest.mock("../../services/organizationsService");

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

// Mock Layout component
jest.mock("../../components/layout/Layout", () => {
  return function MockedLayout({ children }) {
    return <div data-testid="layout">{children}</div>;
  };
});

// Mock LazyImage component
jest.mock("../../components/ui/LazyImage", () => {
  return function MockedLazyImage({
    src,
    alt,
    className,
    onError,
    placeholder,
  }) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
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
jest.mock("../../components/ui/SocialMediaLinks", () => {
  return function MockedSocialMediaLinks({ socialMedia, className }) {
    return (
      <div data-testid="social-media-links" className={className}>
        {Object.keys(socialMedia || {}).length} social links
      </div>
    );
  };
});

// Mock logger
jest.mock("../../utils/logger", () => ({
  logger: {
    info: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
  reportError: jest.fn(),
}));

// Mock country utils
jest.mock("../../utils/countryUtils", () => ({
  formatBasedIn: jest.fn((country) => `🇹🇷 ${country}`),
  formatServiceRegions: jest.fn((regions) =>
    regions.map((r) => `🇹🇷 ${r}`).join(", "),
  ),
  formatShipsTo: jest.fn((countries) =>
    countries.length <= 3
      ? countries.map((c) => `🇩🇪 ${c}`).join(" ")
      : `🇩🇪 ${countries[0]} +${countries.length - 1} more`,
  ),
}));

describe("Enhanced Organizations Integration", () => {
  const mockEnhancedOrganizations = [
    {
      id: 1,
      name: "Pets in Turkey",
      website_url: "https://petsinturkey.org",
      logo_url: "https://example.com/pit-logo.jpg",
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
    },
    {
      id: 2,
      name: "REAN",
      website_url: "https://rean.org",
      logo_url: null,
      country: "DE",
      city: "Berlin",
      service_regions: ["DE", "PL"],
      ships_to: ["DE", "AT"],
      total_dogs: 15,
      new_this_week: 0,
      recent_dogs: [
        {
          id: 4,
          name: "Charlie",
          thumbnail_url: "https://example.com/dog4.jpg",
        },
      ],
      social_media: {
        website: "https://rean.org",
      },
    },
    {
      id: 3,
      name: "Tierschutzverein Europa",
      website_url: "https://tierschutzverein-europa.de",
      logo_url: "https://example.com/tse-logo.jpg",
      country: "DE",
      city: "Berlin",
      service_regions: ["DE", "ES", "RO"],
      ships_to: ["DE"],
      total_dogs: 8,
      new_this_week: 1,
      recent_dogs: [],
      social_media: {},
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Successful Data Loading", () => {
    test("loads and displays enhanced organization cards", async () => {
      organizationsService.getEnhancedOrganizations.mockResolvedValueOnce(
        mockEnhancedOrganizations,
      );

      render(<OrganizationsClient />);

      // Should show skeleton screens initially
      const loadingSkeletons = screen.getAllByTestId(
        "organization-card-skeleton",
      );
      expect(loadingSkeletons.length).toBeGreaterThan(0);

      // Wait for data to load
      await waitFor(() => {
        expect(
          screen.queryByTestId("organization-card-skeleton"),
        ).not.toBeInTheDocument();
      });

      // Check that all organizations are displayed
      expect(screen.getByText("Pets in Turkey")).toBeInTheDocument();
      expect(screen.getByText("REAN")).toBeInTheDocument();
      expect(screen.getByText("Tierschutzverein Europa")).toBeInTheDocument();
    });

    test("displays all enhanced card features correctly", async () => {
      organizationsService.getEnhancedOrganizations.mockResolvedValueOnce(
        mockEnhancedOrganizations,
      );

      render(<OrganizationsClient />);

      await waitFor(() => {
        expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
      });

      // Check geographic information (multiple organizations mean multiple instances of these labels)
      expect(screen.getAllByText("Based in:").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Dogs in:").length).toBeGreaterThanOrEqual(1);
      expect(
        screen.getAllByText("Adoptable to:").length,
      ).toBeGreaterThanOrEqual(1);

      // Check dog statistics
      expect(screen.getByText("33")).toBeInTheDocument(); // Pets in Turkey dogs
      expect(screen.getByText("15")).toBeInTheDocument(); // REAN dogs
      expect(screen.getByText("8")).toBeInTheDocument(); // TSE dogs

      // Check NEW badges
      expect(screen.getByText("3 NEW")).toBeInTheDocument(); // Pets in Turkey
      expect(screen.getByText("1 NEW")).toBeInTheDocument(); // TSE
      expect(screen.queryByText("0 NEW")).not.toBeInTheDocument(); // REAN should not show badge
    });

    test("displays recent dog previews correctly", async () => {
      organizationsService.getEnhancedOrganizations.mockResolvedValueOnce(
        mockEnhancedOrganizations,
      );

      render(<OrganizationsClient />);

      await waitFor(() => {
        expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
      });

      // Check dog preview text
      expect(
        screen.getByText(/Buddy, Max, Luna and 30 more looking for homes/),
      ).toBeInTheDocument();
      expect(screen.getByText(/Charlie/)).toBeInTheDocument();

      // Check that the correct number of dog thumbnail images are rendered
      const dogImages = screen.getAllByTestId("lazy-image");
      // Should have logos for all 3 orgs + 3 recent dogs for PiT + 1 for REAN = 7 total
      expect(dogImages.length).toBeGreaterThanOrEqual(5);
    });

    test("renders responsive grid layout", async () => {
      organizationsService.getEnhancedOrganizations.mockResolvedValueOnce(
        mockEnhancedOrganizations,
      );

      render(<OrganizationsClient />);

      await waitFor(() => {
        expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
      });

      // Check that the grid container has responsive classes
      const gridContainer = document.querySelector(".grid");
      expect(gridContainer).toHaveClass(
        "grid-cols-1",
        "sm:grid-cols-1",
        "md:grid-cols-2",
        "lg:grid-cols-2",
        "xl:grid-cols-3",
      );
    });
  });

  describe("Error Handling", () => {
    test("displays error message when API fails", async () => {
      const mockError = new Error("API Error");
      organizationsService.getEnhancedOrganizations.mockRejectedValueOnce(
        mockError,
      );

      render(<OrganizationsClient />);

      await waitFor(() => {
        expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
      });

      expect(
        screen.getByText(
          "There was an error loading organizations. Please try again later.",
        ),
      ).toBeInTheDocument();
      expect(screen.getByText("Retry")).toBeInTheDocument();
    });

    test("retry functionality works correctly", async () => {
      const mockError = new Error("API Error");
      organizationsService.getEnhancedOrganizations
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce(mockEnhancedOrganizations);

      render(<OrganizationsClient />);

      // Wait for error to appear
      await waitFor(() => {
        expect(
          screen.getByText(
            "There was an error loading organizations. Please try again later.",
          ),
        ).toBeInTheDocument();
      });

      // Click retry button
      const retryButton = screen.getByText("Retry");
      fireEvent.click(retryButton);

      // Should show skeleton screens again
      await waitFor(() => {
        const retryLoadingSkeletons = screen.getAllByTestId(
          "organization-card-skeleton",
        );
        expect(retryLoadingSkeletons.length).toBeGreaterThan(0);
      });

      // Wait for successful load
      await waitFor(() => {
        expect(
          screen.queryByTestId("organization-card-skeleton"),
        ).not.toBeInTheDocument();
        expect(screen.getByText("Pets in Turkey")).toBeInTheDocument();
      });

      // Error message should be gone
      expect(
        screen.queryByText(
          "There was an error loading organizations. Please try again later.",
        ),
      ).not.toBeInTheDocument();
    });
  });

  describe("Empty State", () => {
    test("displays empty state when no organizations found", async () => {
      organizationsService.getEnhancedOrganizations.mockResolvedValueOnce([]);

      render(<OrganizationsClient />);

      await waitFor(() => {
        expect(
          screen.queryByTestId("organization-card-skeleton"),
        ).not.toBeInTheDocument();
      });

      expect(screen.getByText("No organizations found")).toBeInTheDocument();
      expect(
        screen.getByText(
          "We couldn't find any rescue organizations at the moment. This might be a temporary issue - please try refreshing the page.",
        ),
      ).toBeInTheDocument();
    });
  });

  describe("Card Interactions", () => {
    test("organization cards are clickable and link to detail pages", async () => {
      organizationsService.getEnhancedOrganizations.mockResolvedValueOnce(
        mockEnhancedOrganizations,
      );

      render(<OrganizationsClient />);

      await waitFor(() => {
        expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
      });

      // Check that organization cards are clickable (now they use buttons instead of links)
      const cardButtons = screen
        .getAllByRole("button")
        .filter((button) => button.getAttribute("tabindex") === "0");

      expect(cardButtons).toHaveLength(3);
      expect(cardButtons[0]).toHaveAttribute("role", "button");
      expect(cardButtons[1]).toHaveAttribute("role", "button");
      expect(cardButtons[2]).toHaveAttribute("role", "button");
    });

    test("visit website buttons work correctly", async () => {
      organizationsService.getEnhancedOrganizations.mockResolvedValueOnce(
        mockEnhancedOrganizations,
      );

      render(<OrganizationsClient />);

      await waitFor(() => {
        expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
      });

      // Check visit website buttons
      const visitButtons = screen.getAllByText("Visit Website");
      expect(visitButtons).toHaveLength(3);

      // Check that they have correct href attributes
      expect(visitButtons[0].closest("a")).toHaveAttribute(
        "href",
        "https://petsinturkey.org",
      );
      expect(visitButtons[1].closest("a")).toHaveAttribute(
        "href",
        "https://rean.org",
      );
      expect(visitButtons[2].closest("a")).toHaveAttribute(
        "href",
        "https://tierschutzverein-europa.de",
      );
    });

    test("view dogs buttons show correct counts", async () => {
      organizationsService.getEnhancedOrganizations.mockResolvedValueOnce(
        mockEnhancedOrganizations,
      );

      render(<OrganizationsClient />);

      await waitFor(() => {
        expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
      });

      expect(screen.getByText("33 Dogs")).toBeInTheDocument();
      expect(screen.getByText("15 Dogs")).toBeInTheDocument();
      expect(screen.getByText("8 Dogs")).toBeInTheDocument();
    });
  });

  describe("Performance and Loading States", () => {
    test("shows proper loading state during data fetch", async () => {
      // Create a promise that we can control
      let resolvePromise;
      const controlledPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      organizationsService.getEnhancedOrganizations.mockReturnValueOnce(
        controlledPromise,
      );

      render(<OrganizationsClient />);

      // Should show skeleton screens
      const controlledLoadingSkeletons = screen.getAllByTestId(
        "organization-card-skeleton",
      );
      expect(controlledLoadingSkeletons.length).toBeGreaterThan(0);
      expect(screen.queryByText("Pets in Turkey")).not.toBeInTheDocument();

      // Resolve the promise
      resolvePromise(mockEnhancedOrganizations);

      // Wait for loading to finish
      await waitFor(() => {
        expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
        expect(screen.getByText("Pets in Turkey")).toBeInTheDocument();
      });
    });

    test("handles slow API responses gracefully", async () => {
      // Simulate slow API
      const slowPromise = new Promise((resolve) => {
        setTimeout(() => resolve(mockEnhancedOrganizations), 100);
      });

      organizationsService.getEnhancedOrganizations.mockReturnValueOnce(
        slowPromise,
      );

      render(<OrganizationsClient />);

      // Should show skeleton screens for the duration
      const loadingSkeletons = screen.getAllByTestId(
        "organization-card-skeleton",
      );
      expect(loadingSkeletons.length).toBeGreaterThan(0);

      // Wait for slow response
      await waitFor(
        () => {
          expect(
            screen.queryByTestId("organization-card-skeleton"),
          ).not.toBeInTheDocument();
          expect(screen.getByText("Pets in Turkey")).toBeInTheDocument();
        },
        { timeout: 200 },
      );
    });
  });

  describe("Accessibility", () => {
    test("page has proper heading structure", async () => {
      organizationsService.getEnhancedOrganizations.mockResolvedValueOnce(
        mockEnhancedOrganizations,
      );

      render(<OrganizationsClient />);

      await waitFor(() => {
        expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
      });

      // Check main heading
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        "Rescue Organizations",
      );

      // Check organization name headings
      const orgHeadings = screen.getAllByRole("heading", { level: 3 });
      expect(orgHeadings).toHaveLength(3);
    });

    test("all images have proper alt text", async () => {
      organizationsService.getEnhancedOrganizations.mockResolvedValueOnce(
        mockEnhancedOrganizations,
      );

      render(<OrganizationsClient />);

      await waitFor(() => {
        expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
      });

      const images = screen.getAllByTestId("lazy-image");
      images.forEach((img) => {
        expect(img).toHaveAttribute("alt");
        expect(img.getAttribute("alt")).not.toBe("");
      });
    });

    test("external links have proper security attributes", async () => {
      organizationsService.getEnhancedOrganizations.mockResolvedValueOnce(
        mockEnhancedOrganizations,
      );

      render(<OrganizationsClient />);

      await waitFor(() => {
        expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
      });

      const visitButtons = screen.getAllByText("Visit Website");
      visitButtons.forEach((button) => {
        const link = button.closest("a");
        expect(link).toHaveAttribute("target", "_blank");
        expect(link).toHaveAttribute("rel", "noopener noreferrer");
      });
    });
  });
});

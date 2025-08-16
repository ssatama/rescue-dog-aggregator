import React from "react";
import { render, screen, waitFor, act } from "../../test-utils";
import "@testing-library/jest-dom";
import { useSearchParams } from "next/navigation";

// Mock Next.js navigation
jest.mock("next/navigation", () => ({
  useSearchParams: jest.fn(),
}));

// Mock the services to control loading states
jest.mock("../../services/organizationsService", () => ({
  getEnhancedOrganizations: jest.fn(),
}));

jest.mock("../../services/animalsService", () => ({
  getAnimals: jest.fn(),
  getStandardizedBreeds: jest.fn(),
  getLocationCountries: jest.fn(),
  getAvailableCountries: jest.fn(),
  getAvailableRegions: jest.fn(),
  getFilterCounts: jest.fn(),
}));

// Mock the organization service
jest.mock("../../services/organizationsService", () => ({
  getEnhancedOrganizations: jest.fn(),
  getOrganizations: jest.fn(),
}));

// Mock logger
jest.mock("../../utils/logger", () => ({
  reportError: jest.fn(),
  logger: {
    info: jest.fn(),
  },
}));

// Mock Layout component to avoid complexities
jest.mock("../../components/layout/Layout", () => {
  return function MockLayout({ children }) {
    return <div data-testid="layout">{children}</div>;
  };
});

// Mock other complex components
jest.mock("../../components/ui/Breadcrumbs", () => {
  return function MockBreadcrumbs() {
    return <div data-testid="breadcrumbs" />;
  };
});

jest.mock("../../components/seo", () => ({
  BreadcrumbSchema: function MockBreadcrumbSchema() {
    return <div data-testid="breadcrumb-schema" />;
  },
}));

jest.mock("../../components/organizations/OrganizationCard", () => {
  return function MockOrganizationCard({ organization }) {
    return <div data-testid="organization-card">{organization.name}</div>;
  };
});

jest.mock("../../components/ui/OrganizationCardSkeleton", () => {
  return function MockOrganizationCardSkeleton() {
    return <div data-testid="organization-skeleton">Loading...</div>;
  };
});

jest.mock("../../components/ui/EmptyState", () => {
  return function MockEmptyState() {
    return <div data-testid="empty-state">No data found</div>;
  };
});

jest.mock("../../components/dogs/DogsGrid", () => {
  return function MockDogsGrid({ dogs, loading, skeletonCount, className }) {
    if (loading) {
      return (
        <div data-testid="dogs-grid-skeleton" className={className}>
          {Array.from({ length: skeletonCount || 6 }, (_, i) => (
            <div key={i} data-testid="dog-skeleton">
              Loading dog...
            </div>
          ))}
        </div>
      );
    }
    return (
      <div data-testid="dogs-grid" className={className}>
        {dogs.map((dog, index) => (
          <div key={dog.id || index} data-testid="dog-card">
            {dog.name}
          </div>
        ))}
      </div>
    );
  };
});

// Mock other complex components needed for DogsPageClient
jest.mock("../../components/filters/DesktopFilters", () => {
  return function MockDesktopFilters() {
    return <div data-testid="desktop-filters" />;
  };
});

jest.mock("../../components/filters/MobileFilterDrawer", () => {
  return function MockMobileFilterDrawer() {
    return <div data-testid="mobile-filter-drawer" />;
  };
});

describe("Client Components Fade-in Transitions", () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Set up default mock return values
    useSearchParams.mockReturnValue({
      get: jest.fn(() => null),
    });
  });

  describe("OrganizationsClient", () => {
    it("applies content-fade-in class when organizations load", async () => {
      const {
        getEnhancedOrganizations,
      } = require("../../services/organizationsService");

      // Mock the service to return data after a delay
      const mockOrganizations = [
        { id: 1, name: "Organization 1" },
        { id: 2, name: "Organization 2" },
      ];

      // Initially resolve with empty data to simulate loading
      getEnhancedOrganizations.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(mockOrganizations), 100),
          ),
      );

      // Dynamic import to ensure mocks are set up
      const OrganizationsClient = (
        await import("../../app/organizations/OrganizationsClient")
      ).default;

      render(<OrganizationsClient />);

      // Initially should show skeleton
      expect(screen.getAllByTestId("organization-skeleton")).toHaveLength(6);

      // Wait for organizations to load
      await waitFor(
        () => {
          expect(screen.getAllByTestId("organization-card")).toHaveLength(2);
        },
        { timeout: 2000 },
      );

      // Find the container that should have the fade-in class
      const organizationCards = screen.getAllByTestId("organization-card");
      const gridContainer = organizationCards[0].parentElement;

      // Should apply content-fade-in class when organizations.length > 0
      expect(gridContainer).toHaveClass("content-fade-in");
    });

    it("does not apply content-fade-in class when no organizations", async () => {
      const {
        getEnhancedOrganizations,
      } = require("../../services/organizationsService");

      // Mock empty response
      getEnhancedOrganizations.mockResolvedValue([]);

      const OrganizationsClient = (
        await import("../../app/organizations/OrganizationsClient")
      ).default;

      render(<OrganizationsClient />);

      await waitFor(() => {
        expect(screen.getByTestId("empty-state")).toBeInTheDocument();
      });

      // Should not have content-fade-in class for empty state
      const emptyState = screen.getByTestId("empty-state");
      expect(emptyState).not.toHaveClass("content-fade-in");
    });
  });

  describe("DogsPageClient", () => {
    beforeEach(() => {
      // Set up all the required mocks for DogsPageClient
      const animalsService = require("../../services/animalsService");
      const organizationsService = require("../../services/organizationsService");

      animalsService.getStandardizedBreeds.mockResolvedValue(["Any breed"]);
      animalsService.getLocationCountries.mockResolvedValue([]);
      animalsService.getAvailableCountries.mockResolvedValue([]);
      animalsService.getAvailableRegions.mockResolvedValue([]);
      animalsService.getFilterCounts.mockResolvedValue({});
      organizationsService.getOrganizations.mockResolvedValue([]);
    });

    it("applies content-fade-in class when dogs load", async () => {
      const { getAnimals } = require("../../services/animalsService");

      const mockDogs = [
        { id: 1, name: "Dog 1" },
        { id: 2, name: "Dog 2" },
      ];

      getAnimals.mockImplementation(
        () =>
          new Promise((resolve) => setTimeout(() => resolve(mockDogs), 100)),
      );

      const DogsPageClient = (await import("../../app/dogs/DogsPageClient"))
        .default;

      await act(async () => {
        render(<DogsPageClient />);
      });

      // Initially should show skeleton
      expect(screen.getByTestId("dogs-grid-skeleton")).toBeInTheDocument();

      // Wait for dogs to load
      await waitFor(
        () => {
          expect(screen.getByTestId("dogs-grid")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      // The dogs grid should have the fade-in class applied
      const dogsGrid = screen.getByTestId("dogs-grid");
      expect(dogsGrid).toHaveClass("content-fade-in");
    });

    it("does not apply content-fade-in when no dogs found", async () => {
      const { getAnimals } = require("../../services/animalsService");

      getAnimals.mockResolvedValue([]);

      const DogsPageClient = (await import("../../app/dogs/DogsPageClient"))
        .default;

      await act(async () => {
        render(<DogsPageClient />);
      });

      await waitFor(() => {
        expect(screen.getByTestId("empty-state")).toBeInTheDocument();
      });

      // Should not have content-fade-in class for empty state
      const emptyState = screen.getByTestId("empty-state");
      expect(emptyState).not.toHaveClass("content-fade-in");
    });
  });

  describe("Loading state transitions", () => {
    it("transitions smoothly from skeleton to content", async () => {
      const {
        getEnhancedOrganizations,
      } = require("../../services/organizationsService");

      const mockOrganizations = [{ id: 1, name: "Test Org" }];
      getEnhancedOrganizations.mockResolvedValue(mockOrganizations);

      const OrganizationsClient = (
        await import("../../app/organizations/OrganizationsClient")
      ).default;

      render(<OrganizationsClient />);

      // Skeleton should be visible initially
      expect(screen.getAllByTestId("organization-skeleton")).toHaveLength(6);

      // Wait for content to load
      await waitFor(() => {
        expect(screen.getByTestId("organization-card")).toBeInTheDocument();
        expect(
          screen.queryByTestId("organization-skeleton"),
        ).not.toBeInTheDocument();
      });

      // Content should have fade-in class
      const organizationCard = screen.getByTestId("organization-card");
      const gridContainer = organizationCard.parentElement;
      expect(gridContainer).toHaveClass("content-fade-in");
    });
  });

  describe("Error handling", () => {
    it("does not apply fade-in class when error occurs", async () => {
      const {
        getEnhancedOrganizations,
      } = require("../../services/organizationsService");

      getEnhancedOrganizations.mockRejectedValue(new Error("Network error"));

      const OrganizationsClient = (
        await import("../../app/organizations/OrganizationsClient")
      ).default;

      render(<OrganizationsClient />);

      await waitFor(() => {
        expect(
          screen.getByText(/There was an error loading organizations/),
        ).toBeInTheDocument();
      });

      // Error state should not have content-fade-in class
      const errorElement = screen.getByText(
        /There was an error loading organizations/,
      ).parentElement;
      expect(errorElement).not.toHaveClass("content-fade-in");
    });
  });
});

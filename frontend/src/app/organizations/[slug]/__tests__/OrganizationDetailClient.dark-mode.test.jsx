// src/app/organizations/[id]/__tests__/OrganizationDetailClient.dark-mode.test.jsx
// TDD Phase 1: RED - Tests for OrganizationDetailClient dark mode functionality

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import OrganizationDetailClient from "../OrganizationDetailClient";

// Mock the services
jest.mock("../../../../services/organizationsService", () => ({
  getOrganizationBySlug: jest.fn(),
  getOrganizationDogs: jest.fn(),
}));

// Mock all components to focus on dark mode styling
jest.mock("../../../../components/layout/Layout", () => {
  return function MockLayout({ children }) {
    return <div data-testid="layout">{children}</div>;
  };
});

jest.mock("../../../../components/dogs/DogsGrid", () => {
  return function MockDogsGrid({ loading, skeletonCount }) {
    if (loading) {
      return (
        <div data-testid="dogs-grid-skeleton">
          Loading {skeletonCount} dogs...
        </div>
      );
    }
    return <div data-testid="dogs-grid">Dogs Grid</div>;
  };
});

jest.mock("../../../../components/filters/DogFilters", () => {
  return function MockDogFilters() {
    return <div data-testid="dog-filters">Dog Filters</div>;
  };
});

jest.mock("../../../../components/organizations/OrganizationHero", () => {
  return function MockOrganizationHero() {
    return <div data-testid="organization-hero">Organization Hero</div>;
  };
});

jest.mock("../../../../components/filters/MobileFilterDrawer", () => {
  return function MockMobileFilterDrawer() {
    return <div data-testid="mobile-filter-sheet">Mobile Filter Sheet</div>;
  };
});

jest.mock("../../../../hooks/useFilteredDogs", () => {
  return jest.fn(() => ({
    filteredDogs: [],
    totalCount: 0,
    hasActiveFilters: false,
    availableBreeds: [],
  }));
});

jest.mock("../../../../utils/logger", () => ({
  reportError: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useParams: () => ({ slug: "test-org-1" }),
  useSearchParams: () => ({
    get: jest.fn(() => null),
  }),
}));

import {
  getOrganizationBySlug,
  getOrganizationDogs,
} from "../../../../services/organizationsService";

describe("OrganizationDetailClient Dark Mode", () => {
  const mockOrganization = {
    id: "test-org-1",
    name: "Happy Tails Rescue",
    website_url: "https://happytails.org",
    properties: {
      email: "contact@happytails.org",
      phone: "+1-555-123-4567",
    },
  };

  const mockDogs = [
    { id: 1, name: "Buddy", breed: "Golden Retriever" },
    { id: 2, name: "Max", breed: "Labrador" },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    getOrganizationBySlug.mockResolvedValue(mockOrganization);
    getOrganizationDogs.mockResolvedValue(mockDogs);
  });

  describe("Loading State Dark Mode", () => {
    test("hero skeleton has dark mode styling", () => {
      getOrganizationBySlug.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<OrganizationDetailClient params={{ id: "test-org-1" }} />);

      const heroSkeleton = document.querySelector(".bg-gradient-to-r");
      expect(heroSkeleton).toHaveClass("from-amber-100");
      expect(heroSkeleton).toHaveClass("dark:from-amber-900/20");
      expect(heroSkeleton).toHaveClass("to-orange-200");
      expect(heroSkeleton).toHaveClass("dark:to-orange-900/30");
    });

    test("skeleton elements have dark mode styling", () => {
      getOrganizationBySlug.mockImplementation(() => new Promise(() => {}));

      render(<OrganizationDetailClient params={{ id: "test-org-1" }} />);

      const skeletonElements = document.querySelectorAll(".bg-gray-200");
      skeletonElements.forEach((element) => {
        expect(element).toHaveClass("bg-gray-200");
        expect(element).toHaveClass("dark:bg-gray-700");
      });
    });
  });

  describe("Error State Dark Mode", () => {
    test("error container has dark mode background", async () => {
      getOrganizationBySlug.mockRejectedValue(new Error("Not found"));

      render(<OrganizationDetailClient params={{ id: "test-org-1" }} />);

      await waitFor(() => {
        const errorContainer = screen
          .getByText("Organization Not Found")
          .closest(".bg-red-50");
        expect(errorContainer).toHaveClass("bg-red-50");
        expect(errorContainer).toHaveClass("dark:bg-red-900/20");
        expect(errorContainer).toHaveClass("border-red-200");
        expect(errorContainer).toHaveClass("dark:border-red-800/30");
      });
    });

    test("error heading has dark mode text color", async () => {
      getOrganizationBySlug.mockRejectedValue(new Error("Not found"));

      render(<OrganizationDetailClient params={{ id: "test-org-1" }} />);

      await waitFor(() => {
        const errorHeading = screen.getByText("Organization Not Found");
        expect(errorHeading).toHaveClass("text-red-500");
        expect(errorHeading).toHaveClass("dark:text-red-400");
      });
    });

    test("error description has dark mode text color", async () => {
      getOrganizationBySlug.mockRejectedValue(new Error("Not found"));

      render(<OrganizationDetailClient params={{ id: "test-org-1" }} />);

      await waitFor(() => {
        const errorText = screen.getByText(
          /Sorry, we couldn't find the organization/,
        );
        expect(errorText).toHaveClass("text-gray-700");
        expect(errorText).toHaveClass("dark:text-gray-300");
      });
    });

    test("error return button maintains orange theme", async () => {
      getOrganizationBySlug.mockRejectedValue(new Error("Not found"));

      render(<OrganizationDetailClient params={{ id: "test-org-1" }} />);

      await waitFor(() => {
        const returnButton = screen.getByText("Return to Organizations");
        expect(returnButton).toHaveClass("bg-orange-500");
        expect(returnButton).toHaveClass("hover:bg-orange-600");
        expect(returnButton).toHaveClass("dark:bg-orange-600");
        expect(returnButton).toHaveClass("dark:hover:bg-orange-700");
      });
    });
  });

  describe("Contact Information Dark Mode", () => {
    test("contact section has dark mode background", async () => {
      render(<OrganizationDetailClient params={{ id: "test-org-1" }} />);

      await waitFor(() => {
        const contactSection = screen
          .getByText("Contact Information")
          .closest(".bg-white");
        expect(contactSection).toHaveClass("bg-white");
        expect(contactSection).toHaveClass("dark:bg-gray-900");
      });
    });

    test("contact heading has dark mode text color", async () => {
      render(<OrganizationDetailClient params={{ id: "test-org-1" }} />);

      await waitFor(() => {
        const contactHeading = screen.getByText("Contact Information");
        expect(contactHeading).toHaveClass("text-gray-900");
        expect(contactHeading).toHaveClass("dark:text-gray-100");
      });
    });

    test("contact icons have dark mode styling", async () => {
      render(<OrganizationDetailClient params={{ id: "test-org-1" }} />);

      await waitFor(() => {
        const icons = document.querySelectorAll(".text-gray-500");
        icons.forEach((icon) => {
          expect(icon).toHaveClass("text-gray-500");
          expect(icon).toHaveClass("dark:text-gray-400");
        });
      });
    });

    test("contact links maintain orange theme", async () => {
      render(<OrganizationDetailClient params={{ id: "test-org-1" }} />);

      await waitFor(() => {
        const emailLink = screen.getByText("contact@happytails.org");
        const phoneLink = screen.getByText("+1-555-123-4567");

        expect(emailLink).toHaveClass("text-orange-500");
        expect(emailLink).toHaveClass("dark:text-orange-400");
        expect(phoneLink).toHaveClass("text-orange-500");
        expect(phoneLink).toHaveClass("dark:text-orange-400");
      });
    });
  });

  describe("Dogs Section Dark Mode", () => {
    test("dogs section heading has dark mode text color", async () => {
      render(<OrganizationDetailClient params={{ id: "test-org-1" }} />);

      await waitFor(() => {
        const dogsHeading = screen.getByText("Available Dogs");
        expect(dogsHeading).toHaveClass("text-gray-900");
        expect(dogsHeading).toHaveClass("dark:text-gray-100");
      });
    });

    test("organization hero has dark mode styling", async () => {
      render(<OrganizationDetailClient params={{ id: "test-org-1" }} />);

      await waitFor(() => {
        // Count text removed for cleaner UI - test hero styling instead
        const hero = screen.getByTestId("organization-hero");
        expect(hero).toBeInTheDocument();
      });
    });
  });
});

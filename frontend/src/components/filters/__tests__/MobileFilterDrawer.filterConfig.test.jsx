import React from "react";
import { render, screen } from "@testing-library/react";
import MobileFilterDrawer from "../MobileFilterDrawer";

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => ({
    get: jest.fn(() => null),
    toString: jest.fn(() => ""),
  }),
}));

describe("MobileFilterDrawer Context-Aware Filtering", () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    searchQuery: "",
    handleSearchChange: jest.fn(),
    clearSearch: jest.fn(),
    organizationFilter: "any",
    setOrganizationFilter: jest.fn(),
    organizations: [{ id: "any", name: "Any Organization" }],
    standardizedBreedFilter: "Any breed",
    setStandardizedBreedFilter: jest.fn(),
    standardizedBreeds: ["Any breed", "Labrador"],
    sexFilter: "Any",
    setSexFilter: jest.fn(),
    sexOptions: ["Any", "Male", "Female"],
    sizeFilter: "Any size",
    setSizeFilter: jest.fn(),
    sizeOptions: ["Any size", "Small", "Medium", "Large"],
    ageCategoryFilter: "Any age",
    setAgeCategoryFilter: jest.fn(),
    ageOptions: ["Any age", "Puppy", "Young", "Adult", "Senior"],
    availableCountryFilter: "Any country",
    setAvailableCountryFilter: jest.fn(),
    availableCountries: ["Any country", "USA", "Germany"],
    resetFilters: jest.fn(),
    filterCounts: null,
  };

  describe("Organization Detail Context", () => {
    const organizationFilterConfig = {
      showAge: true,
      showBreed: true,
      showSort: true,
      showSize: false,
      showSex: false,
      showShipsTo: false,
      showOrganization: false,
      showSearch: false,
    };

    it("should only show age, breed, and sort sections for organization context", () => {
      render(
        <MobileFilterDrawer
          {...defaultProps}
          filterConfig={organizationFilterConfig}
        />,
      );

      // Should show these sections
      expect(screen.getByText("Age")).toBeInTheDocument();
      expect(screen.getByText("Breed")).toBeInTheDocument();

      // Should NOT show these sections
      expect(screen.queryByText("Size")).not.toBeInTheDocument();
      expect(screen.queryByText("Sex")).not.toBeInTheDocument();
      expect(
        screen.queryByText("Adoptable to Country"),
      ).not.toBeInTheDocument();
      expect(screen.queryByText("Organization")).not.toBeInTheDocument();

      // Search should not be shown
      expect(screen.queryByTestId("search-input")).not.toBeInTheDocument();
    });

    it("should show active filter count only for visible sections", () => {
      const propsWithActiveFilters = {
        ...defaultProps,
        filterConfig: organizationFilterConfig,
        ageCategoryFilter: "Puppy", // Active age filter
        sizeFilter: "Large", // Active but hidden filter
      };

      render(<MobileFilterDrawer {...propsWithActiveFilters} />);

      // Should count age (visible and active) but not size (hidden)
      expect(screen.getByText("1 active")).toBeInTheDocument();
    });
  });

  describe("Dog Catalog Context (Backward Compatibility)", () => {
    const dogCatalogFilterConfig = {
      showAge: true,
      showBreed: true,
      showSort: true,
      showSize: true,
      showSex: true,
      showShipsTo: true,
      showOrganization: true,
      showSearch: true,
    };

    it("should show all filter sections for dog catalog context", () => {
      render(
        <MobileFilterDrawer
          {...defaultProps}
          filterConfig={dogCatalogFilterConfig}
        />,
      );

      // Should show all sections
      expect(screen.getByText("Age")).toBeInTheDocument();
      expect(screen.getByText("Breed")).toBeInTheDocument();
      expect(screen.getByText("Size")).toBeInTheDocument();
      expect(screen.getByText("Sex")).toBeInTheDocument();
      expect(screen.getByText("Adoptable to Country")).toBeInTheDocument();
      expect(screen.getByText("Organization")).toBeInTheDocument();
      expect(screen.getByTestId("search-input")).toBeInTheDocument();
    });
  });

  describe("Default Behavior (No filterConfig)", () => {
    it("should show all filters when no filterConfig is provided (backward compatibility)", () => {
      render(<MobileFilterDrawer {...defaultProps} />);

      // Should show all sections (existing behavior)
      expect(screen.getByText("Age")).toBeInTheDocument();
      expect(screen.getByText("Breed")).toBeInTheDocument();
      expect(screen.getByText("Size")).toBeInTheDocument();
      expect(screen.getByText("Sex")).toBeInTheDocument();
      expect(screen.getByTestId("search-input")).toBeInTheDocument();
    });
  });
});

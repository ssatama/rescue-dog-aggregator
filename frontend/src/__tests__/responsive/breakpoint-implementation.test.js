/**
 * Test to verify responsive breakpoint implementation
 * Since Jest doesn't process Tailwind classes, we verify the implementation
 * by checking that the correct classes are applied
 */

import React from "react";
import { render } from "@testing-library/react";
import { useRouter, useSearchParams } from "next/navigation";
import DesktopFilters from "../../components/filters/DesktopFilters";
import DogFilters from "../../components/filters/DogFilters";

// Mock Next.js navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

describe("Responsive Breakpoint Implementation", () => {
  const mockRouter = {
    push: jest.fn(),
    pathname: "/",
  };

  const mockSearchParams = {
    get: jest.fn(() => null),
    toString: jest.fn(() => ""),
  };

  beforeEach(() => {
    useRouter.mockReturnValue(mockRouter);
    useSearchParams.mockReturnValue(mockSearchParams);
  });

  describe("DesktopFilters Component", () => {
    it("should use lg breakpoint (1024px) for visibility", () => {
      const { container } = render(
        <DesktopFilters
          searchQuery=""
          handleSearchChange={jest.fn()}
          clearSearch={jest.fn()}
          organizationFilter="any"
          setOrganizationFilter={jest.fn()}
          organizations={[]}
          standardizedBreedFilter="Any breed"
          setStandardizedBreedFilter={jest.fn()}
          standardizedBreeds={["Any breed"]}
          sexFilter="Any"
          setSexFilter={jest.fn()}
          sexOptions={["Any"]}
          sizeFilter="Any size"
          setSizeFilter={jest.fn()}
          sizeOptions={["Any size"]}
          ageCategoryFilter="Any age"
          setAgeCategoryFilter={jest.fn()}
          ageOptions={["Any age"]}
          locationCountryFilter="Any country"
          setLocationCountryFilter={jest.fn()}
          locationCountries={["Any country"]}
          availableCountryFilter="Any country"
          setAvailableCountryFilter={jest.fn()}
          availableCountries={["Any country"]}
          availableRegionFilter="Any region"
          setAvailableRegionFilter={jest.fn()}
          availableRegions={["Any region"]}
          resetFilters={jest.fn()}
          filterCounts={{}}
        />,
      );

      const desktopFilters = container.querySelector(
        '[data-testid="desktop-filters-container"]',
      );
      expect(desktopFilters).toHaveClass("hidden", "lg:block");
      expect(desktopFilters).not.toHaveClass("sm:block");
      expect(desktopFilters).not.toHaveClass("md:block");
    });
  });

  describe("DogFilters Component", () => {
    const defaultProps = {
      filters: { age: "All", breed: "", sort: "newest" },
      onFiltersChange: jest.fn(),
      availableBreeds: [],
      availableShipsTo: [],
      totalCount: 0,
      hasActiveFilters: false,
      showShipsToFilter: true,
      onMobileFilterClick: jest.fn(),
    };

    it("should use lg breakpoint for desktop filter visibility", () => {
      const { container } = render(<DogFilters {...defaultProps} />);

      // Desktop filter header
      const desktopHeader = container.querySelector(".hidden.lg\\:flex");
      expect(desktopHeader).toBeTruthy();

      // Mobile filter button
      const mobileButton = container.querySelector(
        '[data-testid="mobile-filter-button"]',
      );
      const mobileContainer = mobileButton?.closest("div");
      expect(mobileContainer).toHaveClass("lg:hidden");

      // Filter container
      const filterContainer = container.querySelector(
        '[data-testid="filters-container"]',
      );
      expect(filterContainer).toHaveClass("hidden", "lg:flex");
    });

    it("should use lg breakpoint for responsive text elements", () => {
      const { container } = render(
        <DogFilters
          {...defaultProps}
          totalCount={10}
          hasActiveFilters={true}
        />,
      );

      // Count display
      const countSpan = container.querySelector(".hidden.lg\\:inline");
      expect(countSpan).toBeTruthy();

      // Clear button
      const clearButton = container.querySelector(
        '[data-testid="clear-filters-button"]',
      );
      expect(clearButton).toHaveClass("hidden", "lg:flex");
    });
  });

  describe("Breakpoint Consistency", () => {
    it("should use lg (1024px) breakpoint consistently across components", () => {
      // This test verifies that we're using lg breakpoint (1024px) and not sm (640px) or md (768px)
      const EXPECTED_BREAKPOINT = "lg";
      const INCORRECT_BREAKPOINTS = ["sm", "md"];

      // Test DesktopFilters
      const { container: desktopContainer } = render(
        <DesktopFilters
          searchQuery=""
          handleSearchChange={jest.fn()}
          clearSearch={jest.fn()}
          organizationFilter="any"
          setOrganizationFilter={jest.fn()}
          organizations={[]}
          standardizedBreedFilter="Any breed"
          setStandardizedBreedFilter={jest.fn()}
          standardizedBreeds={["Any breed"]}
          sexFilter="Any"
          setSexFilter={jest.fn()}
          sexOptions={["Any"]}
          sizeFilter="Any size"
          setSizeFilter={jest.fn()}
          sizeOptions={["Any size"]}
          ageCategoryFilter="Any age"
          setAgeCategoryFilter={jest.fn()}
          ageOptions={["Any age"]}
          locationCountryFilter="Any country"
          setLocationCountryFilter={jest.fn()}
          locationCountries={["Any country"]}
          availableCountryFilter="Any country"
          setAvailableCountryFilter={jest.fn()}
          availableCountries={["Any country"]}
          availableRegionFilter="Any region"
          setAvailableRegionFilter={jest.fn()}
          availableRegions={["Any region"]}
          resetFilters={jest.fn()}
          filterCounts={{}}
        />,
      );

      const desktopFiltersClasses =
        desktopContainer.querySelector(
          '[data-testid="desktop-filters-container"]',
        )?.className || "";

      expect(desktopFiltersClasses).toContain(EXPECTED_BREAKPOINT + ":");
      INCORRECT_BREAKPOINTS.forEach((bp) => {
        expect(desktopFiltersClasses).not.toContain(bp + ":block");
      });

      // Test DogFilters
      const { container: dogContainer } = render(
        <DogFilters
          filters={{ age: "All", breed: "", sort: "newest" }}
          onFiltersChange={jest.fn()}
          availableBreeds={[]}
          availableShipsTo={[]}
          totalCount={0}
          hasActiveFilters={false}
          showShipsToFilter={true}
          onMobileFilterClick={jest.fn()}
        />,
      );

      const mobileButtonClasses =
        dogContainer.querySelector(".lg\\:hidden")?.className || "";

      expect(mobileButtonClasses).toContain(EXPECTED_BREAKPOINT + ":hidden");
      INCORRECT_BREAKPOINTS.forEach((bp) => {
        expect(mobileButtonClasses).not.toContain(bp + ":hidden");
      });
    });
  });
});

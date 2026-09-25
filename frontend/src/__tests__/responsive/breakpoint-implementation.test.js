/**
 * Test to verify responsive breakpoint implementation
 * Since Jest doesn't process Tailwind classes, we verify the implementation
 * by checking that the correct classes are applied
 */

import React from "react";
import { render } from "../../test-utils";
import { useRouter, useSearchParams } from "next/navigation";
import DesktopFilters from "../../components/filters/DesktopFilters";

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
    });
  });
});

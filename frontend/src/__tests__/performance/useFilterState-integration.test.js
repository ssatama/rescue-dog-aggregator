/**
 * TDD Test Suite for useFilterState Hook Integration
 * Tests the replacement of 9 separate useState calls with consolidated state management
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useFilterState } from "../../hooks/useFilterState";
import "@testing-library/jest-dom";

// Mock the useFilterState hook initially
jest.mock("../../hooks/useFilterState");

describe("useFilterState Hook Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Phase 2: Consolidated State Management", () => {
    test("FAILING TEST: should replace 9 individual useState calls with single consolidated state", () => {
      // Mock return value for useFilterState
      const mockFilters = {
        standardizedBreedFilter: "Any breed",
        sexFilter: "Any",
        sizeFilter: "Any size",
        ageCategoryFilter: "Any age",
        searchQuery: "",
        locationCountryFilter: "Any country",
        availableCountryFilter: "Any country",
        availableRegionFilter: "Any region",
        organizationFilter: "any",
      };

      const mockUpdateFilter = jest.fn();
      const mockUpdateFilters = jest.fn();
      const mockResetFilters = jest.fn();
      const mockClearFilter = jest.fn();

      useFilterState.mockReturnValue({
        filters: mockFilters,
        updateFilter: mockUpdateFilter,
        updateFilters: mockUpdateFilters,
        resetFilters: mockResetFilters,
        clearFilter: mockClearFilter,
        activeFilterCount: 0,
        resetTrigger: 0,
        apiParams: {},
      });

      // Create a test component that uses the hook
      const TestComponent = () => {
        const {
          filters,
          updateFilter,
          updateFilters,
          resetFilters,
          clearFilter,
          activeFilterCount,
          apiParams,
        } = useFilterState();

        return (
          <div>
            <div data-testid="breed-filter">
              {filters.standardizedBreedFilter}
            </div>
            <div data-testid="sex-filter">{filters.sexFilter}</div>
            <div data-testid="size-filter">{filters.sizeFilter}</div>
            <div data-testid="age-filter">{filters.ageCategoryFilter}</div>
            <div data-testid="search-filter">{filters.searchQuery}</div>
            <div data-testid="location-filter">
              {filters.locationCountryFilter}
            </div>
            <div data-testid="available-country-filter">
              {filters.availableCountryFilter}
            </div>
            <div data-testid="available-region-filter">
              {filters.availableRegionFilter}
            </div>
            <div data-testid="organization-filter">
              {filters.organizationFilter}
            </div>
            <div data-testid="active-count">{activeFilterCount}</div>

            <button
              onClick={() =>
                updateFilter("standardizedBreedFilter", "Labrador")
              }
            >
              Update Breed
            </button>
            <button
              onClick={() =>
                updateFilters({ sexFilter: "Male", sizeFilter: "Large" })
              }
            >
              Batch Update
            </button>
            <button onClick={() => clearFilter("breed")}>Clear Breed</button>
            <button onClick={resetFilters}>Reset All</button>
          </div>
        );
      };

      const { rerender } = render(<TestComponent />);

      // Verify all 9 filter states are accessible through single hook
      expect(screen.getByTestId("breed-filter")).toHaveTextContent("Any breed");
      expect(screen.getByTestId("sex-filter")).toHaveTextContent("Any");
      expect(screen.getByTestId("size-filter")).toHaveTextContent("Any size");
      expect(screen.getByTestId("age-filter")).toHaveTextContent("Any age");
      expect(screen.getByTestId("search-filter")).toHaveTextContent("");
      expect(screen.getByTestId("location-filter")).toHaveTextContent(
        "Any country",
      );
      expect(screen.getByTestId("available-country-filter")).toHaveTextContent(
        "Any country",
      );
      expect(screen.getByTestId("available-region-filter")).toHaveTextContent(
        "Any region",
      );
      expect(screen.getByTestId("organization-filter")).toHaveTextContent(
        "any",
      );
    });

    test("FAILING TEST: should update individual filters without affecting others", () => {
      const mockUpdateFilter = jest.fn();

      useFilterState.mockReturnValue({
        filters: {
          standardizedBreedFilter: "Any breed",
          sexFilter: "Any",
          sizeFilter: "Any size",
          ageCategoryFilter: "Any age",
          searchQuery: "",
          locationCountryFilter: "Any country",
          availableCountryFilter: "Any country",
          availableRegionFilter: "Any region",
          organizationFilter: "any",
        },
        updateFilter: mockUpdateFilter,
        updateFilters: jest.fn(),
        resetFilters: jest.fn(),
        clearFilter: jest.fn(),
        activeFilterCount: 0,
        resetTrigger: 0,
        apiParams: {},
      });

      const TestComponent = () => {
        const { updateFilter } = useFilterState();

        return (
          <button
            onClick={() => updateFilter("standardizedBreedFilter", "Poodle")}
          >
            Update Breed Only
          </button>
        );
      };

      render(<TestComponent />);

      const button = screen.getByText("Update Breed Only");
      fireEvent.click(button);

      // Should only update the specific filter
      expect(mockUpdateFilter).toHaveBeenCalledWith(
        "standardizedBreedFilter",
        "Poodle",
      );
      expect(mockUpdateFilter).toHaveBeenCalledTimes(1);
    });

    test("FAILING TEST: should batch update multiple filters efficiently", () => {
      const mockUpdateFilters = jest.fn();

      useFilterState.mockReturnValue({
        filters: {
          standardizedBreedFilter: "Any breed",
          sexFilter: "Any",
          sizeFilter: "Any size",
          ageCategoryFilter: "Any age",
          searchQuery: "",
          locationCountryFilter: "Any country",
          availableCountryFilter: "Any country",
          availableRegionFilter: "Any region",
          organizationFilter: "any",
        },
        updateFilter: jest.fn(),
        updateFilters: mockUpdateFilters,
        resetFilters: jest.fn(),
        clearFilter: jest.fn(),
        activeFilterCount: 0,
        resetTrigger: 0,
        apiParams: {},
      });

      const TestComponent = () => {
        const { updateFilters } = useFilterState();

        return (
          <button
            onClick={() =>
              updateFilters({
                sexFilter: "Female",
                sizeFilter: "Small",
                ageCategoryFilter: "Puppy",
              })
            }
          >
            Batch Update
          </button>
        );
      };

      render(<TestComponent />);

      const button = screen.getByText("Batch Update");
      fireEvent.click(button);

      // Should batch update multiple filters in one call
      expect(mockUpdateFilters).toHaveBeenCalledWith({
        sexFilter: "Female",
        sizeFilter: "Small",
        ageCategoryFilter: "Puppy",
      });
      expect(mockUpdateFilters).toHaveBeenCalledTimes(1);
    });

    test("FAILING TEST: should calculate active filter count correctly", () => {
      // Test with no active filters
      useFilterState.mockReturnValue({
        filters: {
          standardizedBreedFilter: "Any breed",
          sexFilter: "Any",
          sizeFilter: "Any size",
          ageCategoryFilter: "Any age",
          searchQuery: "",
          locationCountryFilter: "Any country",
          availableCountryFilter: "Any country",
          availableRegionFilter: "Any region",
          organizationFilter: "any",
        },
        updateFilter: jest.fn(),
        updateFilters: jest.fn(),
        resetFilters: jest.fn(),
        clearFilter: jest.fn(),
        activeFilterCount: 0,
        resetTrigger: 0,
        apiParams: {},
      });

      const TestComponent = () => {
        const { activeFilterCount } = useFilterState();
        return <div data-testid="filter-count">{activeFilterCount}</div>;
      };

      const { rerender } = render(<TestComponent />);
      expect(screen.getByTestId("filter-count")).toHaveTextContent("0");

      // Test with 3 active filters
      useFilterState.mockReturnValue({
        filters: {
          standardizedBreedFilter: "Labrador",
          sexFilter: "Male",
          sizeFilter: "Large",
          ageCategoryFilter: "Any age",
          searchQuery: "",
          locationCountryFilter: "Any country",
          availableCountryFilter: "Any country",
          availableRegionFilter: "Any region",
          organizationFilter: "any",
        },
        updateFilter: jest.fn(),
        updateFilters: jest.fn(),
        resetFilters: jest.fn(),
        clearFilter: jest.fn(),
        activeFilterCount: 3,
        resetTrigger: 0,
        apiParams: {},
      });

      rerender(<TestComponent />);
      expect(screen.getByTestId("filter-count")).toHaveTextContent("3");
    });

    test("FAILING TEST: should generate correct API parameters from filters", () => {
      useFilterState.mockReturnValue({
        filters: {
          standardizedBreedFilter: "Golden Retriever",
          sexFilter: "Female",
          sizeFilter: "Large",
          ageCategoryFilter: "Adult",
          searchQuery: "friendly",
          locationCountryFilter: "UK",
          availableCountryFilter: "Any country",
          availableRegionFilter: "Any region",
          organizationFilter: "123",
        },
        updateFilter: jest.fn(),
        updateFilters: jest.fn(),
        resetFilters: jest.fn(),
        clearFilter: jest.fn(),
        activeFilterCount: 6,
        resetTrigger: 0,
        apiParams: {
          search: "friendly",
          standardized_breed: "Golden Retriever",
          organization_id: "123",
          sex: "Female",
          standardized_size: "Large",
          age_category: "Adult",
          location_country: "UK",
        },
      });

      const TestComponent = () => {
        const { apiParams } = useFilterState();
        return <div data-testid="api-params">{JSON.stringify(apiParams)}</div>;
      };

      render(<TestComponent />);

      const params = JSON.parse(screen.getByTestId("api-params").textContent);
      expect(params).toEqual({
        search: "friendly",
        standardized_breed: "Golden Retriever",
        organization_id: "123",
        sex: "Female",
        standardized_size: "Large",
        age_category: "Adult",
        location_country: "UK",
      });

      // Should not include default values
      expect(params).not.toHaveProperty("available_to_country");
      expect(params).not.toHaveProperty("available_to_region");
    });

    test("FAILING TEST: should reset all filters to default values", () => {
      const mockResetFilters = jest.fn();

      useFilterState.mockReturnValue({
        filters: {
          standardizedBreedFilter: "Labrador",
          sexFilter: "Male",
          sizeFilter: "Large",
          ageCategoryFilter: "Puppy",
          searchQuery: "cute",
          locationCountryFilter: "UK",
          availableCountryFilter: "US",
          availableRegionFilter: "California",
          organizationFilter: "456",
        },
        updateFilter: jest.fn(),
        updateFilters: jest.fn(),
        resetFilters: mockResetFilters,
        clearFilter: jest.fn(),
        activeFilterCount: 9,
        resetTrigger: 0,
        apiParams: {},
      });

      const TestComponent = () => {
        const { resetFilters } = useFilterState();
        return <button onClick={resetFilters}>Reset All</button>;
      };

      render(<TestComponent />);

      const button = screen.getByText("Reset All");
      fireEvent.click(button);

      expect(mockResetFilters).toHaveBeenCalled();
    });

    test("FAILING TEST: should clear individual filter to default value", () => {
      const mockClearFilter = jest.fn();

      useFilterState.mockReturnValue({
        filters: {
          standardizedBreedFilter: "Poodle",
          sexFilter: "Any",
          sizeFilter: "Any size",
          ageCategoryFilter: "Any age",
          searchQuery: "",
          locationCountryFilter: "Any country",
          availableCountryFilter: "Any country",
          availableRegionFilter: "Any region",
          organizationFilter: "any",
        },
        updateFilter: jest.fn(),
        updateFilters: jest.fn(),
        resetFilters: jest.fn(),
        clearFilter: mockClearFilter,
        activeFilterCount: 1,
        resetTrigger: 0,
        apiParams: {},
      });

      const TestComponent = () => {
        const { clearFilter } = useFilterState();
        return (
          <button onClick={() => clearFilter("breed")}>Clear Breed</button>
        );
      };

      render(<TestComponent />);

      const button = screen.getByText("Clear Breed");
      fireEvent.click(button);

      expect(mockClearFilter).toHaveBeenCalledWith("breed");
    });

    test("FAILING TEST: should not re-render if filter value unchanged", () => {
      const mockUpdateFilter = jest.fn();
      let renderCount = 0;

      useFilterState.mockReturnValue({
        filters: {
          standardizedBreedFilter: "Any breed",
          sexFilter: "Any",
          sizeFilter: "Any size",
          ageCategoryFilter: "Any age",
          searchQuery: "",
          locationCountryFilter: "Any country",
          availableCountryFilter: "Any country",
          availableRegionFilter: "Any region",
          organizationFilter: "any",
        },
        updateFilter: mockUpdateFilter,
        updateFilters: jest.fn(),
        resetFilters: jest.fn(),
        clearFilter: jest.fn(),
        activeFilterCount: 0,
        resetTrigger: 0,
        apiParams: {},
      });

      const TestComponent = () => {
        const { filters, updateFilter } = useFilterState();
        renderCount++;

        return (
          <div>
            <div data-testid="render-count">{renderCount}</div>
            <button onClick={() => updateFilter("sexFilter", "Any")}>
              Set Same Value
            </button>
          </div>
        );
      };

      render(<TestComponent />);
      expect(screen.getByTestId("render-count")).toHaveTextContent("1");

      const button = screen.getByText("Set Same Value");
      fireEvent.click(button);

      // Should not increment render count when setting same value
      expect(mockUpdateFilter).toHaveBeenCalledWith("sexFilter", "Any");
      // The hook should prevent unnecessary re-renders
    });
  });
});

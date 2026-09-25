/**
 * Simplified test suite for MobileFilterDrawer component
 * Basic rendering tests only - detailed functionality covered by e2e tests
 */

import React from "react";
import { render, screen, fireEvent, act } from "../../../test-utils";
import "@testing-library/jest-dom";
import MobileFilterDrawer from "../MobileFilterDrawer";

// Mock framer-motion to avoid animation issues in tests
jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

const mockProps = {
  isOpen: true,
  onClose: jest.fn(),
  searchQuery: "",
  handleSearchChange: jest.fn(),
  clearSearch: jest.fn(),
  organizationFilter: "any",
  setOrganizationFilter: jest.fn(),
  organizations: [
    { id: null, name: "Any organization" },
    { id: 1, name: "Test Rescue" },
  ],
  standardizedBreedFilter: "Any breed",
  setStandardizedBreedFilter: jest.fn(),
  standardizedBreeds: ["Any breed", "Labrador"],
  sexFilter: "Any",
  setSexFilter: jest.fn(),
  sexOptions: ["Any", "Male", "Female"],
  sizeFilter: "Any size",
  setSizeFilter: jest.fn(),
  sizeOptions: ["Any size", "Small", "Large"],
  ageCategoryFilter: "Any age",
  setAgeCategoryFilter: jest.fn(),
  ageOptions: ["Any age", "Puppy", "Adult"],
  locationCountryFilter: "Any country",
  setLocationCountryFilter: jest.fn(),
  locationCountries: ["Any country", "USA"],
  availableCountryFilter: "Any country",
  setAvailableCountryFilter: jest.fn(),
  availableCountries: ["Any country", "Germany"],
  availableRegionFilter: "Any region",
  setAvailableRegionFilter: jest.fn(),
  availableRegions: ["Any region", "Europe"],
  resetFilters: jest.fn(),
  filterCounts: null,
};

describe("MobileFilterDrawer Component", () => {
  test("renders when open", () => {
    render(<MobileFilterDrawer {...mockProps} />);

    expect(screen.getByText("Filters")).toBeInTheDocument();
    expect(screen.getByTestId("search-input")).toBeInTheDocument();
  });

  test("does not render when closed", () => {
    render(<MobileFilterDrawer {...mockProps} isOpen={false} />);

    expect(screen.queryByText("Filters")).not.toBeInTheDocument();
  });

  test("an active text search still counts where the drawer has no box for it", () => {
    render(
      <MobileFilterDrawer
        {...mockProps}
        searchQuery="bella"
        filterConfig={{
          showAge: true,
          showBreed: true,
          showSize: true,
          showSex: true,
          showShipsTo: true,
          showOrganization: true,
          showSearch: false,
        }}
      />,
    );

    expect(screen.queryByTestId("search-input")).not.toBeInTheDocument();
    expect(screen.getByTestId("clear-all-filters")).toBeInTheDocument();
  });

  test("the apply button shows how many dogs match (#494)", () => {
    const { rerender } = render(<MobileFilterDrawer {...mockProps} matchCount={214} />);
    expect(screen.getByRole("button", { name: "Show 214 dogs" })).toBeInTheDocument();

    rerender(<MobileFilterDrawer {...mockProps} matchCount={1} />);
    expect(screen.getByRole("button", { name: "Show 1 dog" })).toBeInTheDocument();

    rerender(<MobileFilterDrawer {...mockProps} matchCount={null} />);
    expect(screen.getByRole("button", { name: "Show dogs" })).toBeInTheDocument();
  });

  test("the search box waits for a pause before searching", () => {
    jest.useFakeTimers();
    const handleSearchChange = jest.fn();
    render(<MobileFilterDrawer {...mockProps} handleSearchChange={handleSearchChange} />);

    fireEvent.change(screen.getByTestId("search-input"), { target: { value: "bel" } });
    expect(screen.getByTestId("search-input")).toHaveValue("bel");
    expect(handleSearchChange).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(400));
    expect(handleSearchChange).toHaveBeenCalledWith("bel");
    jest.useRealTimers();
  });

  test("resetting drops a search that was still waiting to be sent", () => {
    jest.useFakeTimers();
    const handleSearchChange = jest.fn();
    const resetFilters = jest.fn();
    render(
      <MobileFilterDrawer
        {...mockProps}
        sizeFilter="Small"
        handleSearchChange={handleSearchChange}
        resetFilters={resetFilters}
      />,
    );

    fireEvent.change(screen.getByTestId("search-input"), { target: { value: "bel" } });
    fireEvent.click(screen.getByTestId("clear-all-filters"));
    act(() => jest.advanceTimersByTime(1000));

    expect(resetFilters).toHaveBeenCalled();
    expect(handleSearchChange).not.toHaveBeenCalled();
    expect(screen.getByTestId("search-input")).toHaveValue("");
    jest.useRealTimers();
  });

  test("search input is labelled for accessibility", () => {
    render(<MobileFilterDrawer {...mockProps} />);

    expect(screen.getByLabelText("Search these dogs")).toBe(screen.getByTestId("search-input"));
  });

  test("country filter select trigger has aria-label for accessibility", () => {
    render(<MobileFilterDrawer {...mockProps} />);

    const countryTrigger = screen.getByRole("combobox", {
      name: "Filter by adoptable country",
    });
    expect(countryTrigger).toBeInTheDocument();
  });
});

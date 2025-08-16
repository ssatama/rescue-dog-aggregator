/**
 * Simplified test suite for MobileFilterDrawer component
 * Basic rendering tests only - detailed functionality covered by e2e tests
 */

import React from "react";
import { render, screen } from "../../../test-utils";
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
});

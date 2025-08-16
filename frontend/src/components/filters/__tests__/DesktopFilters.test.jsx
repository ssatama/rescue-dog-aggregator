import React from "react";
import { render, screen } from "../../../test-utils";
import "@testing-library/jest-dom";
import DesktopFilters from "../DesktopFilters";

// Mock data for testing
const mockProps = {
  // Search
  searchQuery: "",
  handleSearchChange: jest.fn(),
  clearSearch: jest.fn(),

  // Organization
  organizationFilter: "any",
  setOrganizationFilter: jest.fn(),
  organizations: [
    { id: null, name: "Any organization" },
    { id: 1, name: "Rescue Organization 1" },
  ],

  // Breed
  standardizedBreedFilter: "Any breed",
  setStandardizedBreedFilter: jest.fn(),
  standardizedBreeds: ["Any breed", "Labrador", "Golden Retriever"],

  // Pet Details
  sexFilter: "Any",
  setSexFilter: jest.fn(),
  sexOptions: ["Any", "Male", "Female"],

  sizeFilter: "Any size",
  setSizeFilter: jest.fn(),
  sizeOptions: ["Any size", "Small", "Medium", "Large"],

  ageCategoryFilter: "Any age",
  setAgeCategoryFilter: jest.fn(),
  ageOptions: ["Any age", "Puppy", "Adult", "Senior"],

  // Location
  locationCountryFilter: "Any country",
  setLocationCountryFilter: jest.fn(),
  locationCountries: ["Any country", "USA"],

  availableCountryFilter: "Any country",
  setAvailableCountryFilter: jest.fn(),
  availableCountries: ["Any country", "Germany"],

  availableRegionFilter: "Any region",
  setAvailableRegionFilter: jest.fn(),
  availableRegions: ["Any region", "Europe"],

  // Filter management
  resetFilters: jest.fn(),
  filterCounts: null,
};

describe("DesktopFilters Component", () => {
  test("renders component without crashing", () => {
    render(<DesktopFilters {...mockProps} />);

    // Basic structure tests
    expect(screen.getByTestId("desktop-filters-container")).toBeInTheDocument();
    expect(screen.getByTestId("desktop-filters-panel")).toBeInTheDocument();
    expect(screen.getByTestId("filters-title")).toHaveTextContent("Filters");
  });

  test("renders search input", () => {
    render(<DesktopFilters {...mockProps} />);

    const searchInput = screen.getByTestId("search-input");
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute("placeholder", "Search dogs...");
  });

  test("renders all filter sections", () => {
    render(<DesktopFilters {...mockProps} />);

    // Check for main filter sections
    expect(screen.getByText("Size")).toBeInTheDocument();
    expect(screen.getByText("Age")).toBeInTheDocument();
    expect(screen.getByText("Sex")).toBeInTheDocument();
    expect(screen.getByText("Breed")).toBeInTheDocument();
    expect(screen.getByText("Organization")).toBeInTheDocument();
    expect(screen.getByText("Adoptable to Country")).toBeInTheDocument();
  });
});

import React from "react";
import { render, screen } from "../../../test-utils";
import "@testing-library/jest-dom";
import DesktopFilters from "../DesktopFilters";
import MobileFilterDrawer from "../MobileFilterDrawer";
import { ageFilterLabel } from "@/constants/filters";

/**
 * The flat age option arrays use one string as the state value, the URL
 * parameter, the API parameter and the display text. "Unknown" is right for
 * the first three and useless as the fourth: as a selected chip it reads
 * "Unknown" with no noun. The label is therefore a display-only override, so
 * the value travelling to the API stays untouched.
 */
describe("ageFilterLabel", () => {
  it("gives unknown-age dogs a label that says what is unknown", () => {
    expect(ageFilterLabel("Unknown")).toBe("Age Unknown");
  });

  it("passes every other option through unchanged", () => {
    for (const option of ["Any age", "Puppy", "Young", "Adult", "Senior"]) {
      expect(ageFilterLabel(option)).toBe(option);
    }
  });
});

const AGE_OPTIONS = ["Any age", "Puppy", "Young", "Adult", "Senior", "Unknown"];

const baseProps = {
  searchQuery: "",
  handleSearchChange: jest.fn(),
  clearSearch: jest.fn(),
  organizationFilter: "any",
  setOrganizationFilter: jest.fn(),
  organizations: [{ id: null, name: "Any organization" }],
  standardizedBreedFilter: "Any breed",
  setStandardizedBreedFilter: jest.fn(),
  standardizedBreeds: ["Any breed"],
  sexFilter: "Any",
  setSexFilter: jest.fn(),
  sexOptions: ["Any", "Male", "Female"],
  sizeFilter: "Any size",
  setSizeFilter: jest.fn(),
  sizeOptions: ["Any size", "Small"],
  ageCategoryFilter: "Any age",
  setAgeCategoryFilter: jest.fn(),
  ageOptions: AGE_OPTIONS,
  locationCountryFilter: "Any country",
  setLocationCountryFilter: jest.fn(),
  locationCountries: ["Any country"],
  availableCountryFilter: "Any country",
  setAvailableCountryFilter: jest.fn(),
  availableCountries: ["Any country"],
  availableRegionFilter: "Any region",
  setAvailableRegionFilter: jest.fn(),
  availableRegions: ["Any region"],
  resetFilters: jest.fn(),
};

describe("age filter rendering", () => {
  it("labels the Unknown option in the desktop filters", () => {
    render(<DesktopFilters {...baseProps} />);

    expect(screen.getAllByText("Age Unknown").length).toBeGreaterThan(0);
  });

  it("keeps the API value on the desktop option, not the label", () => {
    render(<DesktopFilters {...baseProps} />);

    // The value is what reaches age_category, so it must stay "Unknown".
    expect(screen.getByTestId("age-button-Unknown")).toBeInTheDocument();
  });

  it("labels the Unknown option in the mobile drawer", () => {
    render(
      <MobileFilterDrawer
        {...baseProps}
        isOpen={true}
        onClose={jest.fn()}
        totalDogsCount={0}
      />,
    );

    expect(screen.getAllByText("Age Unknown").length).toBeGreaterThan(0);
  });
});

import React from "react";
import { render, screen } from "../../../test-utils";
import MobileFilterDrawer from "../MobileFilterDrawer";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => ({
    get: jest.fn(() => null),
    toString: jest.fn(() => ""),
  }),
}));

describe("MobileFilterDrawer without breed props", () => {
  const propsWithoutBreed = {
    isOpen: true,
    onClose: jest.fn(),
    filterConfig: {
      showBreed: false,
      showAge: true,
      showSex: true,
      showSize: false,
      showShipsTo: false,
      showOrganization: false,
      showSearch: false,
    },
    searchQuery: "",
    handleSearchChange: jest.fn(),
    clearSearch: jest.fn(),
    organizationFilter: "any",
    setOrganizationFilter: jest.fn(),
    organizations: [],
    sexFilter: "Any",
    setSexFilter: jest.fn(),
    sexOptions: ["Any", "Male", "Female"],
    sizeFilter: "Any size",
    setSizeFilter: jest.fn(),
    sizeOptions: ["Any size"],
    ageCategoryFilter: "Any age",
    setAgeCategoryFilter: jest.fn(),
    ageOptions: ["Any age", "Puppy", "Young", "Adult", "Senior"],
    availableCountryFilter: "Any country",
    setAvailableCountryFilter: jest.fn(),
    availableCountries: ["Any country"],
    resetFilters: jest.fn(),
    filterCounts: null,
    totalDogsCount: 100,
  };

  it("renders without breed props when showBreed is false", () => {
    render(<MobileFilterDrawer {...propsWithoutBreed} />);

    expect(screen.getByText("Age")).toBeInTheDocument();
    expect(screen.getByText("Sex")).toBeInTheDocument();
    expect(screen.queryByText("Breed")).not.toBeInTheDocument();
  });

  it("does not crash when breed filter callbacks are absent", () => {
    expect(() => {
      render(<MobileFilterDrawer {...propsWithoutBreed} />);
    }).not.toThrow();
  });
});

import React from "react";
import { render, screen } from "../../../test-utils";
import userEvent from "@testing-library/user-event";
import FilterControls from "../../../components/dogs/FilterControls";

const mockProps = {
  searchQuery: "",
  handleSearchChange: jest.fn(),
  clearSearch: jest.fn(),
  organizationFilter: "any",
  setOrganizationFilter: jest.fn(),
  organizations: [
    { id: null, name: "Any organization" },
    { id: 5, name: "Foo Org" },
  ],
  standardizedBreedFilter: "Any breed",
  setStandardizedBreedFilter: jest.fn(),
  standardizedBreeds: ["Any breed", "Poodle"],
  sexFilter: "Any",
  setSexFilter: jest.fn(),
  sexOptions: ["Any", "Male", "Female"],
  sizeFilter: "Any size",
  setSizeFilter: jest.fn(),
  sizeOptions: ["Any size", "Small", "Medium"],
  ageCategoryFilter: "Any age",
  setAgeCategoryFilter: jest.fn(),
  ageOptions: ["Any age", "Puppy"],
  locationCountryFilter: "Any country",
  setLocationCountryFilter: jest.fn(),
  locationCountries: ["Any country", "US"],
  availableCountryFilter: "Any country",
  setAvailableCountryFilter: jest.fn(),
  availableCountries: ["Any country", "US"],
  availableRegionFilter: "Any region",
  setAvailableRegionFilter: jest.fn(),
  availableRegions: ["Any region", "CA"],
};

describe("<FilterControls />", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders all select triggers and input", () => {
    render(<FilterControls {...mockProps} />);
    // Search input
    expect(screen.getByPlaceholderText(/Name or breed/i)).toBeInTheDocument();
    // Organization
    expect(screen.getByLabelText(/Rescue Organization/i)).toBeInTheDocument();
    // Breed
    expect(screen.getByLabelText(/Breed/i)).toBeInTheDocument();
    // Sex
    expect(screen.getByLabelText(/Sex/i)).toBeInTheDocument();
    // Size
    expect(screen.getByLabelText(/Size/i)).toBeInTheDocument();
    // Age
    expect(screen.getByLabelText(/Age/i)).toBeInTheDocument();
    // Location Country
    expect(screen.getByLabelText(/Located In/i)).toBeInTheDocument();
    // Adoptable to Country
    expect(screen.getByLabelText(/Adoptable to Country/i)).toBeInTheDocument();
    // Adoptable in Region
    expect(screen.getByLabelText(/Adoptable in Region/i)).toBeInTheDocument();
  });

  it("calls handlers when selects change", async () => {
    render(<FilterControls {...mockProps} />);
    const user = userEvent.setup();

    // Change Org
    await user.click(screen.getByLabelText(/Rescue Organization/i));
    await user.click(await screen.findByRole("option", { name: "Foo Org" }));
    expect(mockProps.setOrganizationFilter).toHaveBeenCalledWith("5");

    // Change Breed
    await user.click(screen.getByLabelText(/Breed/i));
    await user.click(await screen.findByRole("option", { name: "Poodle" }));
    expect(mockProps.setStandardizedBreedFilter).toHaveBeenCalledWith("Poodle");

    // Change Sex
    await user.click(screen.getByLabelText(/Sex/i));
    await user.click(await screen.findByRole("option", { name: "Male" }));
    expect(mockProps.setSexFilter).toHaveBeenCalledWith("Male");

    // Change Size
    await user.click(screen.getByLabelText(/Size/i));
    await user.click(await screen.findByRole("option", { name: "Small" }));
    expect(mockProps.setSizeFilter).toHaveBeenCalledWith("Small");

    // Change Age
    await user.click(screen.getByLabelText(/Age/i));
    await user.click(await screen.findByRole("option", { name: "Puppy" }));
    expect(mockProps.setAgeCategoryFilter).toHaveBeenCalledWith("Puppy");

    // Change Location Country
    await user.click(screen.getByLabelText(/Located In/i));
    await user.click(await screen.findByRole("option", { name: "US" }));
    expect(mockProps.setLocationCountryFilter).toHaveBeenCalledWith("US");

    // Change Available Country
    await user.click(screen.getByLabelText(/Adoptable to Country/i));
    await user.click(await screen.findByRole("option", { name: "US" }));
    expect(mockProps.setAvailableCountryFilter).toHaveBeenCalledWith("US");
  });

  it('disables "Adoptable in Region" when no country is selected', () => {
    render(
      <FilterControls
        {...mockProps}
        availableCountryFilter="Any country"
        availableRegions={["Any region", "CA"]}
      />,
    );
    expect(screen.getByLabelText(/Adoptable in Region/i)).toBeDisabled();
  });

  it('enables "Adoptable in Region" when a real country is selected', () => {
    render(
      <FilterControls
        {...mockProps}
        availableCountryFilter="US"
        availableRegions={["Any region", "CA"]}
      />,
    );
    expect(screen.getByLabelText(/Adoptable in Region/i)).toBeEnabled();
  });
});

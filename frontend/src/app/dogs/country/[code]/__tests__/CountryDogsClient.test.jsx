import { render, screen } from "@testing-library/react";
import CountryDogsClient from "../CountryDogsClient";

// Mock Breadcrumbs component
jest.mock("@/components/ui/Breadcrumbs", () => {
  return function MockBreadcrumbs({ items }) {
    return <nav data-testid="breadcrumbs">{items.length} items</nav>;
  };
});

// Mock CountryQuickNav component
jest.mock("@/components/countries/CountryQuickNav", () => {
  return function MockCountryQuickNav({ currentCountry }) {
    return <nav data-testid="country-quick-nav">{currentCountry}</nav>;
  };
});

// Mock DogsPageClientSimplified component
jest.mock("../../../DogsPageClientSimplified", () => {
  return function MockDogsPageClientSimplified({ initialParams }) {
    return (
      <div data-testid="dogs-page-client">
        Filter: {initialParams.location_country}
      </div>
    );
  };
});

const mockCountry = {
  code: "UK",
  name: "United Kingdom",
  shortName: "UK",
  flag: "🇬🇧",
  gradient: "from-rose-500 via-orange-500 to-amber-400",
  tagline: "From the British Isles with love",
};

const mockInitialDogs = [
  { slug: "max-1", name: "Max", breed: "Labrador" },
  { slug: "bella-2", name: "Bella", breed: "German Shepherd" },
];

const mockAllCountries = [
  { code: "UK", shortName: "UK", flag: "🇬🇧", count: 3000 },
  { code: "DE", shortName: "Germany", flag: "🇩🇪", count: 800 },
];

const mockMetadata = {
  total: 3000,
  page: 1,
  limit: 24,
};

describe("CountryDogsClient", () => {
  const defaultProps = {
    country: mockCountry,
    initialDogs: mockInitialDogs,
    metadata: mockMetadata,
    allCountries: mockAllCountries,
    totalCount: 3000,
  };

  it("renders country name in hero", () => {
    render(<CountryDogsClient {...defaultProps} />);

    expect(screen.getByText(/Rescue Dogs in United Kingdom/i)).toBeInTheDocument();
  });

  it("displays country flag", () => {
    render(<CountryDogsClient {...defaultProps} />);

    const flags = screen.getAllByText("🇬🇧");
    expect(flags.length).toBeGreaterThan(0);
  });

  it("displays dog count", () => {
    render(<CountryDogsClient {...defaultProps} />);

    expect(screen.getByText("3,000")).toBeInTheDocument();
  });

  it("displays country tagline", () => {
    render(<CountryDogsClient {...defaultProps} />);

    expect(screen.getByText(/From the British Isles with love/i)).toBeInTheDocument();
  });

  it("renders breadcrumbs", () => {
    render(<CountryDogsClient {...defaultProps} />);

    expect(screen.getByTestId("breadcrumbs")).toBeInTheDocument();
  });

  it("renders country quick nav", () => {
    render(<CountryDogsClient {...defaultProps} />);

    expect(screen.getByTestId("country-quick-nav")).toBeInTheDocument();
  });

  it("passes country filter to DogsPageClientSimplified", () => {
    render(<CountryDogsClient {...defaultProps} />);

    expect(screen.getByTestId("dogs-page-client")).toHaveTextContent("Filter: UK");
  });

  it("does not render Layout wrapper (Layout is at server page level)", () => {
    render(<CountryDogsClient {...defaultProps} />);

    expect(screen.queryByTestId("layout")).not.toBeInTheDocument();
  });
});

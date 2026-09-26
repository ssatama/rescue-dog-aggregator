import { render, screen } from "@testing-library/react";
import CountryDogsClient from "../CountryDogsClient";
import { COUNTRIES } from "@/utils/countryData";

jest.mock("@/components/ui/Breadcrumbs", () => {
  return function MockBreadcrumbs({ items }) {
    return <nav data-testid="breadcrumbs">{items.map((item) => item.name).join(" / ")}</nav>;
  };
});

jest.mock("../../../DogsPageClientSimplified", () => {
  return function MockDogsPageClientSimplified({ initialParams }) {
    return <div data-testid="dogs-page-client">Filter: {initialParams.location_country}</div>;
  };
});

const defaultProps = {
  country: COUNTRIES.UK,
  initialDogs: [],
  metadata: {},
  allCountries: { UK: COUNTRIES.UK, DE: COUNTRIES.DE },
  totalCount: 579,
  adoptableCount: 924,
};

describe("CountryDogsClient", () => {
  it("names the country in its heading", () => {
    render(<CountryDogsClient {...defaultProps} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Rescue dogs in the UK");
  });

  it("explains both numbers in plain words", () => {
    render(<CountryDogsClient {...defaultProps} />);

    expect(screen.getByText(/dogs are in the UK right now/)).toHaveTextContent(
      "579 dogs are in the UK right now. 924 dogs can be adopted by someone living in the UK",
    );
  });

  it("links to the dogs someone living there can adopt", () => {
    render(<CountryDogsClient {...defaultProps} />);

    expect(screen.getByRole("link", { name: /See every dog you can adopt in the UK/ })).toHaveAttribute(
      "href",
      "/dogs?available_country=UK",
    );
  });

  it("leaves the adoptable number and link out when there is none", () => {
    render(<CountryDogsClient {...defaultProps} adoptableCount={0} />);

    expect(screen.getByText(/dogs are in the UK right now/)).not.toHaveTextContent("can be adopted");
    expect(screen.queryByRole("link", { name: /you can adopt/ })).not.toBeInTheDocument();
  });

  it("keeps the breadcrumb trail", () => {
    render(<CountryDogsClient {...defaultProps} />);

    expect(screen.getByTestId("breadcrumbs")).toHaveTextContent("Home / Dogs / Countries / United Kingdom");
  });

  it("links the other countries and marks this one", () => {
    render(<CountryDogsClient {...defaultProps} />);

    const nav = screen.getByRole("navigation", { name: "Browse by country" });
    expect(nav.querySelector('[aria-current="page"]')).toHaveAttribute("href", "/dogs/country/uk");
    expect(nav.querySelector('a[href="/dogs/country/de"]')).toBeInTheDocument();
  });

  it("fixes the catalog to dogs in the country", () => {
    render(<CountryDogsClient {...defaultProps} />);

    expect(screen.getByTestId("dogs-page-client")).toHaveTextContent("Filter: UK");
  });
});

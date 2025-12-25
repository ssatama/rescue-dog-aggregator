import { render, screen } from "@testing-library/react";
import CountryQuickNav from "../CountryQuickNav";

// Mock next/link
jest.mock("next/link", () => {
  return function MockLink({ children, href }) {
    return <a href={href}>{children}</a>;
  };
});

const mockCountries = [
  { code: "UK", name: "United Kingdom", shortName: "UK", flag: "🇬🇧" },
  { code: "DE", name: "Germany", shortName: "Germany", flag: "🇩🇪" },
  { code: "SR", name: "Serbia", shortName: "Serbia", flag: "🇷🇸" },
];

describe("CountryQuickNav", () => {
  it("renders all country links plus All Countries", () => {
    render(
      <CountryQuickNav currentCountry="UK" allCountries={mockCountries} />
    );

    expect(screen.getByText("All Countries")).toBeInTheDocument();
    expect(screen.getByText("UK")).toBeInTheDocument();
    expect(screen.getByText("Germany")).toBeInTheDocument();
    expect(screen.getByText("Serbia")).toBeInTheDocument();
  });

  it("highlights current country with active styles", () => {
    render(
      <CountryQuickNav currentCountry="UK" allCountries={mockCountries} />
    );

    const ukPill = screen.getByText("UK").closest("div");
    expect(ukPill).toHaveAttribute("data-active", "true");
    expect(ukPill).toHaveClass("bg-orange-500");
  });

  it("renders country flags", () => {
    render(
      <CountryQuickNav currentCountry="UK" allCountries={mockCountries} />
    );

    expect(screen.getByText("🇬🇧")).toBeInTheDocument();
    expect(screen.getByText("🇩🇪")).toBeInTheDocument();
    expect(screen.getByText("🇷🇸")).toBeInTheDocument();
  });

  it("renders correct lowercase href for each country", () => {
    render(
      <CountryQuickNav currentCountry="UK" allCountries={mockCountries} />
    );

    expect(screen.getByRole("link", { name: /All Countries/i })).toHaveAttribute(
      "href",
      "/dogs/country"
    );
    expect(screen.getByRole("link", { name: /🇬🇧 UK/i })).toHaveAttribute(
      "href",
      "/dogs/country/uk"
    );
    expect(screen.getByRole("link", { name: /🇩🇪 Germany/i })).toHaveAttribute(
      "href",
      "/dogs/country/de"
    );
  });

  it("always renders All Countries link even with empty countries", () => {
    render(<CountryQuickNav currentCountry="UK" allCountries={[]} />);

    expect(screen.getByText("All Countries")).toBeInTheDocument();
  });

  it("applies non-active styles to other countries", () => {
    render(
      <CountryQuickNav currentCountry="UK" allCountries={mockCountries} />
    );

    const dePill = screen.getByText("Germany").closest("div");
    expect(dePill).toHaveAttribute("data-active", "false");
    expect(dePill).toHaveClass("bg-muted");
  });

  it("highlights All Countries when no currentCountry", () => {
    render(
      <CountryQuickNav currentCountry={null} allCountries={mockCountries} />
    );

    const allPill = screen.getByText("All Countries").closest("div");
    expect(allPill).toHaveClass("bg-orange-500");
  });
});

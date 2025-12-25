import React from "react";
import { render, screen } from "../../../test-utils";
import CountryBrowseSection from "../CountryBrowseSection";

jest.mock("next/link", () => {
  return function MockLink({ children, href, ...props }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

const mockCountryStats = [
  { code: "UK", count: 1500 },
  { code: "DE", count: 800 },
  { code: "BG", count: 600 },
  { code: "SR", count: 400 },
  { code: "BA", count: 200 },
];

describe("CountryBrowseSection", () => {
  describe("Rendering", () => {
    test("should render section headline", () => {
      render(<CountryBrowseSection countryStats={mockCountryStats} />);
      expect(screen.getByText("Dogs from Across Europe")).toBeInTheDocument();
    });

    test("should render section subheading", () => {
      render(<CountryBrowseSection countryStats={mockCountryStats} />);
      expect(
        screen.getByText("Browse rescue dogs by their country of origin")
      ).toBeInTheDocument();
    });

    test("should render View All Countries button", () => {
      render(<CountryBrowseSection countryStats={mockCountryStats} />);
      expect(screen.getByText("View All Countries →")).toBeInTheDocument();
    });

    test("should link View All button to /dogs/country", () => {
      render(<CountryBrowseSection countryStats={mockCountryStats} />);
      const viewAllButton = screen.getByText("View All Countries →");
      expect(viewAllButton.closest("a")).toHaveAttribute(
        "href",
        "/dogs/country"
      );
    });
  });

  describe("Country Cards", () => {
    test("should render top 4 countries by count", () => {
      render(<CountryBrowseSection countryStats={mockCountryStats} />);

      expect(screen.getByText("UK")).toBeInTheDocument();
      expect(screen.getByText("Germany")).toBeInTheDocument();
      expect(screen.getByText("Bulgaria")).toBeInTheDocument();
      expect(screen.getByText("Serbia")).toBeInTheDocument();
    });

    test("should not render countries beyond top 4", () => {
      render(<CountryBrowseSection countryStats={mockCountryStats} />);

      expect(screen.queryByText("Bosnia")).not.toBeInTheDocument();
    });

    test("should display dog counts for each country", () => {
      render(<CountryBrowseSection countryStats={mockCountryStats} />);

      expect(screen.getByText("1,500 dogs")).toBeInTheDocument();
      expect(screen.getByText("800 dogs")).toBeInTheDocument();
      expect(screen.getByText("600 dogs")).toBeInTheDocument();
      expect(screen.getByText("400 dogs")).toBeInTheDocument();
    });

    test("should have correct links for country cards", () => {
      render(<CountryBrowseSection countryStats={mockCountryStats} />);

      const ukLink = screen.getByText("UK").closest("a");
      const germanyLink = screen.getByText("Germany").closest("a");

      expect(ukLink).toHaveAttribute("href", "/dogs/country/uk");
      expect(germanyLink).toHaveAttribute("href", "/dogs/country/de");
    });

    test("should render country flags", () => {
      render(<CountryBrowseSection countryStats={mockCountryStats} />);

      expect(screen.getByLabelText("United Kingdom flag")).toBeInTheDocument();
      expect(screen.getByLabelText("Germany flag")).toBeInTheDocument();
    });
  });

  describe("Empty State", () => {
    test("should not render when countryStats is empty", () => {
      const { container } = render(<CountryBrowseSection countryStats={[]} />);
      expect(container.querySelector("section")).not.toBeInTheDocument();
    });

    test("should not render when countryStats is undefined", () => {
      const { container } = render(<CountryBrowseSection />);
      expect(container.querySelector("section")).not.toBeInTheDocument();
    });

    test("should not render countries with zero count", () => {
      const statsWithZero = [
        { code: "UK", count: 100 },
        { code: "DE", count: 0 },
      ];
      render(<CountryBrowseSection countryStats={statsWithZero} />);

      expect(screen.getByText("UK")).toBeInTheDocument();
      expect(screen.queryByText("Germany")).not.toBeInTheDocument();
    });
  });

  describe("Responsive Design", () => {
    test("should have responsive grid classes", () => {
      const { container } = render(
        <CountryBrowseSection countryStats={mockCountryStats} />
      );

      const grid = container.querySelector(".grid");
      expect(grid).toHaveClass("grid-cols-2", "md:grid-cols-4");
    });
  });

  describe("Accessibility", () => {
    test("should use semantic section element", () => {
      const { container } = render(
        <CountryBrowseSection countryStats={mockCountryStats} />
      );

      const section = container.querySelector("section");
      expect(section).toBeInTheDocument();
    });

    test("should have aria-labelledby on section", () => {
      const { container } = render(
        <CountryBrowseSection countryStats={mockCountryStats} />
      );

      const section = container.querySelector("section");
      expect(section).toHaveAttribute(
        "aria-labelledby",
        "country-browse-heading"
      );
    });

    test("should have proper heading hierarchy", () => {
      render(<CountryBrowseSection countryStats={mockCountryStats} />);

      const h2 = screen.getByRole("heading", { level: 2 });
      expect(h2).toHaveTextContent("Dogs from Across Europe");
    });
  });

  describe("Dark Mode", () => {
    test("should have dark mode background", () => {
      const { container } = render(
        <CountryBrowseSection countryStats={mockCountryStats} />
      );

      const section = container.querySelector("section");
      expect(section).toHaveClass("bg-white", "dark:bg-gray-950");
    });
  });
});

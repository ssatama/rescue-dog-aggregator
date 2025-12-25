import React from "react";
import { render, screen } from "@testing-library/react";
import MobileCountryBrowse from "../MobileCountryBrowse";

jest.mock("next/link", () => {
  return function MockLink({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) {
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

describe("MobileCountryBrowse", () => {
  describe("Rendering", () => {
    it("renders section heading", () => {
      render(<MobileCountryBrowse countryStats={mockCountryStats} />);
      expect(screen.getByText("Browse by Country")).toBeInTheDocument();
    });

    it("renders View All link", () => {
      render(<MobileCountryBrowse countryStats={mockCountryStats} />);
      expect(screen.getByText("View All")).toBeInTheDocument();
    });

    it("links View All to /dogs/country", () => {
      render(<MobileCountryBrowse countryStats={mockCountryStats} />);
      const viewAllLink = screen.getByText("View All");
      expect(viewAllLink.closest("a")).toHaveAttribute("href", "/dogs/country");
    });
  });

  describe("Country Cards", () => {
    it("renders top 4 countries by count", () => {
      render(<MobileCountryBrowse countryStats={mockCountryStats} />);

      expect(screen.getByText("UK")).toBeInTheDocument();
      expect(screen.getByText("Germany")).toBeInTheDocument();
      expect(screen.getByText("Bulgaria")).toBeInTheDocument();
      expect(screen.getByText("Serbia")).toBeInTheDocument();
    });

    it("does not render countries beyond top 4", () => {
      render(<MobileCountryBrowse countryStats={mockCountryStats} />);
      expect(screen.queryByText("Bosnia")).not.toBeInTheDocument();
    });

    it("displays dog counts for each country", () => {
      render(<MobileCountryBrowse countryStats={mockCountryStats} />);

      expect(screen.getByText("1,500 dogs")).toBeInTheDocument();
      expect(screen.getByText("800 dogs")).toBeInTheDocument();
      expect(screen.getByText("600 dogs")).toBeInTheDocument();
      expect(screen.getByText("400 dogs")).toBeInTheDocument();
    });

    it("has correct links for country cards", () => {
      render(<MobileCountryBrowse countryStats={mockCountryStats} />);

      const ukLink = screen.getByText("UK").closest("a");
      const germanyLink = screen.getByText("Germany").closest("a");

      expect(ukLink).toHaveAttribute("href", "/dogs/country/uk");
      expect(germanyLink).toHaveAttribute("href", "/dogs/country/de");
    });

    it("renders country flags with proper aria labels", () => {
      render(<MobileCountryBrowse countryStats={mockCountryStats} />);

      expect(screen.getByLabelText("United Kingdom flag")).toBeInTheDocument();
      expect(screen.getByLabelText("Germany flag")).toBeInTheDocument();
    });
  });

  describe("Empty State", () => {
    it("does not render when countryStats is empty", () => {
      const { container } = render(<MobileCountryBrowse countryStats={[]} />);
      expect(container.querySelector("section")).not.toBeInTheDocument();
    });

    it("does not render when countryStats is undefined", () => {
      const { container } = render(<MobileCountryBrowse />);
      expect(container.querySelector("section")).not.toBeInTheDocument();
    });

    it("does not render countries with zero count", () => {
      const statsWithZero = [
        { code: "UK", count: 100 },
        { code: "DE", count: 0 },
      ];
      render(<MobileCountryBrowse countryStats={statsWithZero} />);

      expect(screen.getByText("UK")).toBeInTheDocument();
      expect(screen.queryByText("Germany")).not.toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("has horizontal scroll container", () => {
      const { container } = render(
        <MobileCountryBrowse countryStats={mockCountryStats} />
      );

      const scrollContainer = container.querySelector(".overflow-x-auto");
      expect(scrollContainer).toBeInTheDocument();
    });

    it("has white background on country cards", () => {
      const { container } = render(
        <MobileCountryBrowse countryStats={mockCountryStats} />
      );

      const card = container.querySelector(".bg-white");
      expect(card).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("uses semantic section element", () => {
      const { container } = render(
        <MobileCountryBrowse countryStats={mockCountryStats} />
      );

      const section = container.querySelector("section");
      expect(section).toBeInTheDocument();
    });

    it("has aria-labelledby on section", () => {
      const { container } = render(
        <MobileCountryBrowse countryStats={mockCountryStats} />
      );

      const section = container.querySelector("section");
      expect(section).toHaveAttribute(
        "aria-labelledby",
        "mobile-country-browse-heading"
      );
    });

    it("has proper heading hierarchy", () => {
      render(<MobileCountryBrowse countryStats={mockCountryStats} />);

      const h2 = screen.getByRole("heading", { level: 2 });
      expect(h2).toHaveTextContent("Browse by Country");
    });
  });
});

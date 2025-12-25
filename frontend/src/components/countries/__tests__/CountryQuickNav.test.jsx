import { render, screen, fireEvent, within } from "@testing-library/react";
import CountryQuickNav from "../CountryQuickNav";

// Mock next/link
jest.mock("next/link", () => {
  return function MockLink({ children, href }) {
    return <a href={href}>{children}</a>;
  };
});

// Mock next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const mockCountries = [
  { code: "UK", name: "United Kingdom", shortName: "UK", flag: "🇬🇧" },
  { code: "DE", name: "Germany", shortName: "Germany", flag: "🇩🇪" },
  { code: "SR", name: "Serbia", shortName: "Serbia", flag: "🇷🇸" },
];

describe("CountryQuickNav", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  describe("Desktop (horizontal pills)", () => {
    it("renders all country links plus All Countries", () => {
      render(
        <CountryQuickNav currentCountry="UK" allCountries={mockCountries} />
      );

      const desktopNav = document.querySelector(".hidden.md\\:flex");
      expect(within(desktopNav).getByText("All Countries")).toBeInTheDocument();
      expect(within(desktopNav).getByText("UK")).toBeInTheDocument();
      expect(within(desktopNav).getByText("Germany")).toBeInTheDocument();
      expect(within(desktopNav).getByText("Serbia")).toBeInTheDocument();
    });

    it("highlights current country with active styles", () => {
      render(
        <CountryQuickNav currentCountry="UK" allCountries={mockCountries} />
      );

      const desktopNav = document.querySelector(".hidden.md\\:flex");
      const ukPill = within(desktopNav).getByText("UK").closest("div");
      expect(ukPill).toHaveAttribute("data-active", "true");
      expect(ukPill).toHaveClass("bg-orange-500");
    });

    it("renders country flags", () => {
      render(
        <CountryQuickNav currentCountry="UK" allCountries={mockCountries} />
      );

      const desktopNav = document.querySelector(".hidden.md\\:flex");
      expect(within(desktopNav).getByText("🇬🇧")).toBeInTheDocument();
      expect(within(desktopNav).getByText("🇩🇪")).toBeInTheDocument();
      expect(within(desktopNav).getByText("🇷🇸")).toBeInTheDocument();
    });

    it("renders correct lowercase href for each country", () => {
      render(
        <CountryQuickNav currentCountry="UK" allCountries={mockCountries} />
      );

      const desktopNav = document.querySelector(".hidden.md\\:flex");
      expect(
        within(desktopNav).getByRole("link", { name: /All Countries/i })
      ).toHaveAttribute("href", "/dogs/country");
      expect(
        within(desktopNav).getByRole("link", { name: /🇬🇧 UK/i })
      ).toHaveAttribute("href", "/dogs/country/uk");
      expect(
        within(desktopNav).getByRole("link", { name: /🇩🇪 Germany/i })
      ).toHaveAttribute("href", "/dogs/country/de");
    });

    it("applies non-active styles to other countries", () => {
      render(
        <CountryQuickNav currentCountry="UK" allCountries={mockCountries} />
      );

      const desktopNav = document.querySelector(".hidden.md\\:flex");
      const dePill = within(desktopNav).getByText("Germany").closest("div");
      expect(dePill).toHaveAttribute("data-active", "false");
      expect(dePill).toHaveClass("bg-muted");
    });

    it("highlights All Countries when no currentCountry", () => {
      render(
        <CountryQuickNav currentCountry={null} allCountries={mockCountries} />
      );

      const desktopNav = document.querySelector(".hidden.md\\:flex");
      const allPill = within(desktopNav).getByText("All Countries").closest("div");
      expect(allPill).toHaveClass("bg-orange-500");
    });
  });

  describe("Mobile (dropdown selector)", () => {
    it("shows current country in dropdown button", () => {
      render(
        <CountryQuickNav currentCountry="UK" allCountries={mockCountries} />
      );

      const mobileNav = document.querySelector(".md\\:hidden");
      expect(within(mobileNav).getByText("United Kingdom")).toBeInTheDocument();
      expect(within(mobileNav).getByText("🇬🇧")).toBeInTheDocument();
    });

    it("shows All Countries when no currentCountry selected", () => {
      render(
        <CountryQuickNav currentCountry={null} allCountries={mockCountries} />
      );

      const mobileNav = document.querySelector(".md\\:hidden");
      const button = within(mobileNav).getByRole("button");
      expect(within(button).getByText("All Countries")).toBeInTheDocument();
    });

    it("opens dropdown when button clicked", () => {
      render(
        <CountryQuickNav currentCountry="UK" allCountries={mockCountries} />
      );

      const mobileNav = document.querySelector(".md\\:hidden");
      const button = within(mobileNav).getByRole("button");
      fireEvent.click(button);

      expect(screen.getByRole("listbox")).toBeInTheDocument();
      expect(screen.getAllByRole("option")).toHaveLength(4);
    });

    it("navigates to country when option selected", () => {
      render(
        <CountryQuickNav currentCountry="UK" allCountries={mockCountries} />
      );

      const mobileNav = document.querySelector(".md\\:hidden");
      const button = within(mobileNav).getByRole("button");
      fireEvent.click(button);

      const germanyOption = screen.getByRole("option", { name: /Germany/i });
      fireEvent.click(germanyOption);

      expect(mockPush).toHaveBeenCalledWith("/dogs/country/de");
    });

    it("navigates to All Countries when option selected", () => {
      render(
        <CountryQuickNav currentCountry="UK" allCountries={mockCountries} />
      );

      const mobileNav = document.querySelector(".md\\:hidden");
      const button = within(mobileNav).getByRole("button");
      fireEvent.click(button);

      const listbox = screen.getByRole("listbox");
      const allCountriesOption = within(listbox).getByRole("option", {
        name: /All Countries/i,
      });
      fireEvent.click(allCountriesOption);

      expect(mockPush).toHaveBeenCalledWith("/dogs/country");
    });

    it("shows checkmark on current country in dropdown", () => {
      render(
        <CountryQuickNav currentCountry="UK" allCountries={mockCountries} />
      );

      const mobileNav = document.querySelector(".md\\:hidden");
      const button = within(mobileNav).getByRole("button");
      fireEvent.click(button);

      const ukOption = screen.getByRole("option", { name: /United Kingdom/i });
      expect(ukOption).toHaveAttribute("aria-selected", "true");
    });
  });

  it("always renders All Countries even with empty countries", () => {
    render(<CountryQuickNav currentCountry="UK" allCountries={[]} />);

    const desktopNav = document.querySelector(".hidden.md\\:flex");
    expect(within(desktopNav).getByText("All Countries")).toBeInTheDocument();
  });
});

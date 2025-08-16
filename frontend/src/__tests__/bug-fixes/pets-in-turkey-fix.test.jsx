import React from "react";
import { render, screen } from "../../test-utils";
import "@testing-library/jest-dom";
import CountryFlag from "../../components/ui/CountryFlag";
import OrganizationHero from "../../components/organizations/OrganizationHero";

// Mock Next.js Link
jest.mock("next/link", () => {
  return function MockedLink({ children, href, ...props }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

// Mock SocialMediaLinks component
jest.mock("../../components/ui/SocialMediaLinks", () => {
  return function MockedSocialMediaLinks({ socialMedia }) {
    return <div data-testid="social-media-section">Social Links</div>;
  };
});

// Mock countries utility formatting functions
jest.mock("../../utils/countries", () => {
  const originalModule = jest.requireActual("../../utils/countries");
  return {
    ...originalModule,
    formatBasedIn: jest.fn((country, city, mobile) => {
      // Use the actual normalization logic but return simple text for testing
      const normalizedCode = originalModule.normalizeCountryCode(country);
      const countryName = originalModule.getCountryName(country);
      return mobile
        ? countryName
        : city
          ? `${city}, ${countryName}`
          : countryName;
    }),
    formatServiceRegions: jest.fn((regions, showFlags, mobile) => {
      return regions
        .map((region) => originalModule.getCountryName(region))
        .join(", ");
    }),
    formatShipsToList: jest.fn((countries, limit) => {
      const names = countries.map((country) =>
        originalModule.getCountryName(country),
      );
      return countries.length <= limit
        ? names.join(", ")
        : `${names.slice(0, limit).join(", ")} +${countries.length - limit} more`;
    }),
  };
});

describe("Pets in Turkey Fix", () => {
  describe("Enhanced Country Name Handling", () => {
    test('normalizeCountryCode handles full country name "Turkey"', () => {
      // Import the real functions for testing
      const { normalizeCountryCode } = jest.requireActual(
        "../../utils/countries",
      );
      expect(normalizeCountryCode("Turkey")).toBe("TR");
      expect(normalizeCountryCode("turkey")).toBe("TR");
      expect(normalizeCountryCode("TURKEY")).toBe("TR");
    });

    test("normalizeCountryCode handles other full country names", () => {
      const { normalizeCountryCode } = jest.requireActual(
        "../../utils/countries",
      );
      expect(normalizeCountryCode("Germany")).toBe("DE");
      expect(normalizeCountryCode("United Kingdom")).toBe("GB");
      expect(normalizeCountryCode("Romania")).toBe("RO");
      expect(normalizeCountryCode("netherlands")).toBe("NL");
    });

    test("normalizeCountryCode still handles ISO codes correctly", () => {
      const { normalizeCountryCode } = jest.requireActual(
        "../../utils/countries",
      );
      expect(normalizeCountryCode("TR")).toBe("TR");
      expect(normalizeCountryCode("DE")).toBe("DE");
      expect(normalizeCountryCode("GB")).toBe("GB");
    });

    test("normalizeCountryCode still handles aliases correctly", () => {
      const { normalizeCountryCode } = jest.requireActual(
        "../../utils/countries",
      );
      expect(normalizeCountryCode("UK")).toBe("GB");
      expect(normalizeCountryCode("EN")).toBe("GB");
    });

    test("getCountryName works with full country names as input", () => {
      const { getCountryName } = jest.requireActual("../../utils/countries");
      expect(getCountryName("Turkey")).toBe("Turkey");
      expect(getCountryName("Germany")).toBe("Germany");
      expect(getCountryName("United Kingdom")).toBe("United Kingdom");
    });

    test("complete Turkey input processing flow", () => {
      const { normalizeCountryCode, getCountryName } = jest.requireActual(
        "../../utils/countries",
      );

      expect(normalizeCountryCode("Turkey")).toBe("TR");
      expect(getCountryName("Turkey")).toBe("Turkey");
      expect(getCountryName("TR")).toBe("Turkey");
    });
  });

  describe("CountryFlag with Full Country Names", () => {
    test('displays Turkey flag when given full country name "Turkey"', () => {
      render(
        <CountryFlag countryCode="Turkey" countryName="Turkey" size="small" />,
      );

      const flagImage = screen.queryByRole("img");
      expect(flagImage).toBeInTheDocument();
      expect(flagImage).toHaveAttribute(
        "src",
        "https://flagcdn.com/20x15/tr.png",
      );
      expect(flagImage).toHaveAttribute("alt", "Turkey flag");
    });

    test('displays Germany flag when given full country name "Germany"', () => {
      render(
        <CountryFlag
          countryCode="Germany"
          countryName="Germany"
          size="small"
        />,
      );

      const flagImage = screen.queryByRole("img");
      expect(flagImage).toBeInTheDocument();
      expect(flagImage).toHaveAttribute(
        "src",
        "https://flagcdn.com/20x15/de.png",
      );
    });

    test("does not show duplicate text when using full country names", () => {
      render(
        <CountryFlag countryCode="Turkey" countryName="Turkey" size="small" />,
      );

      // Should show flag, not placeholder text
      expect(screen.queryByText("TURKEY")).not.toBeInTheDocument();
      expect(screen.queryByText("Turkey")).not.toBeInTheDocument();
    });
  });

  describe("Pets in Turkey Organization Display", () => {
    test("displays correctly with Turkey as full country name", () => {
      const petsInTurkeyOrg = {
        id: 1,
        name: "Pets in Turkey",
        description: "Helping rescue dogs in Turkey find homes worldwide",
        country: "Turkey", // Full country name (the problematic case)
        city: "Istanbul",
        service_regions: ["TR"],
        ships_to: ["DE", "NL", "BE"],
        total_dogs: 33,
        new_this_week: 3,
        logo_url: "https://example.com/pit-logo.jpg",
        website_url: "https://petsinturkey.org",
        social_media: {
          facebook: "https://facebook.com/petsinturkey",
        },
      };

      render(<OrganizationHero organization={petsInTurkeyOrg} />);

      // Should display "Based in" with Turkey flag (not duplicate text)
      expect(screen.getByText("Based in:")).toBeInTheDocument();

      // The key test: Make sure we don't have unformatted uppercase "TURKEY" text (the original bug)
      // Turkey may appear multiple times but should be properly formatted as "Turkey", not "TURKEY"
      const allText = screen.getByTestId("organization-hero").textContent;
      expect(allText).not.toMatch(/\bTURKEY\b/); // No uppercase "TURKEY" words (the original bug)

      // Verify Turkey displays correctly (properly formatted)
      expect(allText).toMatch(/Turkey/); // Should contain properly formatted "Turkey"

      // Should display "Dogs located in" section
      expect(screen.getByText("Dogs located in:")).toBeInTheDocument();

      // Should display statistics correctly
      expect(screen.getByText("33")).toBeInTheDocument();
      expect(screen.getByText("Dogs Available")).toBeInTheDocument();
      expect(screen.getByText("Countries")).toBeInTheDocument();

      // Should have exactly one "3" for countries and one "3" for new this week
      const threeElements = screen.getAllByText("3");
      expect(threeElements).toHaveLength(2); // One for countries, one for new this week
    });

    test("handles case where country is null (like other organizations)", () => {
      const standardOrg = {
        id: 2,
        name: "Standard Organization",
        country: null, // Standard case - no country field
        service_regions: ["RO", "DE"],
        ships_to: ["GB", "FR"],
        total_dogs: 52,
        new_this_week: 8,
      };

      render(<OrganizationHero organization={standardOrg} />);

      // Should NOT display "Based in" section when country is null
      expect(screen.queryByText("Based in:")).not.toBeInTheDocument();

      // Should display "Dogs located in" section
      expect(screen.getByText("Dogs located in:")).toBeInTheDocument();
    });
  });

  describe("Edge Cases and Regression Prevention", () => {
    test("handles empty or whitespace country names", () => {
      const { normalizeCountryCode } = jest.requireActual(
        "../../utils/countries",
      );
      expect(normalizeCountryCode("")).toBe("");
      expect(normalizeCountryCode("   ")).toBe("");
      expect(normalizeCountryCode(null)).toBe("");
      expect(normalizeCountryCode(undefined)).toBe("");
    });

    test("handles unknown country names gracefully", () => {
      const { normalizeCountryCode } = jest.requireActual(
        "../../utils/countries",
      );
      expect(normalizeCountryCode("Unknown Country")).toBe("UNKNOWN COUNTRY");
      expect(normalizeCountryCode("XYZ")).toBe("XYZ");
    });

    test("formatBasedIn works with full country names", () => {
      const { formatBasedIn } = jest.requireActual("../../utils/countries");
      const result = formatBasedIn("Turkey", "Istanbul", false);

      // Should render as JSX element
      expect(result).toBeDefined();
      expect(typeof result).toBe("object"); // React element
    });

    test("all existing functionality still works", () => {
      const { normalizeCountryCode } = jest.requireActual(
        "../../utils/countries",
      );
      // Test that we didn't break existing ISO code functionality
      const testCases = [
        { input: "TR", expected: "TR" },
        { input: "DE", expected: "DE" },
        { input: "UK", expected: "GB" }, // Alias
        { input: "Turkey", expected: "TR" }, // New functionality
        { input: "Germany", expected: "DE" }, // New functionality
      ];

      testCases.forEach(({ input, expected }) => {
        expect(normalizeCountryCode(input)).toBe(expected);
      });
    });
  });
});

import React from "react";
import { render, screen } from "../../test-utils";
import "@testing-library/jest-dom";
import CountryFlag from "../../components/ui/CountryFlag";
import { normalizeCountryCode, getCountryName } from "../../utils/countries";

describe("Country Flag Bug Fix", () => {
  describe("UK/GB Country Code Handling", () => {
    test("normalizeCountryCode converts UK to GB", () => {
      expect(normalizeCountryCode("UK")).toBe("GB");
      expect(normalizeCountryCode("uk")).toBe("GB");
      expect(normalizeCountryCode("GB")).toBe("GB");
    });

    test("normalizeCountryCode converts EN to GB", () => {
      expect(normalizeCountryCode("EN")).toBe("GB");
      expect(normalizeCountryCode("en")).toBe("GB");
    });

    test("getCountryName works with UK alias", () => {
      expect(getCountryName("UK")).toBe("United Kingdom");
      expect(getCountryName("GB")).toBe("United Kingdom");
      expect(getCountryName("EN")).toBe("United Kingdom");
    });

    test("CountryFlag renders properly for UK country code", () => {
      render(
        <CountryFlag
          countryCode="UK"
          countryName="United Kingdom"
          size="small"
        />,
      );

      // Should render flag image, not placeholder text
      const flagImage = screen.queryByRole("img");
      expect(flagImage).toBeInTheDocument();

      // Should NOT show placeholder text like "UK"
      expect(screen.queryByText("UK")).not.toBeInTheDocument();
    });

    test("CountryFlag renders properly for GB country code", () => {
      render(
        <CountryFlag
          countryCode="GB"
          countryName="United Kingdom"
          size="small"
        />,
      );

      // Should render flag image
      const flagImage = screen.queryByRole("img");
      expect(flagImage).toBeInTheDocument();

      // Flag should have correct alt text
      expect(flagImage).toHaveAttribute("alt", "United Kingdom flag");
    });

    test("CountryFlag handles case insensitive UK codes", () => {
      render(
        <CountryFlag
          countryCode="uk"
          countryName="United Kingdom"
          size="small"
        />,
      );

      // Should render flag image for lowercase "uk"
      const flagImage = screen.queryByRole("img");
      expect(flagImage).toBeInTheDocument();
    });
  });

  describe("Other Country Code Aliases", () => {
    test("handles standard ISO codes correctly", () => {
      expect(normalizeCountryCode("DE")).toBe("DE");
      expect(normalizeCountryCode("FR")).toBe("FR");
      expect(normalizeCountryCode("IT")).toBe("IT");
    });

    test("preserves unknown codes as-is", () => {
      expect(normalizeCountryCode("XYZ")).toBe("XYZ");
      expect(normalizeCountryCode("ZZ")).toBe("ZZ");
    });

    test("handles empty/invalid input gracefully", () => {
      expect(normalizeCountryCode("")).toBe("");
      expect(normalizeCountryCode(null)).toBe("");
      expect(normalizeCountryCode(undefined)).toBe("");
    });
  });

  describe("Flag Display Integration", () => {
    test("shows proper flag URL for UK country code", () => {
      render(
        <CountryFlag
          countryCode="UK"
          countryName="United Kingdom"
          size="small"
        />,
      );

      const flagImage = screen.queryByRole("img");
      expect(flagImage).toBeInTheDocument();

      // Should use GB (not UK) in the flagcdn.com URL
      expect(flagImage).toHaveAttribute(
        "src",
        "https://flagcdn.com/20x15/gb.png",
      );
    });

    test("displays placeholder correctly for invalid codes", () => {
      render(
        <CountryFlag
          countryCode="INVALID"
          countryName="Invalid Country"
          size="small"
        />,
      );

      // Should show placeholder text for invalid codes
      expect(screen.getByText("INVALID")).toBeInTheDocument();

      // Should show placeholder div with role="img", not an actual img element
      expect(screen.queryByRole("img")).toBeInTheDocument(); // This is the placeholder div
      expect(screen.queryByTestId("flag-image")).not.toBeInTheDocument(); // No actual img tag
    });
  });

  describe("Regression Prevention", () => {
    test("common country codes still work correctly", () => {
      const testCases = [
        { code: "DE", name: "Germany" },
        { code: "FR", name: "France" },
        { code: "IT", name: "Italy" },
        { code: "TR", name: "Turkey" },
        { code: "RO", name: "Romania" },
      ];

      testCases.forEach(({ code, name }) => {
        const { unmount } = render(
          <CountryFlag countryCode={code} countryName={name} size="small" />,
        );

        // Should render flag image for all valid codes
        const flagImage = screen.queryByRole("img");
        expect(flagImage).toBeInTheDocument();

        unmount();
      });
    });

    test("all flag sizes work with UK alias", () => {
      const sizes = ["small", "medium", "large"];

      sizes.forEach((size) => {
        const { unmount } = render(
          <CountryFlag
            countryCode="UK"
            countryName="United Kingdom"
            size={size}
          />,
        );

        const flagImage = screen.queryByRole("img");
        expect(flagImage).toBeInTheDocument();

        unmount();
      });
    });
  });
});

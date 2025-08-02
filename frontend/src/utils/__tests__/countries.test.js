import React from "react";
import { render, screen } from "@testing-library/react";
import {
  COUNTRY_NAMES,
  COUNTRY_CODE_ALIASES,
  normalizeCountryCode,
  getCountryName,
  formatShipsToList,
  formatServiceRegions,
} from "../countries";

describe("countries utility", () => {
  describe("COUNTRY_NAMES", () => {
    test("contains common country codes", () => {
      expect(COUNTRY_NAMES.TR).toBe("Turkey");
      expect(COUNTRY_NAMES.DE).toBe("Germany");
      expect(COUNTRY_NAMES.US).toBe("United States");
      expect(COUNTRY_NAMES.GB).toBe("United Kingdom");
      expect(COUNTRY_NAMES.FR).toBe("France");
      expect(COUNTRY_NAMES.IT).toBe("Italy");
      expect(COUNTRY_NAMES.ES).toBe("Spain");
      expect(COUNTRY_NAMES.NL).toBe("Netherlands");
      expect(COUNTRY_NAMES.BE).toBe("Belgium");
      expect(COUNTRY_NAMES.RO).toBe("Romania");
    });
  });

  describe("COUNTRY_CODE_ALIASES", () => {
    test("contains UK to GB mapping", () => {
      expect(COUNTRY_CODE_ALIASES.UK).toBe("GB");
      expect(COUNTRY_CODE_ALIASES.EN).toBe("GB");
    });
  });

  describe("normalizeCountryCode", () => {
    test("normalizes UK to GB", () => {
      expect(normalizeCountryCode("UK")).toBe("GB");
      expect(normalizeCountryCode("uk")).toBe("GB");
      expect(normalizeCountryCode("Uk")).toBe("GB");
    });

    test("normalizes EN to GB", () => {
      expect(normalizeCountryCode("EN")).toBe("GB");
      expect(normalizeCountryCode("en")).toBe("GB");
    });

    test("returns original code if no alias exists", () => {
      expect(normalizeCountryCode("DE")).toBe("DE");
      expect(normalizeCountryCode("TR")).toBe("TR");
      expect(normalizeCountryCode("US")).toBe("US");
    });

    test("handles empty and invalid inputs", () => {
      expect(normalizeCountryCode("")).toBe("");
      expect(normalizeCountryCode(null)).toBe("");
      expect(normalizeCountryCode(undefined)).toBe("");
    });

    test("trims whitespace", () => {
      expect(normalizeCountryCode(" UK ")).toBe("GB");
      expect(normalizeCountryCode("  EN  ")).toBe("GB");
    });
  });

  describe("getCountryName", () => {
    test("returns correct country name for valid code", () => {
      expect(getCountryName("TR")).toBe("Turkey");
      expect(getCountryName("DE")).toBe("Germany");
    });

    test("normalizes UK to United Kingdom via GB", () => {
      expect(getCountryName("UK")).toBe("United Kingdom");
      expect(getCountryName("uk")).toBe("United Kingdom");
      expect(getCountryName("Uk")).toBe("United Kingdom");
    });

    test("normalizes EN to United Kingdom via GB", () => {
      expect(getCountryName("EN")).toBe("United Kingdom");
      expect(getCountryName("en")).toBe("United Kingdom");
    });

    test("returns country code for unknown code", () => {
      expect(getCountryName("XX")).toBe("XX");
      expect(getCountryName("ZZ")).toBe("ZZ");
    });

    test("handles lowercase country codes", () => {
      expect(getCountryName("tr")).toBe("Turkey");
      expect(getCountryName("de")).toBe("Germany");
    });

    test("handles null and undefined", () => {
      expect(getCountryName(null)).toBe("Unknown");
      expect(getCountryName(undefined)).toBe("Unknown");
      expect(getCountryName("")).toBe("Unknown");
    });
  });

  describe("formatShipsToList", () => {
    test("shows all countries when ≤3 countries", () => {
      const countries = ["DE", "FR", "IT"];
      const result = formatShipsToList(countries);

      render(<div>{result}</div>);

      expect(screen.getByText("Germany")).toBeInTheDocument();
      expect(screen.getByText("France")).toBeInTheDocument();
      expect(screen.getByText("Italy")).toBeInTheDocument();
      expect(screen.queryByText(/more/)).not.toBeInTheDocument();
    });

    test('shows first 3 + "more" when >3 countries', () => {
      const countries = ["DE", "FR", "IT", "ES", "NL"];
      const result = formatShipsToList(countries);

      render(<div>{result}</div>);

      expect(screen.getByText("Germany")).toBeInTheDocument();
      expect(screen.getByText("France")).toBeInTheDocument();
      expect(screen.getByText("Italy")).toBeInTheDocument();
      expect(screen.getByText("+2 more")).toBeInTheDocument();
    });

    test("handles custom limit", () => {
      const countries = ["DE", "FR", "IT", "ES"];
      const result = formatShipsToList(countries, 2);

      render(<div>{result}</div>);

      expect(screen.getByText("Germany")).toBeInTheDocument();
      expect(screen.getByText("France")).toBeInTheDocument();
      expect(screen.getByText("+2 more")).toBeInTheDocument();
      expect(screen.queryByText("Italy")).not.toBeInTheDocument();
    });

    test("handles empty array", () => {
      const result = formatShipsToList([]);
      expect(result).toBe("");
    });

    test("handles single country", () => {
      const result = formatShipsToList(["TR"]);

      render(<div>{result}</div>);

      expect(screen.getByText("Turkey")).toBeInTheDocument();
      expect(screen.queryByText(/more/)).not.toBeInTheDocument();
    });

    test("renders with flags by default", () => {
      const countries = ["TR", "DE"];
      const result = formatShipsToList(countries);

      render(<div>{result}</div>);

      // Should render flag images
      const flags = screen.getAllByRole("img");
      expect(flags.length).toBeGreaterThan(0);
    });

    test("handles UK country code normalization", () => {
      const countries = ["DE", "UK", "FR"];
      const result = formatShipsToList(countries);

      render(<div>{result}</div>);

      expect(screen.getByText("Germany")).toBeInTheDocument();
      expect(screen.getByText("United Kingdom")).toBeInTheDocument();
      expect(screen.getByText("France")).toBeInTheDocument();

      // Should render UK flag via GB normalization
      const flags = screen.getAllByRole("img");
      const ukFlag = flags.find((flag) =>
        flag.getAttribute("src")?.includes("gb.png"),
      );
      expect(ukFlag).toBeInTheDocument();
    });
  });

  describe("formatServiceRegions", () => {
    test("formats service regions array correctly", () => {
      const serviceRegions = ["TR", "RO"];
      const result = formatServiceRegions(serviceRegions);

      render(<div>{result}</div>);

      expect(screen.getByText("Turkey")).toBeInTheDocument();
      expect(screen.getByText("Romania")).toBeInTheDocument();
    });

    test("handles empty service regions", () => {
      const result = formatServiceRegions([]);
      expect(result).toBe("");
    });

    test("handles single service region", () => {
      const result = formatServiceRegions(["DE"]);

      render(<div>{result}</div>);

      expect(screen.getByText("Germany")).toBeInTheDocument();
    });

    test("shows all regions when mobile=false", () => {
      const serviceRegions = ["TR", "DE", "FR", "IT"];
      const result = formatServiceRegions(serviceRegions, true, false);

      render(<div>{result}</div>);

      expect(screen.getByText("Turkey")).toBeInTheDocument();
      expect(screen.getByText("Germany")).toBeInTheDocument();
      expect(screen.getByText("France")).toBeInTheDocument();
      expect(screen.getByText("Italy")).toBeInTheDocument();
    });

    test("limits regions when mobile=true", () => {
      const serviceRegions = ["TR", "DE", "FR", "IT"];
      const result = formatServiceRegions(serviceRegions, false, true);

      // When showFlags=false, function returns a string
      expect(result).toContain("Turkey");
      expect(result).toContain("Germany");
      expect(result).toContain("+2 more");
    });
  });
});

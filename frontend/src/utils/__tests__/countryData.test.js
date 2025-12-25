import {
  COUNTRIES,
  getCountryByCode,
  getAllCountryCodes,
  getCountriesArray,
} from "../countryData";

describe("countryData", () => {
  describe("COUNTRIES", () => {
    it("should contain all expected countries", () => {
      const expectedCodes = ["UK", "DE", "SR", "BA", "BG", "IT", "TR", "CY"];
      expectedCodes.forEach((code) => {
        expect(COUNTRIES[code]).toBeDefined();
      });
    });

    it("should have required properties for each country", () => {
      Object.values(COUNTRIES).forEach((country) => {
        expect(country.code).toBeDefined();
        expect(country.name).toBeDefined();
        expect(country.shortName).toBeDefined();
        expect(country.flag).toBeDefined();
        expect(country.gradient).toBeDefined();
        expect(country.tagline).toBeDefined();
        expect(country.description).toBeDefined();
      });
    });
  });

  describe("getCountryByCode", () => {
    it("should return country for valid code", () => {
      const uk = getCountryByCode("UK");
      expect(uk).not.toBeNull();
      expect(uk.name).toBe("United Kingdom");
    });

    it("should handle lowercase codes", () => {
      const de = getCountryByCode("de");
      expect(de).not.toBeNull();
      expect(de.name).toBe("Germany");
    });

    it("should return null for invalid code", () => {
      expect(getCountryByCode("XX")).toBeNull();
      expect(getCountryByCode(null)).toBeNull();
      expect(getCountryByCode(undefined)).toBeNull();
    });
  });

  describe("getAllCountryCodes", () => {
    it("should return array of country codes", () => {
      const codes = getAllCountryCodes();
      expect(Array.isArray(codes)).toBe(true);
      expect(codes.length).toBe(8);
      expect(codes).toContain("UK");
      expect(codes).toContain("DE");
    });
  });

  describe("getCountriesArray", () => {
    it("should return array of country objects", () => {
      const countries = getCountriesArray();
      expect(Array.isArray(countries)).toBe(true);
      expect(countries.length).toBe(8);
      expect(countries[0]).toHaveProperty("code");
      expect(countries[0]).toHaveProperty("name");
    });
  });
});

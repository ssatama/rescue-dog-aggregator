import fs from "fs";
import path from "path";
import {
  getCountryName,
  getFlagEmoji,
  normalizeCountryCode,
} from "../countryNames";

// Every two-letter code an organization config uses for country,
// service_regions or ships_to (#450: Serbia was stored as SR, Suriname).
function configCountryCodes(): Set<string> {
  const dir = path.join(__dirname, "../../../../configs/organizations");
  const codes = new Set<string>();
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".yaml"))) {
    const text = fs.readFileSync(path.join(dir, file), "utf8");
    const fields = text.matchAll(
      /^\s*(?:country|service_regions|ships_to):\s*(\[[^\]]*\]|"[A-Z]{2}")/gm,
    );
    for (const [, value] of fields) {
      for (const [, code] of value.matchAll(/"([A-Z]{2})"/g)) codes.add(code);
    }
  }
  return codes;
}

describe("countryNames", () => {
  it("resolves every country code used in organization configs", () => {
    const codes = configCountryCodes();
    expect(codes.size).toBeGreaterThan(10);
    for (const code of codes) {
      expect([code, getCountryName(code)]).not.toEqual([code, code]);
      expect(getFlagEmoji(code)).toMatch(/^\p{Regional_Indicator}{2}$/u);
    }
  });

  it("names the Balkan countries instead of echoing their codes", () => {
    expect(getCountryName("RS")).toBe("Serbia");
    expect(getCountryName("BA")).toBe("Bosnia and Herzegovina");
    expect(getCountryName("MK")).toBe("North Macedonia");
  });

  it("does not treat SR as Serbia", () => {
    expect(getCountryName("SR")).not.toBe("Serbia");
  });

  it("maps the UK alias to GB", () => {
    expect(normalizeCountryCode("uk")).toBe("GB");
    expect(getCountryName("UK")).toBe("United Kingdom");
    expect(getFlagEmoji("UK")).toBe("🇬🇧");
  });

  it("accepts full names in any case", () => {
    expect(normalizeCountryCode("serbia")).toBe("RS");
    expect(normalizeCountryCode("United Kingdom")).toBe("GB");
  });

  it("builds flags from the code", () => {
    expect(getFlagEmoji("RS")).toBe("🇷🇸");
    expect(getFlagEmoji("de")).toBe("🇩🇪");
  });

  it("handles empty and invalid input", () => {
    expect(getCountryName(null)).toBe("Unknown");
    expect(getCountryName("")).toBe("Unknown");
    expect(getCountryName("ZZ")).toBe("ZZ");
    expect(normalizeCountryCode(undefined)).toBe("");
    expect(getFlagEmoji(null)).toBe("");
    expect(getFlagEmoji("Atlantis")).toBe("");
  });
});

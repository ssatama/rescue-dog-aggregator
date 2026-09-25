import { catalogCountryValue, isAdoptableTo } from "../adoptability";

const dog = (ships_to?: string[]) => ({ organization: { id: 1, name: "Rescue", ships_to } });

describe("isAdoptableTo", () => {
  it("is true when the rescue adopts out to the country", () => {
    expect(isAdoptableTo(dog(["DE", "NL"]), "NL")).toBe(true);
  });

  it("treats the UK alias in ships_to as GB", () => {
    expect(isAdoptableTo(dog(["UK"]), "GB")).toBe(true);
  });

  it("is false when the rescue does not adopt out there", () => {
    expect(isAdoptableTo(dog(["DE"]), "GB")).toBe(false);
  });

  it("makes no claim without a country or without ships_to", () => {
    expect(isAdoptableTo(dog(["GB"]), null)).toBe(false);
    expect(isAdoptableTo(dog(undefined), "GB")).toBe(false);
    expect(isAdoptableTo({ organization: undefined }, "GB")).toBe(false);
  });
});

describe("catalogCountryValue", () => {
  it("finds the catalog's own spelling of the country", () => {
    expect(catalogCountryValue(["Any country", "DE", "UK"], "GB")).toBe("UK");
  });

  it("is null when no rescue adopts out there", () => {
    expect(catalogCountryValue(["Any country", "DE"], "US")).toBeNull();
    expect(catalogCountryValue(["DE"], null)).toBeNull();
  });
});

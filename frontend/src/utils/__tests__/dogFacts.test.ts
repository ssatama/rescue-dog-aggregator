import { adoptionDomain, dogLocation, isNeutered, isVaccinated, listedAgo, medicalNote } from "../dogFacts";
import type { Dog } from "../../types/dog";

const dog = (properties: Record<string, unknown>): Dog =>
  ({ id: 1, name: "Dolly", properties }) as Dog;

describe("dogLocation", () => {
  it.each([
    ["Evesham (Worcestershire) (Evesham)", "Evesham (Worcestershire)"],
    ["Merseyside (Liverpool) (Liverpool)", "Merseyside (Liverpool)"],
    ["Cumbria (  )", "Cumbria"],
    ["Harefield West London (Uxbridge)", "Harefield West London (Uxbridge)"],
    ["Ilfracombe", "Ilfracombe"],
  ])("cleans the Dogs Trust centre %p", (raw, expected) => {
    expect(dogLocation(dog({ location: raw }))).toBe(expected);
  });

  it("prefers the translated location, then the plain one", () => {
    expect(
      dogLocation(dog({ location: null, current_location: "Hannover", current_location_translated: "Hanover" })),
    ).toBe("Hanover");
    expect(dogLocation(dog({ current_location: "Romania" }))).toBe("Romania");
  });

  it("is null when no rescue says", () => {
    expect(dogLocation(dog({}))).toBeNull();
    expect(dogLocation({ id: 1, name: "Dolly" } as Dog)).toBeNull();
  });
});

describe("isNeutered", () => {
  it.each([
    [{ neutered_spayed: "Yes" }, true],
    [{ neutered_spayed: "Scheduled" }, false],
    [{ spayed_neutered: "true" }, true],
    [{ spayed_neutered: true }, true],
    [{ medical_status: "neutered, vaccinated and chipped" }, true],
    [{ medical_status: "vaccinated and chipped" }, false],
    [{ medical_issues: "I am spayed and ready to find my forever home." }, true],
    [{ medical_issues: "I have been neutered and am ready for my forever home." }, true],
    [{ medical_issues: "I will be spayed before finding my forever home." }, false],
    [{}, false],
  ])("%p → %p", (properties, expected) => {
    expect(isNeutered(dog(properties))).toBe(expected);
  });
});

describe("isVaccinated", () => {
  it.each([
    [{ medical_status: "vaccinated and chipped" }, true],
    [{ medical_issues: "I'm fully vaccinated and will be spayed before adoption." }, true],
    [{ medical_issues: "I've started my vaccinations and will be spayed before adoption." }, false],
    [{}, false],
  ])("%p → %p", (properties, expected) => {
    expect(isVaccinated(dog(properties))).toBe(expected);
  });
});

describe("medicalNote", () => {
  it("keeps a real Many Tears medical note", () => {
    expect(medicalNote(dog({ medical_issues: "I have Grade 3 bilateral luxating patellas." }))).toBe(
      "I have Grade 3 bilateral luxating patellas.",
    );
  });

  it.each([
    "I will be spayed before going to my forever home!",
    "Please read my information below.",
    "I've started my vaccinations and will be neutered before adoption.",
  ])("drops routine text %p", (text) => {
    expect(medicalNote(dog({ medical_issues: text }))).toBeNull();
  });

  it("turns the Dogs Trust flag into a short note", () => {
    expect(medicalNote(dog({ medical_care: "Medical care" }))).toBe("Has ongoing medical care");
  });

  it("is null without medical data", () => {
    expect(medicalNote(dog({}))).toBeNull();
  });
});

describe("listedAgo", () => {
  const now = new Date("2026-09-24T12:00:00Z");
  it.each([
    ["2026-09-24T08:00:00Z", "listed today"],
    ["2026-09-23T08:00:00Z", "listed 1 day ago"],
    ["2026-09-19T12:00:00Z", "listed 5 days ago"],
    ["2026-09-03T12:00:00Z", "listed 3 weeks ago"],
    ["2026-06-01T12:00:00Z", "listed 3 months ago"],
    ["2025-01-01T12:00:00Z", "listed over a year ago"],
  ])("%p → %p", (createdAt, expected) => {
    expect(listedAgo(createdAt, now)).toBe(expected);
  });

  it("is null without a usable date", () => {
    expect(listedAgo(undefined, now)).toBeNull();
    expect(listedAgo("not a date", now)).toBeNull();
  });
});

describe("adoptionDomain", () => {
  it("drops www and the path", () => {
    expect(adoptionDomain("https://www.dogstrust.org.uk/rehoming/dogs/1")).toBe("dogstrust.org.uk");
  });
  it("is null for a missing or broken URL", () => {
    expect(adoptionDomain(undefined)).toBeNull();
    expect(adoptionDomain("not a url")).toBeNull();
  });
});

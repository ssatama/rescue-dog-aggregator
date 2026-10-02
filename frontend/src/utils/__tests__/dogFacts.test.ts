import { adoptionDomain, companionAnswer, dogLocation, pickSimilarDogs, similarDogsQuery, isNeutered, isVaccinated, listedAgo, medicalNote } from "../dogFacts";
import type { Dog } from "../../types/dog";

const dog = (properties: Record<string, unknown>): Dog =>
  ({ id: 1, name: "Dolly", properties }) as Dog;

describe("dogLocation", () => {
  it("uses the scraper's display location", () => {
    expect(dogLocation(dog({ display_location: "Baeza, Spain", Aufenthaltsort: "Tierheim Baeza" }))).toBe("Baeza, Spain");
  });

  it("ignores the raw per-rescue fields", () => {
    expect(dogLocation(dog({ location: "Evesham (Worcestershire) (Evesham)", current_location: "Hannover" }))).toBeNull();
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

  it.each([
    "I have a Grade 2 heart murmur & I will be spayed.",
    "I have a fused hind leg, please read more info below.",
    "I am being treated for sore ears and will be neutered before adoption.",
    "I’m fully vaccinated and neutered. I have received treatment for an ear infection.",
  ])("keeps a real note that also mentions routine care %p", (text) => {
    expect(medicalNote(dog({ medical_issues: text }))).toBe(text);
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

describe("companionAnswer", () => {
  it("trusts the AI profile over a scraped property", () => {
    const d = { properties: { good_with_dogs: true }, dog_profiler_data: { good_with_dogs: "no" } } as unknown as Dog;
    expect(companionAnswer(d, "good_with_dogs")).toBe("no");
  });

  it("falls back to the scraped property when the profile has no value", () => {
    expect(companionAnswer(dog({ good_with_cats: "true" }), "good_with_cats")).toBe("yes");
  });

  it("keeps a rescue's qualifier in plain words", () => {
    expect(companionAnswer(dog({ good_with_children: "older_children" }), "good_with_children")).toBe("older children");
  });

  it("treats a low-confidence AI answer as not assessed (#517)", () => {
    const d = {
      properties: {},
      dog_profiler_data: { good_with_cats: "no", confidence_scores: { good_with_cats: 0.5 } },
    } as unknown as Dog;
    expect(companionAnswer(d, "good_with_cats")).toBeNull();
  });

  it("keeps an AI answer scored above 0.5", () => {
    const d = {
      dog_profiler_data: { good_with_cats: "no", confidence_scores: { good_with_cats: 0.6 } },
    } as unknown as Dog;
    expect(companionAnswer(d, "good_with_cats")).toBe("no");
  });

  it("lets the rescue's answer fill in behind an AI unknown (#629)", () => {
    const d = { properties: { good_with_dogs: true }, dog_profiler_data: { good_with_dogs: "unknown" } } as unknown as Dog;
    expect(companionAnswer(d, "good_with_dogs")).toBe("yes");
  });

  it("lets the rescue's answer stand in for a low-confidence AI answer (#629, #517)", () => {
    const d = {
      properties: { good_with_cats: true },
      dog_profiler_data: { good_with_cats: "no", confidence_scores: { good_with_cats: 0.4 } },
    } as unknown as Dog;
    expect(companionAnswer(d, "good_with_cats")).toBe("yes");
  });

  it("treats exactly 0.5 as a guess the rescue's answer replaces", () => {
    const d = {
      properties: { good_with_dogs: true },
      dog_profiler_data: { good_with_dogs: "no", confidence_scores: { good_with_dogs: 0.5 } },
    } as unknown as Dog;
    expect(companionAnswer(d, "good_with_dogs")).toBe("yes");
  });

  it("shows the rescue's no behind a low-confidence AI yes", () => {
    const d = {
      properties: { good_with_cats: false },
      dog_profiler_data: { good_with_cats: "yes", confidence_scores: { good_with_cats: 0.3 } },
    } as unknown as Dog;
    expect(companionAnswer(d, "good_with_cats")).toBe("no");
  });

  it("is null when neither source assessed it", () => {
    expect(companionAnswer(dog({ good_with_dogs: "Unknown" }), "good_with_dogs")).toBeNull();
  });
});

describe("similarDogsQuery", () => {
  it("matches size and age group", () => {
    expect(similarDogsQuery({ standardized_size: "Large", age_min_months: 40 } as Dog)).toEqual({
      standardized_size: "Large",
      age_category: "Adult",
      age_known: true,
    });
  });

  it("uses whichever of the two is known", () => {
    expect(similarDogsQuery({ age_min_months: 6 } as Dog)).toEqual({ age_category: "Puppy", age_known: true });
    expect(similarDogsQuery({ standardized_size: "Small" } as Dog)).toEqual({ standardized_size: "Small" });
  });

  it("asks on the catalog's scale: a Tiny dog's similar dogs are Small ones, which include Tiny (#550)", () => {
    expect(similarDogsQuery({ standardized_size: "Tiny" } as Dog)).toEqual({ standardized_size: "Small" });
    expect(similarDogsQuery({ standardized_size: "XLarge" } as Dog)).toEqual({ standardized_size: "XLarge" });
  });

  it("is null when neither is known, rather than matching every dog", () => {
    expect(similarDogsQuery({ standardized_size: "Unknown" } as Dog)).toBeNull();
  });
});

describe("pickSimilarDogs", () => {
  const cand = (id: number, org: number) => ({ id, name: `Dog ${id}`, organization_id: org }) as Dog;
  // id 20 starts the rotation at the top of a 5- or 4-dog list
  const me = cand(20, 1);

  it("takes one dog per rescue, other rescues first", () => {
    const picked = pickSimilarDogs(me, [cand(10, 1), cand(11, 1), cand(12, 2), cand(13, 2), cand(14, 3)]);
    expect(picked.map((d) => d.id)).toEqual([12, 14, 10]);
  });

  it("fills up from the same rescues when few others match", () => {
    const picked = pickSimilarDogs(me, [cand(20, 1), cand(10, 1), cand(11, 1), cand(12, 1)]);
    expect(picked.map((d) => d.id)).toEqual([10, 11, 12]);
  });

  it("starts the list at a point set by the dog's id, so neighbours differ", () => {
    const pool = [10, 11, 12, 13, 14].map((id) => cand(id, id));
    expect(pickSimilarDogs(cand(1, 99), pool).map((d) => d.id)).toEqual([11, 12, 13]);
    expect(pickSimilarDogs(cand(3, 99), pool).map((d) => d.id)).toEqual([13, 14, 10]);
    // Same dog, same three: ISR pages stay stable
    expect(pickSimilarDogs(cand(3, 99), pool)).toEqual(pickSimilarDogs(cand(3, 99), pool));
  });

  it("returns nothing for no candidates", () => {
    expect(pickSimilarDogs(me, [])).toEqual([]);
  });
});

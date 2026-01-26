/**
 * Tests for FAQ Schema.org utilities
 */

import { generateFAQSchema } from "../../utils/faqSchema";

describe("generateFAQSchema", () => {
  test("returns null for dog without name", () => {
    const dog = {
      name: "",
      dog_profiler_data: {
        energy_level: "medium" as const,
      },
    };

    expect(generateFAQSchema(dog)).toBeNull();
  });

  test("returns null for dog without profiler data", () => {
    const dog = {
      name: "Max",
    };

    expect(generateFAQSchema(dog)).toBeNull();
  });

  test("returns null for dog with empty profiler data", () => {
    const dog = {
      name: "Max",
      dog_profiler_data: {},
    };

    expect(generateFAQSchema(dog)).toBeNull();
  });

  test("generates valid FAQPage schema structure", () => {
    const dog = {
      name: "Luna",
      dog_profiler_data: {
        energy_level: "medium" as const,
      },
    };

    const schema = generateFAQSchema(dog);

    expect(schema).not.toBeNull();
    expect(schema?.["@context"]).toBe("https://schema.org");
    expect(schema?.["@type"]).toBe("FAQPage");
    expect(schema?.mainEntity).toBeDefined();
    expect(Array.isArray(schema?.mainEntity)).toBe(true);
  });

  test("generates FAQ for each valid profiler field", () => {
    const dog = {
      name: "Buddy",
      dog_profiler_data: {
        good_with_children: "yes" as const,
        good_with_dogs: "maybe" as const,
        good_with_cats: "no" as const,
        energy_level: "high" as const,
        experience_level: "some_experience" as const,
        home_type: "house_preferred" as const,
      },
    };

    const schema = generateFAQSchema(dog);

    expect(schema?.mainEntity.length).toBe(6);
  });

  test("excludes unknown values from compatibility FAQs", () => {
    const dog = {
      name: "Rex",
      dog_profiler_data: {
        good_with_children: "unknown" as const,
        good_with_dogs: "unknown" as const,
        good_with_cats: "unknown" as const,
        energy_level: "low" as const,
      },
    };

    const schema = generateFAQSchema(dog);

    expect(schema?.mainEntity.length).toBe(1);
    expect(schema?.mainEntity[0].name).toBe("What is Rex's energy level?");
  });

  test("formats compatibility answers correctly", () => {
    const dog = {
      name: "Bella",
      dog_profiler_data: {
        good_with_children: "yes" as const,
      },
    };

    const schema = generateFAQSchema(dog);
    const faq = schema?.mainEntity[0];

    expect(faq?.["@type"]).toBe("Question");
    expect(faq?.name).toBe("Is Bella good with children?");
    expect(faq?.acceptedAnswer["@type"]).toBe("Answer");
    expect(faq?.acceptedAnswer.text).toContain("Bella");
    expect(faq?.acceptedAnswer.text).toContain("great with children");
  });

  test("formats energy level answers correctly", () => {
    const energyLevels = {
      low: "calm",
      medium: "medium energy",
      high: "high energy",
      very_high: "very high energy",
    } as const;

    Object.entries(energyLevels).forEach(([level, expectedPhrase]) => {
      const dog = {
        name: "Test",
        dog_profiler_data: {
          energy_level: level as "low" | "medium" | "high" | "very_high",
        },
      };

      const schema = generateFAQSchema(dog);
      const answer = schema?.mainEntity[0].acceptedAnswer.text.toLowerCase();

      expect(answer).toContain(expectedPhrase);
    });
  });

  test("formats experience level answers correctly", () => {
    const dog = {
      name: "Charlie",
      dog_profiler_data: {
        experience_level: "first_time_ok" as const,
      },
    };

    const schema = generateFAQSchema(dog);
    const answer = schema?.mainEntity[0].acceptedAnswer.text;

    expect(answer).toContain("suitable for first-time");
  });

  test("formats home type answers correctly", () => {
    const homeTypes = {
      apartment_ok: "apartment",
      house_preferred: "prefer",
      house_required: "needs a house",
    } as const;

    Object.entries(homeTypes).forEach(([type, expectedPhrase]) => {
      const dog = {
        name: "Test",
        dog_profiler_data: {
          home_type: type as "apartment_ok" | "house_preferred" | "house_required",
        },
      };

      const schema = generateFAQSchema(dog);
      const answer = schema?.mainEntity[0].acceptedAnswer.text.toLowerCase();

      expect(answer).toContain(expectedPhrase);
    });
  });
});

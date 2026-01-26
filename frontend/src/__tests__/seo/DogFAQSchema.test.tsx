/**
 * Tests for DogFAQSchema component
 */

import React from "react";
import { render } from "@testing-library/react";
import DogFAQSchema from "../../components/seo/DogFAQSchema";

describe("DogFAQSchema Component", () => {
  const mockDogWithProfilerData = {
    name: "Luna",
    dog_profiler_data: {
      good_with_children: "yes" as const,
      good_with_dogs: "maybe" as const,
      good_with_cats: "no" as const,
      energy_level: "medium" as const,
      experience_level: "first_time_ok" as const,
      home_type: "apartment_ok" as const,
    },
  };

  test("renders FAQPage JSON-LD script tag", () => {
    const { container } = render(
      <DogFAQSchema dog={mockDogWithProfilerData} />
    );
    const script = container.querySelector(
      'script[type="application/ld+json"]'
    );

    expect(script).toBeInTheDocument();

    const schema = JSON.parse(script?.innerHTML || "{}");
    expect(schema["@context"]).toBe("https://schema.org");
    expect(schema["@type"]).toBe("FAQPage");
  });

  test("generates FAQ for good_with_children", () => {
    const { container } = render(
      <DogFAQSchema dog={mockDogWithProfilerData} />
    );
    const script = container.querySelector(
      'script[type="application/ld+json"]'
    );
    const schema = JSON.parse(script?.innerHTML || "{}");

    const childrenFaq = schema.mainEntity.find(
      (q: { name: string }) => q.name === "Is Luna good with children?"
    );

    expect(childrenFaq).toBeDefined();
    expect(childrenFaq["@type"]).toBe("Question");
    expect(childrenFaq.acceptedAnswer["@type"]).toBe("Answer");
    expect(childrenFaq.acceptedAnswer.text).toContain("great with children");
  });

  test("generates FAQ for good_with_dogs with maybe value", () => {
    const { container } = render(
      <DogFAQSchema dog={mockDogWithProfilerData} />
    );
    const script = container.querySelector(
      'script[type="application/ld+json"]'
    );
    const schema = JSON.parse(script?.innerHTML || "{}");

    const dogsFaq = schema.mainEntity.find(
      (q: { name: string }) =>
        q.name === "Does Luna get along with other dogs?"
    );

    expect(dogsFaq).toBeDefined();
    expect(dogsFaq.acceptedAnswer.text).toContain("introductions");
  });

  test("generates FAQ for good_with_cats with no value", () => {
    const { container } = render(
      <DogFAQSchema dog={mockDogWithProfilerData} />
    );
    const script = container.querySelector(
      'script[type="application/ld+json"]'
    );
    const schema = JSON.parse(script?.innerHTML || "{}");

    const catsFaq = schema.mainEntity.find(
      (q: { name: string }) => q.name === "Can Luna live with cats?"
    );

    expect(catsFaq).toBeDefined();
    expect(catsFaq.acceptedAnswer.text).toContain("without cats");
  });

  test("generates FAQ for energy_level", () => {
    const { container } = render(
      <DogFAQSchema dog={mockDogWithProfilerData} />
    );
    const script = container.querySelector(
      'script[type="application/ld+json"]'
    );
    const schema = JSON.parse(script?.innerHTML || "{}");

    const energyFaq = schema.mainEntity.find(
      (q: { name: string }) => q.name === "What is Luna's energy level?"
    );

    expect(energyFaq).toBeDefined();
    expect(energyFaq.acceptedAnswer.text).toContain("medium energy");
  });

  test("generates FAQ for experience_level", () => {
    const { container } = render(
      <DogFAQSchema dog={mockDogWithProfilerData} />
    );
    const script = container.querySelector(
      'script[type="application/ld+json"]'
    );
    const schema = JSON.parse(script?.innerHTML || "{}");

    const experienceFaq = schema.mainEntity.find(
      (q: { name: string }) =>
        q.name === "Is Luna suitable for first-time dog owners?"
    );

    expect(experienceFaq).toBeDefined();
    expect(experienceFaq.acceptedAnswer.text).toContain("first-time");
  });

  test("generates FAQ for home_type", () => {
    const { container } = render(
      <DogFAQSchema dog={mockDogWithProfilerData} />
    );
    const script = container.querySelector(
      'script[type="application/ld+json"]'
    );
    const schema = JSON.parse(script?.innerHTML || "{}");

    const homeFaq = schema.mainEntity.find(
      (q: { name: string }) => q.name === "What type of home does Luna need?"
    );

    expect(homeFaq).toBeDefined();
    expect(homeFaq.acceptedAnswer.text).toContain("apartment");
  });

  test("returns null for dog without profiler data", () => {
    const dogWithoutProfiler = {
      name: "Max",
    };

    const { container } = render(<DogFAQSchema dog={dogWithoutProfiler} />);
    expect(container.firstChild).toBeNull();
  });

  test("returns null for dog with empty profiler data", () => {
    const dogWithEmptyProfiler = {
      name: "Max",
      dog_profiler_data: {},
    };

    const { container } = render(<DogFAQSchema dog={dogWithEmptyProfiler} />);
    expect(container.firstChild).toBeNull();
  });

  test("skips unknown values in compatibility fields", () => {
    const dogWithUnknown = {
      name: "Rex",
      dog_profiler_data: {
        good_with_children: "unknown" as const,
        energy_level: "high" as const,
      },
    };

    const { container } = render(<DogFAQSchema dog={dogWithUnknown} />);
    const script = container.querySelector(
      'script[type="application/ld+json"]'
    );
    const schema = JSON.parse(script?.innerHTML || "{}");

    const childrenFaq = schema.mainEntity.find(
      (q: { name: string }) => q.name === "Is Rex good with children?"
    );

    expect(childrenFaq).toBeUndefined();

    const energyFaq = schema.mainEntity.find(
      (q: { name: string }) => q.name === "What is Rex's energy level?"
    );

    expect(energyFaq).toBeDefined();
  });

  test("handles all energy levels", () => {
    const energyLevels = ["low", "medium", "high", "very_high"] as const;
    const expectedPhrases = ["calm", "medium energy", "high energy", "very high energy"];

    energyLevels.forEach((level, index) => {
      const dog = {
        name: "Test",
        dog_profiler_data: {
          energy_level: level,
        },
      };

      const { container } = render(<DogFAQSchema dog={dog} />);
      const script = container.querySelector(
        'script[type="application/ld+json"]'
      );
      const schema = JSON.parse(script?.innerHTML || "{}");
      const energyFaq = schema.mainEntity[0];

      expect(energyFaq.acceptedAnswer.text.toLowerCase()).toContain(
        expectedPhrases[index]
      );
    });
  });

  test("handles all experience levels", () => {
    const experienceLevels = [
      "first_time_ok",
      "some_experience",
      "experienced_only",
    ] as const;

    experienceLevels.forEach((level) => {
      const dog = {
        name: "Test",
        dog_profiler_data: {
          experience_level: level,
        },
      };

      const { container } = render(<DogFAQSchema dog={dog} />);
      const script = container.querySelector(
        'script[type="application/ld+json"]'
      );
      const schema = JSON.parse(script?.innerHTML || "{}");

      expect(schema.mainEntity.length).toBe(1);
      expect(schema.mainEntity[0].acceptedAnswer.text.length).toBeGreaterThan(
        0
      );
    });
  });

  test("handles all home types", () => {
    const homeTypes = [
      "apartment_ok",
      "house_preferred",
      "house_required",
    ] as const;

    homeTypes.forEach((type) => {
      const dog = {
        name: "Test",
        dog_profiler_data: {
          home_type: type,
        },
      };

      const { container } = render(<DogFAQSchema dog={dog} />);
      const script = container.querySelector(
        'script[type="application/ld+json"]'
      );
      const schema = JSON.parse(script?.innerHTML || "{}");

      expect(schema.mainEntity.length).toBe(1);
      expect(schema.mainEntity[0].acceptedAnswer.text.length).toBeGreaterThan(
        0
      );
    });
  });
});

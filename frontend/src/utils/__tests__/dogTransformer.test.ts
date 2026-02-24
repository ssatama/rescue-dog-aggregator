import { transformApiDogToDog, transformApiDogsToDogs } from "../dogTransformer";
import type { ApiDog, ApiDogProfilerData } from "../../types/apiDog";

const makeApiDog = (overrides: Partial<ApiDog> = {}): ApiDog =>
  ({
    id: 1,
    name: "Buddy",
    breed: "Golden Retriever",
    primary_image_url: "https://example.com/buddy.jpg",
    ...overrides,
  }) as ApiDog;

describe("transformApiDogToDog", () => {
  describe("organization transformation", () => {
    it("preserves organization object with id", () => {
      const apiDog = makeApiDog({
        organization: { id: 42, name: "Happy Paws", slug: "happy-paws" },
      });

      const result = transformApiDogToDog(apiDog);

      expect(result.organization).toEqual({
        id: 42,
        name: "Happy Paws",
        slug: "happy-paws",
      });
    });

    it("preserves organization object without id (id stays undefined)", () => {
      const apiDog = makeApiDog({
        organization: { name: "Unnamed Org" },
      });

      const result = transformApiDogToDog(apiDog);

      expect(result.organization).toEqual({ name: "Unnamed Org" });
      expect(result.organization?.id).toBeUndefined();
    });

    it("converts string organization to object with name only", () => {
      const apiDog = makeApiDog({
        organization: "Street Dogs Rescue" as unknown as ApiDog["organization"],
      });

      const result = transformApiDogToDog(apiDog);

      expect(result.organization).toEqual({ name: "Street Dogs Rescue" });
      expect(result.organization?.id).toBeUndefined();
    });

    it("returns undefined when organization is undefined", () => {
      const apiDog = makeApiDog({ organization: undefined });

      const result = transformApiDogToDog(apiDog);

      expect(result.organization).toBeUndefined();
    });
  });

  describe("image normalization", () => {
    it("normalizes primary_image_url from multiple fields", () => {
      const apiDog = makeApiDog({
        primary_image_url: undefined,
        image: "https://example.com/image.jpg",
        main_image: undefined,
      });

      const result = transformApiDogToDog(apiDog);

      expect(result.primary_image_url).toBe("https://example.com/image.jpg");
      expect(result.main_image).toBe("https://example.com/image.jpg");
    });

    it("prefers primary_image_url over other image fields", () => {
      const apiDog = makeApiDog({
        primary_image_url: "https://example.com/primary.jpg",
        image: "https://example.com/fallback.jpg",
        main_image: "https://example.com/main.jpg",
      });

      const result = transformApiDogToDog(apiDog);

      expect(result.primary_image_url).toBe("https://example.com/primary.jpg");
      expect(result.main_image).toBe("https://example.com/main.jpg");
    });
  });

  describe("profiler data transformation", () => {
    it("transforms camelCase profiler data to snake_case", () => {
      const apiDog = makeApiDog({
        dogProfilerData: {
          name: "Buddy",
          tagline: "A good boy",
          personalityTraits: ["Playful", "Friendly"],
          favoriteActivities: ["Fetch"],
          uniqueQuirk: "Loves belly rubs",
          energyLevel: "high",
        },
      });

      const result = transformApiDogToDog(apiDog);

      expect(result.dog_profiler_data?.tagline).toBe("A good boy");
      expect(result.dog_profiler_data?.personality_traits).toEqual([
        "Playful",
        "Friendly",
      ]);
      expect(result.dog_profiler_data?.unique_quirk).toBe("Loves belly rubs");
      expect(result.personality_traits).toEqual(["Playful", "Friendly"]);
    });

    it("falls back to empty array when no personality traits", () => {
      const apiDog = makeApiDog({});

      const result = transformApiDogToDog(apiDog);

      expect(result.personality_traits).toEqual([]);
    });

    it("transforms snake_case profiler data from animals API", () => {
      const apiDog = makeApiDog({
        dog_profiler_data: {
          name: "Rex",
          tagline: "Loyal companion",
          personality_traits: ["Loyal", "Calm"],
          favorite_activities: ["Walks", "Napping"],
          unique_quirk: "Snores loudly",
          energy_level: "medium",
          trainability: "easy",
          experience_level: "first_time_ok",
          good_with_dogs: "yes",
          good_with_cats: "maybe",
          good_with_children: "yes",
          quality_score: 85,
        } as unknown as ApiDogProfilerData,
      });

      const result = transformApiDogToDog(apiDog);

      expect(result.dog_profiler_data?.personality_traits).toEqual([
        "Loyal",
        "Calm",
      ]);
      expect(result.dog_profiler_data?.favorite_activities).toEqual([
        "Walks",
        "Napping",
      ]);
      expect(result.dog_profiler_data?.unique_quirk).toBe("Snores loudly");
      expect(result.dog_profiler_data?.energy_level).toBe("medium");
      expect(result.dog_profiler_data?.trainability).toBe("easy");
      expect(result.dog_profiler_data?.experience_level).toBe("first_time_ok");
      expect(result.dog_profiler_data?.good_with_dogs).toBe("yes");
      expect(result.dog_profiler_data?.good_with_cats).toBe("maybe");
      expect(result.dog_profiler_data?.good_with_children).toBe("yes");
      expect(result.dog_profiler_data?.quality_score).toBe(85);
      expect(result.personality_traits).toEqual(["Loyal", "Calm"]);
    });

    it("handles mixed camelCase and snake_case profiler keys", () => {
      const apiDog = makeApiDog({
        dogProfilerData: {
          name: "Mixed",
          personalityTraits: ["Happy"],
          favorite_activities: ["Swimming"],
          energyLevel: "high",
          good_with_dogs: "yes",
        } as unknown as ApiDogProfilerData,
      });

      const result = transformApiDogToDog(apiDog);

      expect(result.dog_profiler_data?.personality_traits).toEqual(["Happy"]);
      expect(result.dog_profiler_data?.favorite_activities).toEqual([
        "Swimming",
      ]);
      expect(result.dog_profiler_data?.energy_level).toBe("high");
      expect(result.dog_profiler_data?.good_with_dogs).toBe("yes");
    });

    it("prefers dogProfilerData over dog_profiler_data when both exist", () => {
      const apiDog = makeApiDog({
        dogProfilerData: {
          name: "CamelCase",
          personalityTraits: ["From camelCase"],
        },
        dog_profiler_data: {
          name: "snake_case",
          personality_traits: ["From snake_case"],
        } as unknown as ApiDogProfilerData,
      });

      const result = transformApiDogToDog(apiDog);

      expect(result.dog_profiler_data?.name).toBe("CamelCase");
      expect(result.dog_profiler_data?.personality_traits).toEqual([
        "From camelCase",
      ]);
    });
  });
});

describe("transformApiDogsToDogs", () => {
  it("transforms an array of API dogs", () => {
    const apiDogs = [
      makeApiDog({ id: 1, name: "Buddy" }),
      makeApiDog({ id: 2, name: "Luna" }),
    ];

    const result = transformApiDogsToDogs(apiDogs);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Buddy");
    expect(result[1].name).toBe("Luna");
  });

  it("returns empty array for empty input", () => {
    expect(transformApiDogsToDogs([])).toEqual([]);
  });
});

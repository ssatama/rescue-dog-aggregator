import { transformApiDogToDog, transformApiDogsToDogs } from "../dogTransformer";
import type { ApiDog } from "../../types/apiDog";

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

import { ZodError } from "zod";
import {
  ApiDogSchema,
  ApiDogProfilerDataSchema,
  BreedStatsSchema,
  SwipeResponseSchema,
} from "../animals";
import { FilterCountsResponseSchema } from "../common";

describe("ApiDogSchema", () => {
  const validDog = {
    id: 1,
    name: "Buddy",
    breed: "Labrador",
    slug: "buddy-123",
    age: "3 years",
    sex: "Male",
    size: "Large",
    status: "available",
    primary_image_url: "https://example.com/buddy.jpg",
    organization: { name: "Happy Paws", country: "Finland" },
  };

  it("parses a valid dog with all fields", () => {
    const result = ApiDogSchema.parse(validDog);
    expect(result.id).toBe(1);
    expect(result.name).toBe("Buddy");
    expect(result.breed).toBe("Labrador");
  });

  it("parses a minimal dog with only required fields", () => {
    const result = ApiDogSchema.parse({ id: 42, name: "Rex" });
    expect(result.id).toBe(42);
    expect(result.name).toBe("Rex");
    expect(result.breed).toBeUndefined();
  });

  it("accepts string IDs", () => {
    const result = ApiDogSchema.parse({ id: "abc-123", name: "Rex" });
    expect(result.id).toBe("abc-123");
  });

  it("rejects missing id", () => {
    expect(() => ApiDogSchema.parse({ name: "Rex" })).toThrow(ZodError);
  });

  it("rejects missing name", () => {
    expect(() => ApiDogSchema.parse({ id: 1 })).toThrow(ZodError);
  });

  it("rejects wrong type for id", () => {
    expect(() => ApiDogSchema.parse({ id: true, name: "Rex" })).toThrow(
      ZodError,
    );
  });

  it("rejects wrong type for name", () => {
    expect(() => ApiDogSchema.parse({ id: 1, name: 123 })).toThrow(ZodError);
  });

  it("passes through extra fields not in schema", () => {
    const input = { id: 1, name: "Rex", custom_field: "extra_data" };
    const result = ApiDogSchema.parse(input);
    expect((result as Record<string, unknown>).custom_field).toBe("extra_data");
  });

  it("accepts organization as string", () => {
    const result = ApiDogSchema.parse({
      id: 1,
      name: "Rex",
      organization: "Shelter Name",
    });
    expect(result.organization).toBe("Shelter Name");
  });

  it("accepts organization as object", () => {
    const result = ApiDogSchema.parse({
      id: 1,
      name: "Rex",
      organization: { name: "Shelter", country: "US" },
    });
    expect(result.organization).toEqual(
      expect.objectContaining({ name: "Shelter", country: "US" }),
    );
  });

  it("accepts both profiler data formats", () => {
    const withCamelCase = ApiDogSchema.parse({
      id: 1,
      name: "Rex",
      dogProfilerData: { energyLevel: "high", trainability: "easy" },
    });
    expect(withCamelCase.dogProfilerData?.energyLevel).toBe("high");

    const withSnakeCase = ApiDogSchema.parse({
      id: 1,
      name: "Rex",
      dog_profiler_data: { energyLevel: "medium" },
    });
    expect(withSnakeCase.dog_profiler_data?.energyLevel).toBe("medium");
  });
});

describe("ApiDogProfilerDataSchema", () => {
  it("parses valid profiler data", () => {
    const result = ApiDogProfilerDataSchema.parse({
      energyLevel: "high",
      trainability: "moderate",
      goodWithDogs: "yes",
      goodWithCats: "maybe",
      qualityScore: 0.85,
    });
    expect(result.energyLevel).toBe("high");
    expect(result.qualityScore).toBe(0.85);
  });

  it("rejects invalid enum values", () => {
    expect(() =>
      ApiDogProfilerDataSchema.parse({ energyLevel: "super_high" }),
    ).toThrow(ZodError);
  });

  it("accepts empty object", () => {
    const result = ApiDogProfilerDataSchema.parse({});
    expect(result).toBeDefined();
  });
});

describe("BreedStatsSchema", () => {
  it("parses valid breed stats", () => {
    const result = BreedStatsSchema.parse({
      total_dogs: 1500,
      total_breeds: 120,
      breed_groups: [
        { name: "Sporting", count: 200 },
        { name: "Hound", count: 150 },
      ],
      qualifying_breeds: [
        {
          primary_breed: "Labrador",
          breed_slug: "labrador",
          breed_group: "Sporting",
          count: 50,
        },
      ],
    });
    expect(result.total_dogs).toBe(1500);
    expect(result.breed_groups).toHaveLength(2);
    expect(result.qualifying_breeds?.[0].breed_slug).toBe("labrador");
  });

  it("rejects missing total_dogs", () => {
    expect(() =>
      BreedStatsSchema.parse({ breed_groups: [] }),
    ).toThrow(ZodError);
  });
});

describe("SwipeResponseSchema", () => {
  it("parses valid swipe response", () => {
    const result = SwipeResponseSchema.parse({
      dogs: [
        { id: 1, name: "Rex", slug: "rex-1" },
        { id: 2, name: "Buddy", slug: "buddy-2" },
      ],
      hasMore: true,
      nextOffset: 20,
      total: 100,
    });
    expect(result.dogs).toHaveLength(2);
    expect(result.dogs[0].name).toBe("Rex");
  });

  it("rejects non-array dogs field", () => {
    expect(() =>
      SwipeResponseSchema.parse({ dogs: "not-an-array" }),
    ).toThrow(ZodError);
  });
});

describe("FilterCountsResponseSchema", () => {
  it("parses valid filter counts", () => {
    const result = FilterCountsResponseSchema.parse({
      sex: [
        { value: "Male", count: 500 },
        { value: "Female", count: 480 },
      ],
      standardized_size: [
        { value: "Large", count: 300, label: "Large" },
      ],
    });
    expect(result.sex).toHaveLength(2);
    expect(result.standardized_size?.[0].count).toBe(300);
  });

  it("accepts empty object", () => {
    const result = FilterCountsResponseSchema.parse({});
    expect(result).toBeDefined();
  });
});

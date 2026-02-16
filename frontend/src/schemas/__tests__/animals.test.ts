import { ZodError } from "zod";
import {
  ApiDogSchema,
  ApiDogProfilerDataSchema,
  BreedStatsSchema,
  BreedWithImagesSchema,
  SwipeResponseSchema,
} from "../animals";
import { FilterCountsResponseSchema } from "../common";
import { stripNulls } from "../../utils/api";

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
      dogProfilerData: { trainability: "easy" },
    });
    expect(withCamelCase.dogProfilerData?.trainability).toBe("easy");

    const withSnakeCase = ApiDogSchema.parse({
      id: 1,
      name: "Rex",
      dog_profiler_data: { confidence: "shy" },
    });
    expect(withSnakeCase.dog_profiler_data?.confidence).toBe("shy");
  });

  it("handles null values after stripNulls preprocessing", () => {
    const apiResponse = {
      id: 1,
      name: "Rex",
      secondary_breed: null,
      breed: null,
      primary_breed: null,
      age: null,
      description: null,
      primary_image_url: null,
      dog_profiler_data: null,
    };
    const result = ApiDogSchema.parse(stripNulls(apiResponse));
    expect(result.secondary_breed).toBeUndefined();
    expect(result.breed).toBeUndefined();
    expect(result.dog_profiler_data).toBeUndefined();
  });

  it("handles realistic API response with null secondary_breed and profiler data", () => {
    const apiResponse = {
      id: 7344,
      name: "Hari",
      breed: "Labrador Retriever",
      primary_breed: "Labrador Retriever",
      standardized_breed: "Labrador Retriever",
      secondary_breed: null,
      mixed_breed: false,
      slug: "hari-labrador-retriever-7344",
      status: "available",
      dog_profiler_data: {
        confidence: "very_confident",
        sociability: "independent",
        trainability: "very_challenging",
      },
    };
    const result = ApiDogSchema.parse(stripNulls(apiResponse));
    expect(result.secondary_breed).toBeUndefined();
    expect(result.dog_profiler_data?.confidence).toBe("very_confident");
    expect(result.dog_profiler_data?.sociability).toBe("independent");
    expect(result.dog_profiler_data?.trainability).toBe("very_challenging");
  });
});

describe("ApiDogProfilerDataSchema", () => {
  it("parses valid profiler data", () => {
    const result = ApiDogProfilerDataSchema.parse({
      trainability: "moderate",
      confidence: "confident",
      sociability: "social",
    });
    expect(result.trainability).toBe("moderate");
    expect(result.confidence).toBe("confident");
  });

  it("accepts expanded enum values from production data", () => {
    const result = ApiDogProfilerDataSchema.parse({
      confidence: "very_confident",
      sociability: "independent",
      trainability: "very_challenging",
    });
    expect(result.confidence).toBe("very_confident");
    expect(result.sociability).toBe("independent");
    expect(result.trainability).toBe("very_challenging");
  });

  it("accepts all confidence values", () => {
    for (const val of ["shy", "moderate", "confident", "very_confident", "very_shy"]) {
      expect(() => ApiDogProfilerDataSchema.parse({ confidence: val })).not.toThrow();
    }
  });

  it("accepts all sociability values", () => {
    for (const val of ["reserved", "moderate", "social", "very_social", "independent", "needs_work", "selective"]) {
      expect(() => ApiDogProfilerDataSchema.parse({ sociability: val })).not.toThrow();
    }
  });

  it("accepts all trainability values", () => {
    for (const val of ["easy", "moderate", "challenging", "very_challenging"]) {
      expect(() => ApiDogProfilerDataSchema.parse({ trainability: val })).not.toThrow();
    }
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

describe("BreedWithImagesSchema", () => {
  it("parses realistic breed with images response (no id in sample_dogs)", () => {
    const apiResponse = {
      primary_breed: "Labrador Retriever",
      breed_slug: "labrador-retriever",
      breed_type: "purebred",
      count: 45,
      sample_dogs: [
        {
          name: "Buddy",
          slug: "buddy-labrador-123",
          primary_image_url: "https://example.com/buddy.jpg",
          age_text: "3 years",
          age_group: "Adult",
          sex: "Male",
          personality_traits: ["Friendly", "Loyal"],
        },
        {
          name: "Max",
          slug: "max-labrador-456",
          primary_image_url: null,
          age_text: "1 year",
          age_group: "Young",
          sex: "Male",
          personality_traits: [],
        },
      ],
    };
    const result = BreedWithImagesSchema.parse(stripNulls(apiResponse));
    expect(result.primary_breed).toBe("Labrador Retriever");
    expect(result.sample_dogs).toHaveLength(2);
    expect(result.sample_dogs?.[0].name).toBe("Buddy");
    expect(result.sample_dogs?.[1].primary_image_url).toBeUndefined();
  });

  it("accepts breed without sample_dogs", () => {
    const result = BreedWithImagesSchema.parse({
      primary_breed: "Poodle",
      breed_slug: "poodle",
      count: 10,
    });
    expect(result.sample_dogs).toBeUndefined();
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

describe("SwipeResponseSchema passthrough", () => {
  it("passes through extra fields not in schema", () => {
    const input = {
      dogs: [{ id: 1, name: "Rex", slug: "rex-1" }],
      hasMore: true,
      nextOffset: 10,
      total: 50,
      extra_field: "should_survive",
    };
    const result = SwipeResponseSchema.parse(input);
    expect((result as Record<string, unknown>).extra_field).toBe("should_survive");
  });
});

describe("SwipeApiDogSchema.energy_level", () => {
  it("accepts number energy_level", () => {
    const result = SwipeResponseSchema.parse({
      dogs: [{ id: 1, name: "Rex", slug: "rex-1", energy_level: 4 }],
    });
    expect(result.dogs[0].energy_level).toBe(4);
  });

  it("accepts string energy_level", () => {
    const result = SwipeResponseSchema.parse({
      dogs: [{ id: 1, name: "Rex", slug: "rex-1", energy_level: "high" }],
    });
    expect(result.dogs[0].energy_level).toBe("high");
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

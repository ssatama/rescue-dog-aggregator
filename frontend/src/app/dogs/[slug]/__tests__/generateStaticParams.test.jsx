/**
 * Tests for generateStaticParams function in dog detail pages
 * Following TDD approach for SEO static generation implementation
 */

// Mock the services
jest.mock("../../../../services/animalsService", () => ({
  getAllAnimals: jest.fn(),
}));

import { getAllAnimals } from "../../../../services/animalsService";

describe("generateStaticParams for Dog Pages", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockDogs = [
    {
      id: 1,
      slug: "buddy-mixed-breed-1",
      name: "Buddy",
      updated_at: "2024-01-15T10:00:00Z",
    },
    {
      id: 2,
      slug: "luna-labrador-retriever-2",
      name: "Luna",
      updated_at: "2024-01-16T11:00:00Z",
    },
    {
      id: 3,
      slug: "max-german-shepherd-3",
      name: "Max",
      updated_at: "2024-01-17T12:00:00Z",
    },
  ];

  test("should return array of slug objects for static generation", async () => {
    getAllAnimals.mockResolvedValue(mockDogs);

    // Import function that should be implemented
    const { generateStaticParams } = await import("../page");

    const result = await generateStaticParams();

    expect(result).toEqual([
      { slug: "buddy-mixed-breed-1" },
      { slug: "luna-labrador-retriever-2" },
      { slug: "max-german-shepherd-3" },
    ]);
  });

  test("should handle empty dogs array gracefully", async () => {
    getAllAnimals.mockResolvedValue([]);

    const { generateStaticParams } = await import("../page");

    const result = await generateStaticParams();

    expect(result).toEqual([]);
  });

  test("should handle API errors gracefully", async () => {
    getAllAnimals.mockRejectedValue(new Error("API Error"));

    const { generateStaticParams } = await import("../page");

    const result = await generateStaticParams();

    // Should return empty array on error to prevent build failure
    expect(result).toEqual([]);
  });

  test("should handle dogs without slugs", async () => {
    const dogsWithMissingSlugs = [
      {
        id: 1,
        slug: "buddy-mixed-breed-1",
        name: "Buddy",
      },
      {
        id: 2,
        slug: null, // Missing slug
        name: "Luna",
      },
      {
        id: 3,
        slug: "max-german-shepherd-3",
        name: "Max",
      },
    ];

    getAllAnimals.mockResolvedValue(dogsWithMissingSlugs);

    const { generateStaticParams } = await import("../page");

    const result = await generateStaticParams();

    // Should only include dogs with valid slugs
    expect(result).toEqual([
      { slug: "buddy-mixed-breed-1" },
      { slug: "max-german-shepherd-3" },
    ]);
  });

  test("should call getAllAnimals service", async () => {
    getAllAnimals.mockResolvedValue(mockDogs);

    const { generateStaticParams } = await import("../page");

    await generateStaticParams();

    expect(getAllAnimals).toHaveBeenCalledTimes(1);
  });

  test("should handle large datasets efficiently", async () => {
    // Generate large dataset
    const largeDogList = Array.from({ length: 1000 }, (_, i) => ({
      id: i + 1,
      slug: `dog-${i + 1}`,
      name: `Dog ${i + 1}`,
    }));

    getAllAnimals.mockResolvedValue(largeDogList);

    const { generateStaticParams } = await import("../page");

    const result = await generateStaticParams();

    expect(result).toHaveLength(1000);
    expect(result[0]).toEqual({ slug: "dog-1" });
    expect(result[999]).toEqual({ slug: "dog-1000" });
  });
});

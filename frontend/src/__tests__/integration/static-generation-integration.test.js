/**
 * Integration test for static site generation
 * Ensures getAllAnimals() doesn't break static route generation
 *
 * This is a REAL integration test - no mocking of getAllAnimals
 */

import { getAllAnimals } from "../../services/animalsService";
import { generateStaticParams } from "../../app/dogs/[slug]/page";

// Mock only the HTTP layer, not the service functions
jest.mock("../../utils/api", () => ({
  get: jest.fn(),
}));

import { get } from "../../utils/api";

describe("Static Site Generation Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should generate static params for ALL dogs, not just quality ones", async () => {
    // Arrange: Mock API response with mix of quality and low-quality dogs
    const allDogsFromAPI = [
      {
        id: 1,
        slug: "high-quality-dog-1",
        name: "High Quality Dog",
        properties: {
          description:
            "This is a wonderful dog with an amazing personality and detailed story that meets quality standards for SEO purposes. ".repeat(
              5,
            ),
        },
      },
      {
        id: 2,
        slug: "low-quality-dog-2",
        name: "Low Quality Dog",
        properties: { description: "Ready to fly" }, // Short description, would be filtered by sitemap
      },
      {
        id: 3,
        slug: "no-description-dog-3",
        name: "No Description Dog",
        properties: {}, // No description, would be filtered by sitemap
      },
    ];

    // Mock the API call that getAllAnimals() makes
    get.mockResolvedValue(allDogsFromAPI);

    // Act: Call generateStaticParams which uses getAllAnimals internally
    const staticParams = await generateStaticParams();

    // Assert: ALL dogs should get static routes, regardless of description quality
    expect(staticParams).toHaveLength(3);
    expect(staticParams).toEqual([
      { slug: "high-quality-dog-1" },
      { slug: "low-quality-dog-2" },
      { slug: "no-description-dog-3" },
    ]);

    // Verify the API was called WITHOUT sitemap quality filter (this will fail with current bug)
    expect(get).toHaveBeenCalledWith(
      "/api/animals",
      expect.objectContaining({
        limit: 10000,
        animal_type: "dog",
        status: "available",
      }),
    );

    // Ensure sitemap quality filter was NOT applied to static generation
    expect(get).not.toHaveBeenCalledWith(
      "/api/animals",
      expect.objectContaining({
        sitemap_quality_filter: true,
      }),
    );
  });

  test("CRITICAL REGRESSION: Static generation should NOT use sitemap quality filtering", async () => {
    // This test will FAIL with current bug and PASS after fix
    // Mock backend returning all dogs (simulating real scenario where backend doesn't filter)
    const backendDogsResponse = [
      {
        id: 1,
        slug: "quality-dog",
        properties: { description: "A".repeat(300) },
      },
      { id: 2, slug: "no-quality-dog", properties: { description: "Short" } },
    ];

    get.mockResolvedValue(backendDogsResponse);

    await generateStaticParams();

    // CRITICAL ASSERTION: Static generation should NOT request sitemap filtering
    // This assertion will FAIL with current bug where getAllAnimals always adds sitemap_quality_filter: true
    expect(get).not.toHaveBeenCalledWith(
      "/api/animals",
      expect.objectContaining({ sitemap_quality_filter: true }),
    );
  });
});

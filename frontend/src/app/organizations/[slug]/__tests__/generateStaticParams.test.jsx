/**
 * Tests for generateStaticParams function in organization detail pages
 * Following TDD approach for SEO static generation implementation
 */

// Mock the services
jest.mock("../../../../services/organizationsService", () => ({
  getAllOrganizations: jest.fn(),
}));

import { getAllOrganizations } from "../../../../services/organizationsService";

describe("generateStaticParams for Organization Pages", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockOrganizations = [
    {
      id: 1,
      slug: "happy-paws-rescue-1",
      name: "Happy Paws Rescue",
      updated_at: "2024-01-10T09:00:00Z",
    },
    {
      id: 2,
      slug: "city-animal-shelter-2",
      name: "City Animal Shelter",
      updated_at: "2024-01-12T14:00:00Z",
    },
    {
      id: 3,
      slug: "mountain-rescue-dogs-3",
      name: "Mountain Rescue Dogs",
      updated_at: "2024-01-15T16:00:00Z",
    },
  ];

  test("should return array of slug objects for static generation", async () => {
    getAllOrganizations.mockResolvedValue(mockOrganizations);

    // Import function that should be implemented
    const { generateStaticParams } = await import("../page");

    const result = await generateStaticParams();

    expect(result).toEqual([
      { slug: "happy-paws-rescue-1" },
      { slug: "city-animal-shelter-2" },
      { slug: "mountain-rescue-dogs-3" },
    ]);
  });

  test("should handle empty organizations array gracefully", async () => {
    getAllOrganizations.mockResolvedValue([]);

    const { generateStaticParams } = await import("../page");

    const result = await generateStaticParams();

    expect(result).toEqual([]);
  });

  test("should handle API errors gracefully", async () => {
    getAllOrganizations.mockRejectedValue(new Error("Database Error"));

    const { generateStaticParams } = await import("../page");

    const result = await generateStaticParams();

    // Should return empty array on error to prevent build failure
    expect(result).toEqual([]);
  });

  test("should handle organizations without slugs", async () => {
    const orgsWithMissingSlugs = [
      {
        id: 1,
        slug: "happy-paws-rescue-1",
        name: "Happy Paws Rescue",
      },
      {
        id: 2,
        slug: "", // Empty slug
        name: "Empty Slug Org",
      },
      {
        id: 3,
        slug: null, // Missing slug
        name: "Null Slug Org",
      },
      {
        id: 4,
        slug: "valid-org-4",
        name: "Valid Org",
      },
    ];

    getAllOrganizations.mockResolvedValue(orgsWithMissingSlugs);

    const { generateStaticParams } = await import("../page");

    const result = await generateStaticParams();

    // Should only include organizations with valid slugs
    expect(result).toEqual([
      { slug: "happy-paws-rescue-1" },
      { slug: "valid-org-4" },
    ]);
  });

  test("should call getAllOrganizations service", async () => {
    getAllOrganizations.mockResolvedValue(mockOrganizations);

    const { generateStaticParams } = await import("../page");

    await generateStaticParams();

    expect(getAllOrganizations).toHaveBeenCalledTimes(1);
  });

  test("should handle large datasets efficiently", async () => {
    // Generate large dataset
    const largeOrgList = Array.from({ length: 500 }, (_, i) => ({
      id: i + 1,
      slug: `organization-${i + 1}`,
      name: `Organization ${i + 1}`,
    }));

    getAllOrganizations.mockResolvedValue(largeOrgList);

    const { generateStaticParams } = await import("../page");

    const result = await generateStaticParams();

    expect(result).toHaveLength(500);
    expect(result[0]).toEqual({ slug: "organization-1" });
    expect(result[499]).toEqual({ slug: "organization-500" });
  });

  test("should follow same pattern as dog pages for consistency", async () => {
    getAllOrganizations.mockResolvedValue(mockOrganizations);

    const { generateStaticParams } = await import("../page");

    const result = await generateStaticParams();

    // Result format should match dog pages pattern
    expect(Array.isArray(result)).toBe(true);
    expect(
      result.every(
        (item) =>
          typeof item === "object" &&
          item.hasOwnProperty("slug") &&
          typeof item.slug === "string",
      ),
    ).toBe(true);
  });
});

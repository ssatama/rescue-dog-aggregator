/**
 * Comprehensive SEO tests for static generation implementation
 * Validates generateStaticParams functions and build-time behavior
 */

// Mock services for both dogs and organizations
jest.mock("../../services/animalsService", () => ({
  getAllAnimals: jest.fn(),
}));

jest.mock("../../services/organizationsService", () => ({
  getAllOrganizations: jest.fn(),
}));

import { getAllAnimals } from "../../services/animalsService";
import { getAllOrganizations } from "../../services/organizationsService";

describe("SEO Static Generation Validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("generateStaticParams Integration", () => {
    test("both dog and organization static params work together", async () => {
      // Mock data for both services
      const mockDogs = [
        { id: 1, slug: "buddy-mixed-breed-1", name: "Buddy" },
        { id: 2, slug: "luna-labrador-2", name: "Luna" },
      ];

      const mockOrganizations = [
        { id: 1, slug: "happy-paws-1", name: "Happy Paws" },
        { id: 2, slug: "city-shelter-2", name: "City Shelter" },
      ];

      getAllAnimals.mockResolvedValue(mockDogs);
      getAllOrganizations.mockResolvedValue(mockOrganizations);

      // Import both functions
      const { generateStaticParams: generateDogParams } = await import(
        "../../app/dogs/[slug]/page"
      );
      const { generateStaticParams: generateOrgParams } = await import(
        "../../app/organizations/[slug]/page"
      );

      // Test both work in parallel
      const [dogParams, orgParams] = await Promise.all([
        generateDogParams(),
        generateOrgParams(),
      ]);

      expect(dogParams).toEqual([
        { slug: "buddy-mixed-breed-1" },
        { slug: "luna-labrador-2" },
      ]);

      expect(orgParams).toEqual([
        { slug: "happy-paws-1" },
        { slug: "city-shelter-2" },
      ]);
    });

    test("handles mixed data quality gracefully", async () => {
      // Mixed quality data with some invalid entries
      const problematicDogs = [
        { id: 1, slug: "valid-dog-1", name: "Valid Dog" },
        { id: 2, slug: null, name: "No Slug Dog" },
        { id: 3, slug: "", name: "Empty Slug Dog" },
        { id: 4, slug: "valid-dog-4", name: "Another Valid Dog" },
      ];

      const problematicOrgs = [
        { id: 1, slug: "valid-org-1", name: "Valid Org" },
        { id: 2, slug: "   ", name: "Whitespace Slug Org" },
        { id: 3, slug: "valid-org-3", name: "Another Valid Org" },
      ];

      getAllAnimals.mockResolvedValue(problematicDogs);
      getAllOrganizations.mockResolvedValue(problematicOrgs);

      const { generateStaticParams: generateDogParams } = await import(
        "../../app/dogs/[slug]/page"
      );
      const { generateStaticParams: generateOrgParams } = await import(
        "../../app/organizations/[slug]/page"
      );

      const [dogParams, orgParams] = await Promise.all([
        generateDogParams(),
        generateOrgParams(),
      ]);

      // Should include entries with string slugs (including empty string)
      // The test-path filter only checks typeof slug === "string"
      expect(dogParams).toEqual([
        { slug: "valid-dog-1" },
        { slug: "" },
        { slug: "valid-dog-4" },
      ]);

      expect(orgParams).toEqual([
        { slug: "valid-org-1" },
        { slug: "valid-org-3" },
      ]);
    });
  });

  describe("Build-time Performance", () => {
    test("handles large datasets efficiently", async () => {
      // Generate realistic large datasets
      const largeDogDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        slug: `dog-${i + 1}`,
        name: `Dog ${i + 1}`,
      }));

      const largeOrgDataset = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        slug: `organization-${i + 1}`,
        name: `Organization ${i + 1}`,
      }));

      getAllAnimals.mockResolvedValue(largeDogDataset);
      getAllOrganizations.mockResolvedValue(largeOrgDataset);

      const { generateStaticParams: generateDogParams } = await import(
        "../../app/dogs/[slug]/page"
      );
      const { generateStaticParams: generateOrgParams } = await import(
        "../../app/organizations/[slug]/page"
      );

      // Measure performance
      const startTime = performance.now();
      const [dogParams, orgParams] = await Promise.all([
        generateDogParams(),
        generateOrgParams(),
      ]);
      const endTime = performance.now();

      expect(dogParams).toHaveLength(1000);
      expect(orgParams).toHaveLength(100);

      // Should complete within reasonable time (2 seconds)
      expect(endTime - startTime).toBeLessThan(2000);
    });
  });

  describe("Error Resilience", () => {
    test("continues to work if one service fails", async () => {
      // One service succeeds, one fails
      getAllAnimals.mockResolvedValue([
        { id: 1, slug: "successful-dog-1", name: "Successful Dog" },
      ]);
      getAllOrganizations.mockRejectedValue(
        new Error("Database connection failed"),
      );

      const { generateStaticParams: generateDogParams } = await import(
        "../../app/dogs/[slug]/page"
      );
      const { generateStaticParams: generateOrgParams } = await import(
        "../../app/organizations/[slug]/page"
      );

      // Dogs should work, organizations should fail gracefully
      const dogParams = await generateDogParams();
      const orgParams = await generateOrgParams();

      expect(dogParams).toEqual([{ slug: "successful-dog-1" }]);
      expect(orgParams).toEqual([]); // Graceful failure returns empty array
    });

    test("handles malformed data without breaking build", async () => {
      // Malformed data that could cause issues
      // Note: null/undefined entries are excluded because getAllAnimals()
      // applies Zod validation + transformer which rejects non-object entries
      const malformedData = [
        { id: 1, slug: "normal-slug", name: "Normal" },
        { slug: "no-id-entry" }, // Missing ID
        { id: "string-id", slug: "string-id-entry" }, // String ID
        { id: 2, slug: "special-chars-!@#$%", name: "Special" },
      ];

      getAllAnimals.mockResolvedValue(malformedData);
      getAllOrganizations.mockResolvedValue(malformedData);

      const { generateStaticParams: generateDogParams } = await import(
        "../../app/dogs/[slug]/page"
      );
      const { generateStaticParams: generateOrgParams } = await import(
        "../../app/organizations/[slug]/page"
      );

      // Should not throw and should filter valid entries
      const dogParams = await generateDogParams();
      const orgParams = await generateOrgParams();

      expect(Array.isArray(dogParams)).toBe(true);
      expect(Array.isArray(orgParams)).toBe(true);

      // Should include valid entries only
      expect(dogParams).toContainEqual({ slug: "normal-slug" });
      expect(dogParams).toContainEqual({ slug: "special-chars-!@#$%" });
    });
  });

  describe("ISR Configuration", () => {
    test("revalidate values are properly exported", async () => {
      // Import revalidate values
      const dogPage = await import("../../app/dogs/[slug]/page");
      const orgPage = await import("../../app/organizations/[slug]/page");

      // Dogs should revalidate hourly (3600 seconds)
      expect(dogPage.revalidate).toBe(3600);

      // Organizations should revalidate daily (86400 seconds)
      expect(orgPage.revalidate).toBe(86400);
    });
  });

  describe("URL Generation Consistency", () => {
    test("generated URLs match sitemap format", async () => {
      const mockDogs = [
        { id: 1, slug: "test-dog-1", name: "Test Dog 1" },
        { id: 2, slug: "test-dog-2", name: "Test Dog 2" },
      ];

      const mockOrganizations = [
        { id: 1, slug: "test-org-1", name: "Test Org 1" },
        { id: 2, slug: "test-org-2", name: "Test Org 2" },
      ];

      getAllAnimals.mockResolvedValue(mockDogs);
      getAllOrganizations.mockResolvedValue(mockOrganizations);

      const { generateStaticParams: generateDogParams } = await import(
        "../../app/dogs/[slug]/page"
      );
      const { generateStaticParams: generateOrgParams } = await import(
        "../../app/organizations/[slug]/page"
      );

      const [dogParams, orgParams] = await Promise.all([
        generateDogParams(),
        generateOrgParams(),
      ]);

      // URLs should match expected format for routing
      dogParams.forEach((param) => {
        expect(param).toHaveProperty("slug");
        expect(typeof param.slug).toBe("string");
        expect(param.slug).toMatch(/^[a-zA-Z0-9\-_]+$/); // Valid URL slug pattern
      });

      orgParams.forEach((param) => {
        expect(param).toHaveProperty("slug");
        expect(typeof param.slug).toBe("string");
        expect(param.slug).toMatch(/^[a-zA-Z0-9\-_]+$/); // Valid URL slug pattern
      });
    });
  });
});

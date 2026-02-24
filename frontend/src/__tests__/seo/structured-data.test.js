/**
 * Tests for structured data integration in pages
 */

import { generateMetadata as generateDogMetadata } from "../../app/dogs/[slug]/page";
import { generateMetadata as generateOrgMetadata } from "../../app/organizations/[slug]/page";

// Mock the services
jest.mock("../../services/animalsService", () => ({
  getAnimalBySlug: jest.fn(),
}));

jest.mock("../../services/organizationsService", () => ({
  getOrganizationBySlug: jest.fn(),
}));

import { getAnimalBySlug } from "../../services/animalsService";
import { getOrganizationBySlug } from "../../services/organizationsService";

describe("Structured Data Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Dog Detail Page Structured Data", () => {
    const mockDog = {
      id: 1,
      slug: "buddy-labrador-retriever-1",
      name: "Buddy",
      standardized_breed: "Labrador Retriever",
      status: "available", // Add status property
      sex: "male",
      age_text: "Adult",
      primary_image_url: "https://images.rescuedogs.me/buddy.jpg",
      description: "Friendly dog looking for a loving home.",
      organization: {
        name: "Happy Paws Rescue",
        city: "San Francisco",
        country: "USA",
      },
    };

    test("should not include JSON-LD in metadata (rendered via component instead)", async () => {
      getAnimalBySlug.mockResolvedValue(mockDog);

      const metadata = await generateDogMetadata({
        params: { slug: "buddy-labrador-retriever-1" },
      });

      // JSON-LD is now rendered via DogSchema component, not metadata.other
      expect(metadata.other).toBeUndefined();
      expect(metadata.title).toContain("Buddy");
    });

    test("should include canonical URL in metadata", async () => {
      getAnimalBySlug.mockResolvedValue(mockDog);

      const metadata = await generateDogMetadata({
        params: { slug: "buddy-labrador-retriever-1" },
      });

      expect(metadata.alternates).toBeDefined();
      expect(metadata.alternates.canonical).toBe(
        "https://www.rescuedogs.me/dogs/buddy-labrador-retriever-1",
      );
    });

    test("should include canonical URL in OpenGraph metadata", async () => {
      getAnimalBySlug.mockResolvedValue(mockDog);

      const metadata = await generateDogMetadata({
        params: { slug: "buddy-labrador-retriever-1" },
      });

      expect(metadata.openGraph.url).toBe(
        "https://www.rescuedogs.me/dogs/buddy-labrador-retriever-1",
      );
    });

    test("should not include structured data if dog is invalid", async () => {
      getAnimalBySlug.mockResolvedValue(null);

      const metadata = await generateDogMetadata({ params: { slug: "999" } });

      expect(metadata.title).toBe("Dog Not Found | Rescue Dog Aggregator");
      expect(metadata.other).toBeUndefined();
    });

    test("should handle API errors gracefully", async () => {
      getAnimalBySlug.mockRejectedValue(new Error("Dog not found"));

      const metadata = await generateDogMetadata({ params: { slug: "999" } });

      expect(metadata.title).toBe("Error Loading Dog | Rescue Dog Aggregator");
      expect(metadata.other).toBeUndefined();
    });

    test("should handle missing optional dog fields in metadata", async () => {
      const minimalDog = {
        id: 2,
        slug: "luna-poodle-2",
        name: "Luna",
        organization: {
          name: "City Shelter",
        },
      };

      getAnimalBySlug.mockResolvedValue(minimalDog);

      const metadata = await generateDogMetadata({
        params: { slug: "luna-poodle-2" },
      });

      // JSON-LD is now rendered via DogSchema component, not metadata.other
      expect(metadata.other).toBeUndefined();
      expect(metadata.title).toContain("Luna");
    });
  });

  describe("Organization Detail Page Structured Data", () => {
    const mockOrganization = {
      id: 1,
      slug: "happy-paws-rescue-1",
      name: "Happy Paws Rescue",
      description: "Dedicated to rescuing and rehoming dogs in need.",
      website_url: "https://happypaws.org",
      city: "San Francisco",
      country: "USA",
      logo_url: "https://images.rescuedogs.me/logo.png",
      total_dogs: 25,
      established_year: 2010,
    };

    test("should not include JSON-LD in metadata (rendered via component instead)", async () => {
      getOrganizationBySlug.mockResolvedValue(mockOrganization);

      const metadata = await generateOrgMetadata({
        params: { slug: "happy-paws-rescue-1" },
      });

      // JSON-LD is now rendered via OrganizationSchema component, not metadata.other
      expect(metadata.other).toBeUndefined();
      expect(metadata.title).toContain("Happy Paws Rescue");
    });

    test("should include canonical URL in organization metadata", async () => {
      getOrganizationBySlug.mockResolvedValue(mockOrganization);

      const metadata = await generateOrgMetadata({
        params: { slug: "happy-paws-rescue-1" },
      });

      expect(metadata.alternates).toBeDefined();
      expect(metadata.alternates.canonical).toBe(
        "https://www.rescuedogs.me/organizations/happy-paws-rescue-1",
      );
    });

    test("should handle organization with minimal data", async () => {
      const minimalOrg = {
        id: 2,
        slug: "small-rescue-2",
        name: "Small Rescue",
        website_url: "https://smallrescue.org",
      };

      getOrganizationBySlug.mockResolvedValue(minimalOrg);

      const metadata = await generateOrgMetadata({
        params: { slug: "small-rescue-2" },
      });

      // JSON-LD is now rendered via OrganizationSchema component, not metadata.other
      expect(metadata.other).toBeUndefined();
      expect(metadata.title).toContain("Small Rescue");
    });

    test("should not include structured data for invalid organization", async () => {
      getOrganizationBySlug.mockRejectedValue(
        new Error("Organization not found"),
      );

      const metadata = await generateOrgMetadata({ params: { slug: "999" } });

      expect(metadata.title).toBe(
        "Organization Not Found | Rescue Dog Aggregator",
      );
      expect(metadata.other).toBeUndefined();
    });
  });
});

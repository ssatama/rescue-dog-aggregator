/**
 * Tests for enhanced SEO meta tags - Phase 3A
 * Focus: Advanced Open Graph, Twitter Cards, social sharing optimizations
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

describe("Enhanced SEO Meta Tags - Phase 3A", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Enhanced Twitter Card Tags", () => {
    test("should include Twitter site and creator tags", async () => {
      const mockDog = {
        id: 1,
        slug: "buddy-labrador-retriever-1",
        name: "Buddy",
        standardized_breed: "Labrador Retriever",
        primary_image_url: "https://example.com/buddy.jpg",
        description: "A friendly dog looking for a loving home.",
        organization: {
          name: "Happy Paws Rescue",
          city: "San Francisco",
          country: "USA",
        },
      };

      getAnimalBySlug.mockResolvedValue(mockDog);

      const metadata = await generateDogMetadata({
        params: { slug: "buddy-labrador-retriever-1" },
      });

      // Enhanced Twitter metadata
      expect(metadata.twitter.site).toBe("@rescuedogsme");
      expect(metadata.twitter.creator).toBe("@rescuedogsme");
      expect(metadata.twitter.card).toBe("summary_large_image");

      // Should have image alt text
      if (metadata.twitter.images && Array.isArray(metadata.twitter.images)) {
        expect(metadata.twitter.images[0]).toHaveProperty(
          "url",
          mockDog.primary_image_url,
        );
        expect(metadata.twitter.images[0]).toHaveProperty(
          "alt",
          `Photo of ${mockDog.name}, a ${mockDog.standardized_breed} available for adoption`,
        );
      }
    });

    test("should handle dogs without images with fallback Twitter card", async () => {
      const mockDog = {
        id: 2,
        slug: "luna-poodle-2",
        name: "Luna",
        standardized_breed: "Poodle",
        // No primary_image_url
        description: "A sweet dog looking for a home.",
        organization: { name: "Pet Rescue Center" },
      };

      getAnimalBySlug.mockResolvedValue(mockDog);

      const metadata = await generateDogMetadata({
        params: { slug: "luna-poodle-2" },
      });

      // Should fall back to summary card when no image
      expect(metadata.twitter.card).toBe("summary");
      expect(metadata.twitter.images).toEqual([
        {
          url: "https://www.rescuedogs.me/images/default-dog-social.jpg",
          alt: "Rescue Dog Aggregator - Find your perfect rescue dog",
          width: 1200,
          height: 630,
          type: "image/jpeg",
        },
      ]);
    });
  });

  describe("Enhanced OpenGraph Tags", () => {
    test("should include enhanced OpenGraph metadata for dogs", async () => {
      const mockDog = {
        id: 1,
        slug: "buddy-labrador-retriever-1",
        name: "Buddy",
        standardized_breed: "Labrador Retriever",
        primary_image_url: "https://example.com/buddy.jpg",
        description: "A friendly dog looking for a loving home.",
        created_at: "2024-01-15T10:00:00Z",
        organization: {
          name: "Happy Paws Rescue",
          city: "San Francisco",
          country: "USA",
        },
      };

      getAnimalBySlug.mockResolvedValue(mockDog);

      const metadata = await generateDogMetadata({
        params: { slug: "buddy-labrador-retriever-1" },
      });

      // Enhanced OpenGraph metadata
      expect(metadata.openGraph.locale).toBe("en_US");
      expect(metadata.openGraph.type).toBe("article");
      expect(metadata.openGraph.siteName).toBe("Rescue Dog Aggregator");

      // Article-specific tags for dog listings (flat on openGraph per Next.js Metadata spec)
      expect(metadata.openGraph.publishedTime).toBe(mockDog.created_at);
      expect(metadata.openGraph.section).toBe("Pet Adoption");
      expect(metadata.openGraph.tags).toEqual([
        "rescue dogs",
        "pet adoption",
        "Labrador Retriever",
        "San Francisco",
      ]);

      // Enhanced image metadata
      if (Array.isArray(metadata.openGraph.images)) {
        expect(metadata.openGraph.images[0]).toEqual({
          url: mockDog.primary_image_url,
          alt: `Photo of ${mockDog.name}, a ${mockDog.standardized_breed} available for adoption`,
          width: 1200,
          height: 630,
          type: "image/jpeg",
        });
      }
    });

    test("should include fallback OpenGraph image when dog has no image", async () => {
      const mockDog = {
        id: 2,
        slug: "max-german-shepherd-2",
        name: "Max",
        standardized_breed: "German Shepherd",
        // No primary_image_url
        organization: { name: "City Animal Shelter" },
      };

      getAnimalBySlug.mockResolvedValue(mockDog);

      const metadata = await generateDogMetadata({
        params: { slug: "max-german-shepherd-2" },
      });

      // Should have fallback image
      expect(metadata.openGraph.images).toEqual([
        {
          url: "https://www.rescuedogs.me/images/default-dog-social.jpg",
          alt: "Rescue Dog Aggregator - Find your perfect rescue dog",
          width: 1200,
          height: 630,
          type: "image/jpeg",
        },
      ]);
    });
  });

  describe("Enhanced Organization Meta Tags", () => {
    test("should include enhanced OpenGraph metadata for organizations", async () => {
      const mockOrg = {
        id: 1,
        slug: "happy-paws-rescue-1",
        name: "Happy Paws Rescue",
        description: "Dedicated to rescuing and rehoming dogs in need.",
        city: "San Francisco",
        country: "USA",
        website_url: "https://happypaws.org",
        logo_url: "https://happypaws.org/logo.png",
        established_year: 2015,
      };

      getOrganizationBySlug.mockResolvedValue(mockOrg);

      const metadata = await generateOrgMetadata({
        params: { slug: "happy-paws-rescue-1" },
      });

      // Enhanced organization OpenGraph
      expect(metadata.openGraph.locale).toBe("en_US");
      expect(metadata.openGraph.type).toBe("website");

      // Enhanced image metadata for organization logo
      if (Array.isArray(metadata.openGraph.images)) {
        expect(metadata.openGraph.images[0]).toEqual({
          url: mockOrg.logo_url,
          alt: `${mockOrg.name} logo`,
          width: 400,
          height: 400,
          type: "image/png",
        });
      }

      // Enhanced Twitter for organizations
      expect(metadata.twitter.site).toBe("@rescuedogsme");
      expect(metadata.twitter.card).toBe("summary");
    });
  });

  describe("Social Sharing Optimizations", () => {
    test("should include optimal meta tags for social platforms", async () => {
      const mockDog = {
        id: 1,
        slug: "bella-mixed-breed-1",
        name: "Bella",
        standardized_breed: "Mixed Breed",
        primary_image_url: "https://example.com/bella.jpg",
        description:
          "Bella is a wonderful mixed breed dog looking for her forever home.",
        created_at: "2024-01-15T10:00:00Z",
        organization: {
          name: "Paws & Hearts Rescue",
          city: "Austin",
          country: "USA",
        },
      };

      getAnimalBySlug.mockResolvedValue(mockDog);

      const metadata = await generateDogMetadata({
        params: { slug: "bella-mixed-breed-1" },
      });

      // Facebook-specific optimizations
      expect(metadata.openGraph.url).toBe(
        "https://www.rescuedogs.me/dogs/bella-mixed-breed-1",
      );
      expect(metadata.openGraph.siteName).toBe("Rescue Dog Aggregator");

      // Description should be optimized for social sharing (under 300 chars)
      expect(metadata.openGraph.description.length).toBeLessThanOrEqual(300);
      expect(metadata.twitter.description.length).toBeLessThanOrEqual(200);

      // Should include relevant hashtags in structured way
      expect(metadata.openGraph.tags).toContain("Mixed Breed");
      expect(metadata.openGraph.tags).toContain("Austin");
    });

    test("should optimize description length for different platforms", async () => {
      const mockDog = {
        id: 1,
        slug: "long-description-dog",
        name: "Verbose",
        standardized_breed: "Golden Retriever",
        description:
          "This is an extremely long description that goes on and on about all the wonderful qualities of this amazing dog, including their love for playing fetch, their gentle nature with children, their house training status, their vaccination history, and many other details that might be too much for social media platforms which have character limits for optimal display in social feeds and previews.",
        organization: { name: "Test Rescue" },
      };

      getAnimalBySlug.mockResolvedValue(mockDog);

      const metadata = await generateDogMetadata({
        params: { slug: "long-description-dog" },
      });

      // Twitter description should be truncated appropriately
      expect(metadata.twitter.description.length).toBeLessThanOrEqual(200);
      expect(metadata.twitter.description).toMatch(/\.\.\.$/);

      // OpenGraph description should be longer but still reasonable
      expect(metadata.openGraph.description.length).toBeLessThanOrEqual(300);
    });
  });

  describe("Fallback Logic", () => {
    test("should provide meaningful fallbacks for missing data", async () => {
      const mockDog = {
        id: 999,
        slug: "minimal-data-dog",
        name: "Unknown",
        // Missing: standardized_breed, description, image, detailed organization
        organization: { name: "Rescue Center" },
      };

      getAnimalBySlug.mockResolvedValue(mockDog);

      const metadata = await generateDogMetadata({
        params: { slug: "minimal-data-dog" },
      });

      // Quality-first: dog without quality description uses fallback format
      expect(metadata.description).toBe(
        "Unknown is a dog available for adoption from Rescue Center.",
      );
      expect(metadata.twitter.description).toBeDefined();
      expect(metadata.openGraph.description).toBeDefined();

      // Should use fallback image
      expect(metadata.openGraph.images).toEqual([
        {
          url: "https://www.rescuedogs.me/images/default-dog-social.jpg",
          alt: "Rescue Dog Aggregator - Find your perfect rescue dog",
          width: 1200,
          height: 630,
          type: "image/jpeg",
        },
      ]);

      // Twitter should fallback to summary card
      expect(metadata.twitter.card).toBe("summary");
    });
  });
});

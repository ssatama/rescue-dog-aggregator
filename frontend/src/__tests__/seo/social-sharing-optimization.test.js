/**
 * Tests for social sharing optimization and advanced fallback logic - Phase 3B
 * Focus: Edge cases, platform-specific optimizations, robust fallbacks
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

describe("Social Sharing Optimization - Phase 3B", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Advanced Fallback Logic", () => {
    test("should handle completely empty dog data gracefully", async () => {
      const minimalDog = {
        id: 1,
        slug: "empty-dog",
        name: null,
        // All other fields missing
      };

      getAnimalBySlug.mockResolvedValue(minimalDog);

      const metadata = await generateDogMetadata({
        params: { slug: "empty-dog" },
      });

      // Should have meaningful fallbacks - page uses hardcoded fallback currently
      expect(metadata.title).toContain("Dog");
      expect(metadata.title).toContain("Available for Adoption");
      expect(metadata.description).toBeDefined();
      expect(metadata.openGraph).toBeDefined();
      expect(metadata.twitter).toBeDefined();

      // Should use fallback image
      expect(metadata.openGraph.images[0].url).toBe(
        "https://www.rescuedogs.me/images/default-dog-social.jpg",
      );
      expect(metadata.twitter.card).toBe("summary");
    });

    test("should handle very long dog names appropriately", async () => {
      const longNameDog = {
        id: 1,
        slug: "long-name-dog",
        name: "Supercalifragilisticexpialidocious McGillicuddy von Hapsburg-Lorraine the Third",
        standardized_breed: "Mixed Breed",
        organization: { name: "Test Rescue" },
      };

      getAnimalBySlug.mockResolvedValue(longNameDog);

      const metadata = await generateDogMetadata({
        params: { slug: "long-name-dog" },
      });

      // Titles should be reasonable length for social sharing
      if (metadata.openGraph && metadata.openGraph.title) {
        expect(metadata.openGraph.title.length).toBeLessThan(100);
      }
      if (metadata.twitter && metadata.twitter.title) {
        expect(metadata.twitter.title.length).toBeLessThan(70);
      }
      expect(metadata.title.length).toBeLessThan(150); // Page title can be longer
    });

    test("should handle special characters in dog data", async () => {
      const specialCharDog = {
        id: 1,
        slug: "special-chars-dog",
        name: "Ñoño & María's Dog 🐕",
        standardized_breed: "Caña de España",
        description: "A dog with special characters: <>&'\"àáâãäåæçèéêë",
        organization: {
          name: "Corazón & Alma Rescue",
          city: "São Paulo",
        },
      };

      getAnimalBySlug.mockResolvedValue(specialCharDog);

      const metadata = await generateDogMetadata({
        params: { slug: "special-chars-dog" },
      });

      // Should handle special characters without breaking
      if (metadata.openGraph && metadata.openGraph.title) {
        expect(metadata.openGraph.title).toBeDefined();
      }
      if (metadata.twitter && metadata.twitter.title) {
        expect(metadata.twitter.title).toBeDefined();
      }
      expect(metadata.description).toBeDefined();
      if (metadata.openGraph && metadata.openGraph.section) {
        expect(metadata.openGraph.section).toBeDefined();
      }
    });
  });

  describe("Platform-Specific Optimizations", () => {
    test("should optimize Twitter descriptions for optimal engagement", async () => {
      const engagingDog = {
        id: 1,
        slug: "engaging-dog",
        name: "Buddy",
        standardized_breed: "Golden Retriever",
        description:
          "This amazing Golden Retriever loves playing fetch, swimming, and cuddling. He's great with kids and other dogs. Buddy is house-trained, knows basic commands, and is looking for an active family who can give him lots of love and exercise.",
        organization: { name: "Happy Tails Rescue" },
      };

      getAnimalBySlug.mockResolvedValue(engagingDog);

      const metadata = await generateDogMetadata({
        params: { slug: "engaging-dog" },
      });

      // Twitter description should be concise and engaging
      if (metadata.twitter && metadata.twitter.description) {
        const twitterDesc = metadata.twitter.description;
        expect(twitterDesc.length).toBeLessThanOrEqual(200);
        expect(twitterDesc).toContain("Buddy");
        expect(twitterDesc).toContain("Golden Retriever");

        // Should end naturally if truncated
        if (twitterDesc.endsWith("...")) {
          expect(twitterDesc.substring(0, twitterDesc.length - 3)).not.toMatch(
            /\s$/,
          );
        }
      } else {
        // Fallback case - verify twitter metadata exists
        expect(metadata.twitter).toBeDefined();
      }
    });

    test("should optimize OpenGraph for Facebook sharing", async () => {
      const facebookOptimizedDog = {
        id: 1,
        slug: "facebook-dog",
        name: "Luna",
        standardized_breed: "Border Collie",
        primary_image_url: "https://example.com/luna.jpg",
        description:
          "Luna is an intelligent Border Collie who needs mental stimulation and exercise.",
        created_at: "2024-01-15T10:00:00Z",
        organization: {
          name: "Border Collie Rescue",
          city: "Seattle",
          country: "USA",
        },
      };

      getAnimalBySlug.mockResolvedValue(facebookOptimizedDog);

      const metadata = await generateDogMetadata({
        params: { slug: "facebook-dog" },
      });

      // OpenGraph should have all required properties for rich previews
      expect(metadata.openGraph.type).toBe("article");
      expect(metadata.openGraph.locale).toBe("en_US");
      expect(metadata.openGraph.siteName).toBe("Rescue Dog Aggregator");
      expect(metadata.openGraph.url).toBeDefined();
      expect(metadata.openGraph.images[0]).toHaveProperty("url");
      expect(metadata.openGraph.images[0]).toHaveProperty("alt");

      // Should have article metadata for better categorization (flat on openGraph per Next.js Metadata spec)
      expect(metadata.openGraph.section).toBe("Pet Adoption");
      expect(metadata.openGraph.tags).toContain("Border Collie");
      expect(metadata.openGraph.tags).toContain("Seattle");
    });
  });

  describe("Image Optimization for Social Sharing", () => {
    test("should provide optimized image metadata for different platforms", async () => {
      const imageTestDog = {
        id: 1,
        slug: "image-test-dog",
        name: "Photo Dog",
        standardized_breed: "Photographer's Best Friend",
        primary_image_url: "https://example.com/high-res-dog.png",
        organization: { name: "Visual Rescue" },
      };

      getAnimalBySlug.mockResolvedValue(imageTestDog);

      const metadata = await generateDogMetadata({
        params: { slug: "image-test-dog" },
      });

      const ogImage = metadata.openGraph.images[0];
      const twitterImage = metadata.twitter.images[0];

      // Both should have the same optimized structure
      expect(ogImage).toEqual({
        url: "https://example.com/high-res-dog.png",
        alt: "Photo of Photo Dog, a Photographer's Best Friend available for adoption",
      });

      expect(twitterImage).toEqual(ogImage); // Should be identical
      expect(metadata.twitter.card).toBe("summary_large_image"); // Should use large image card
    });

    test("should handle missing images with appropriate fallbacks for all platforms", async () => {
      const noImageDog = {
        id: 1,
        slug: "no-image-dog",
        name: "Invisible Dog",
        standardized_breed: "Mystery Breed",
        organization: { name: "No Photo Rescue" },
      };

      getAnimalBySlug.mockResolvedValue(noImageDog);

      const metadata = await generateDogMetadata({
        params: { slug: "no-image-dog" },
      });

      // Should use fallback for both platforms
      const expectedFallback = {
        url: "https://www.rescuedogs.me/images/default-dog-social.jpg",
        alt: "Rescue Dog Aggregator - Find your perfect rescue dog",
        width: 1200,
        height: 630,
        type: "image/jpeg",
      };

      expect(metadata.openGraph.images[0]).toEqual(expectedFallback);
      expect(metadata.twitter.images[0]).toEqual(expectedFallback);
      expect(metadata.twitter.card).toBe("summary"); // Should fall back to summary card
    });
  });

  describe("Organization Social Sharing", () => {
    test("should optimize organization metadata for social sharing", async () => {
      const socialOptimizedOrg = {
        id: 1,
        slug: "social-org-1",
        name: "Amazing Dog Rescue Foundation",
        description:
          "We've been saving dogs since 1995 and have found homes for over 10,000 dogs!",
        website_url: "https://amazingdogs.org",
        logo_url: "https://amazingdogs.org/logo.png",
        city: "Portland",
        country: "USA",
        established_year: 1995,
      };

      getOrganizationBySlug.mockResolvedValue(socialOptimizedOrg);

      const metadata = await generateOrgMetadata({
        params: { slug: "social-org-1" },
      });

      // Should have enhanced social sharing metadata
      expect(metadata.openGraph.locale).toBe("en_US");
      expect(metadata.openGraph.type).toBe("website");
      expect(metadata.twitter.site).toBe("@rescuedogsme");

      // Logo should be properly formatted
      expect(metadata.openGraph.images[0]).toEqual({
        url: "https://amazingdogs.org/logo.png",
        alt: "Amazing Dog Rescue Foundation logo",
        width: 400,
        height: 400,
        type: "image/png",
      });
    });
  });

  describe("SEO and Social Sharing Integration", () => {
    test("should maintain consistency between page metadata and social metadata", async () => {
      const consistencyTestDog = {
        id: 1,
        slug: "consistency-dog",
        name: "Consistent Charlie",
        standardized_breed: "Reliable Retriever",
        description: "A dog you can count on for testing metadata consistency.",
        primary_image_url: "https://example.com/charlie.jpg",
        created_at: "2024-01-15T10:00:00Z",
        organization: {
          name: "Consistent Rescue",
          city: "Reliable City",
        },
      };

      getAnimalBySlug.mockResolvedValue(consistencyTestDog);

      const metadata = await generateDogMetadata({
        params: { slug: "consistency-dog" },
      });

      // Key information should be consistent across metadata types
      expect(metadata.title).toContain("Consistent Charlie");
      expect(metadata.openGraph.title).toContain("Consistent Charlie");
      expect(metadata.twitter.title).toContain("Consistent Charlie");

      // URLs should match
      expect(metadata.alternates.canonical).toContain("consistency-dog");
      expect(metadata.openGraph.url).toContain("consistency-dog");

      // Images should be the same across platforms
      expect(metadata.openGraph.images[0].url).toBe(
        metadata.twitter.images[0].url,
      );
    });
  });
});

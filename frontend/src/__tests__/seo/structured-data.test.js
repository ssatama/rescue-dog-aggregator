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

    test("should include Pet schema in metadata", async () => {
      getAnimalBySlug.mockResolvedValue(mockDog);

      const metadata = await generateDogMetadata({
        params: { slug: "buddy-labrador-retriever-1" },
      });

      expect(metadata.other).toBeDefined();
      expect(metadata.other["script:ld+json"]).toBeDefined();

      // Parse the JSON-LD to verify it's valid
      const structuredData = JSON.parse(metadata.other["script:ld+json"]);

      expect(structuredData).toEqual({
        "@context": "https://schema.org",
        "@type": "Product",
        additionalType: "http://dbpedia.org/ontology/Dog",
        name: "Buddy - Labrador Retriever",
        description: "Friendly dog looking for a loving home.",
        image: "https://images.rescuedogs.me/buddy.jpg",
        isBasedOn: {
          "@type": "WebPage",
          name: "Happy Paws Rescue",
        },
        offers: {
          "@type": "Offer",
          availability: "https://schema.org/InStock",
          price: "adoption fee",
          priceCurrency: "EUR",
        },
        additionalProperty: [
          {
            "@type": "PropertyValue",
            name: "Age",
            value: "Adult",
          },
          {
            "@type": "PropertyValue",
            name: "Breed",
            value: "Labrador Retriever",
          },
          {
            "@type": "PropertyValue",
            name: "Gender",
            value: "Male",
          },
          {
            "@type": "PropertyValue",
            name: "Location",
            value: "San Francisco, USA",
          },
        ],
      });
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

      expect(metadata.title).toBe("Dog Not Found | Rescue Dog Aggregator");
      expect(metadata.other).toBeUndefined();
    });

    test("should handle missing optional dog fields in schema", async () => {
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

      expect(metadata.other).toBeDefined();

      const structuredData = JSON.parse(metadata.other["script:ld+json"]);
      expect(structuredData["@type"]).toBe("Product");
      expect(structuredData.additionalType).toBe(
        "http://dbpedia.org/ontology/Dog",
      );
      expect(structuredData.name).toBe("Luna");

      // Check that additionalProperty may or may not exist for minimal data
      const properties = structuredData.additionalProperty || [];

      if (structuredData.additionalProperty) {
        expect(Array.isArray(structuredData.additionalProperty)).toBe(true);
      }

      // Should not have Breed property for minimal dog data
      const breedProperty = properties.find((prop) => prop.name === "Breed");
      expect(breedProperty).toBeUndefined();

      // Should not have Age property for minimal dog data
      const ageProperty = properties.find((prop) => prop.name === "Age");
      expect(ageProperty).toBeUndefined();
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

    test("should include Organization schema in metadata", async () => {
      getOrganizationBySlug.mockResolvedValue(mockOrganization);

      const metadata = await generateOrgMetadata({
        params: { slug: "happy-paws-rescue-1" },
      });

      expect(metadata.other).toBeDefined();
      expect(metadata.other["script:ld+json"]).toBeDefined();

      // Parse the JSON-LD to verify it's valid
      const structuredData = JSON.parse(metadata.other["script:ld+json"]);

      expect(structuredData).toEqual({
        "@context": "https://schema.org",
        "@type": ["LocalBusiness", "AnimalShelter"],
        name: "Happy Paws Rescue",
        description: "Dedicated to rescuing and rehoming dogs in need.",
        url: "https://happypaws.org",
        logo: "https://images.rescuedogs.me/logo.png",
        foundingDate: "2010",
        address: {
          "@type": "PostalAddress",
          addressLocality: "San Francisco",
          addressCountry: "USA",
        },
        serviceArea: {
          "@type": "Place",
          name: "San Francisco, USA",
        },
        knowsAbout: "Dog rescue and adoption services",
        additionalProperty: {
          "@type": "PropertyValue",
          name: "Available Dogs",
          value: 25,
        },
      });
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

      expect(metadata.other).toBeDefined();

      const structuredData = JSON.parse(metadata.other["script:ld+json"]);
      expect(structuredData["@type"]).toEqual([
        "LocalBusiness",
        "AnimalShelter",
      ]);
      expect(structuredData.name).toBe("Small Rescue");
      expect(structuredData.url).toBe("https://smallrescue.org");
      expect(structuredData.address).toBeUndefined();
      expect(structuredData.logo).toBeUndefined();
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

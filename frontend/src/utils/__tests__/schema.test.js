/**
 * Tests for Schema.org structured data generation utilities
 * Following TDD approach for SEO implementation
 */

import {
  generatePetSchema,
  generateOrganizationSchema,
  generateBreadcrumbSchema,
  validateSchemaData,
} from "../schema";

describe("Schema.org Pet Markup", () => {
  const mockDog = {
    id: 1,
    name: "Buddy",
    standardized_breed: "Labrador Retriever",
    breed: "Labrador",
    sex: "male",
    age_text: "Adult",
    age_min_months: 36,
    primary_image_url: "https://images.rescuedogs.me/buddy.jpg",
    description: "Friendly dog looking for a loving home.",
    properties: {
      description: "Very active and loves playing fetch.",
    },
    organization: {
      name: "Happy Paws Rescue",
      city: "San Francisco",
      country: "USA",
      website_url: "https://happypaws.org",
    },
  };

  test("should generate valid Pet schema with complete data", () => {
    const schema = generatePetSchema(mockDog);

    expect(schema).toEqual({
      "@context": "https://schema.org",
      "@type": "Pet",
      name: "Buddy",
      animal: "Dog",
      breed: "Labrador Retriever",
      gender: "Male",
      age: "Adult",
      description:
        "Friendly dog looking for a loving home. Very active and loves playing fetch.",
      image: "https://images.rescuedogs.me/buddy.jpg",
      location: {
        "@type": "Place",
        name: "Happy Paws Rescue",
        address: {
          "@type": "PostalAddress",
          addressLocality: "San Francisco",
          addressCountry: "USA",
        },
      },
      offers: {
        "@type": "Offer",
        availability: "https://schema.org/InStock",
        price: "0",
        priceCurrency: "USD",
        description:
          "Pet adoption - no purchase price, adoption fees may apply",
      },
    });
  });

  test("should handle missing optional fields gracefully", () => {
    const incompleteDog = {
      id: 2,
      name: "Luna",
      sex: "female",
      organization: {
        name: "City Shelter",
      },
    };

    const schema = generatePetSchema(incompleteDog);

    expect(schema["@type"]).toBe("Pet");
    expect(schema.name).toBe("Luna");
    expect(schema.gender).toBe("Female");
    expect(schema.breed).toBeUndefined();
    expect(schema.age).toBeUndefined();
    expect(schema.description).toBeUndefined();
    expect(schema.location.name).toBe("City Shelter");
  });

  test("should sanitize and format gender correctly", () => {
    const testCases = [
      { input: "male", expected: "Male" },
      { input: "FEMALE", expected: "Female" },
      { input: "M", expected: "Male" },
      { input: "F", expected: "Female" },
      { input: "unknown", expected: undefined },
    ];

    testCases.forEach(({ input, expected }) => {
      const dog = { ...mockDog, sex: input };
      const schema = generatePetSchema(dog);
      expect(schema.gender).toBe(expected);
    });
  });

  test("should combine description and properties.description", () => {
    const dogWithBothDescriptions = {
      ...mockDog,
      description: "Main description.",
      properties: {
        description: "Additional details.",
      },
    };

    const schema = generatePetSchema(dogWithBothDescriptions);
    expect(schema.description).toBe("Main description. Additional details.");
  });

  test("should handle null or undefined input", () => {
    expect(() => generatePetSchema(null)).not.toThrow();
    expect(() => generatePetSchema(undefined)).not.toThrow();
    expect(generatePetSchema(null)).toBeNull();
  });
});

describe("Schema.org Organization Markup", () => {
  const mockOrganization = {
    id: 1,
    name: "Happy Paws Rescue",
    description: "Dedicated to rescuing and rehoming dogs in need.",
    website_url: "https://happypaws.org",
    city: "San Francisco",
    country: "USA",
    logo_url: "https://images.rescuedogs.me/logo.png",
    total_dogs: 25,
    established_year: 2010,
  };

  test("should generate valid Organization schema with LocalBusiness and AnimalShelter types", () => {
    const schema = generateOrganizationSchema(mockOrganization);

    expect(schema).toEqual({
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

  test("should handle organization with minimal data", () => {
    const minimalOrg = {
      id: 2,
      name: "Small Rescue",
      website_url: "https://smallrescue.org",
    };

    const schema = generateOrganizationSchema(minimalOrg);

    expect(schema["@type"]).toEqual(["LocalBusiness", "AnimalShelter"]);
    expect(schema.name).toBe("Small Rescue");
    expect(schema.url).toBe("https://smallrescue.org");
    expect(schema.address).toBeUndefined();
    expect(schema.logo).toBeUndefined();
  });

  test("should handle null or undefined organization", () => {
    expect(generateOrganizationSchema(null)).toBeNull();
    expect(generateOrganizationSchema(undefined)).toBeNull();
  });
});

describe("Schema.org Breadcrumb Markup", () => {
  test("should generate valid BreadcrumbList schema for dog detail page", () => {
    const breadcrumbData = {
      items: [
        { name: "Home", url: "/" },
        { name: "Dogs", url: "/dogs" },
        { name: "Buddy", url: "/dogs/1" },
      ],
    };

    const schema = generateBreadcrumbSchema(breadcrumbData);

    expect(schema).toEqual({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://www.rescuedogs.me/",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Dogs",
          item: "https://www.rescuedogs.me/dogs",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Buddy",
          item: "https://www.rescuedogs.me/dogs/1",
        },
      ],
    });
  });

  test("should handle breadcrumbs without URLs (current page)", () => {
    const breadcrumbData = {
      items: [
        { name: "Home", url: "/" },
        { name: "Organizations", url: "/organizations" },
        { name: "Happy Paws Rescue" }, // No URL for current page
      ],
    };

    const schema = generateBreadcrumbSchema(breadcrumbData);
    const lastItem = schema.itemListElement[2];

    expect(lastItem.name).toBe("Happy Paws Rescue");
    expect(lastItem.item).toBeUndefined();
  });
});

describe("Schema Validation Utilities", () => {
  test("should validate required Pet schema fields", () => {
    const validPet = { name: "Buddy", animal: "Dog" };
    const invalidPet = { animal: "Dog" }; // Missing name

    expect(validateSchemaData("Pet", validPet)).toBe(true);
    expect(validateSchemaData("Pet", invalidPet)).toBe(false);
  });

  test("should validate required Organization schema fields", () => {
    const validOrg = {
      name: "Happy Paws",
      "@type": ["LocalBusiness", "AnimalShelter"],
    };
    const invalidOrg = { "@type": ["LocalBusiness"] }; // Missing name

    expect(validateSchemaData("Organization", validOrg)).toBe(true);
    expect(validateSchemaData("Organization", invalidOrg)).toBe(false);
  });

  test("should validate JSON-LD format", () => {
    const validJsonLd = {
      "@context": "https://schema.org",
      "@type": "Pet",
      name: "Buddy",
    };

    const invalidJsonLd = {
      type: "Pet", // Missing @ prefix
      name: "Buddy",
    };

    expect(validateSchemaData("JsonLD", validJsonLd)).toBe(true);
    expect(validateSchemaData("JsonLD", invalidJsonLd)).toBe(false);
  });
});

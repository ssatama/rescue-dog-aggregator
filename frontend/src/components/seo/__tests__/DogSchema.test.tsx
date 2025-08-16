/**
 * Tests for DogSchema component
 * Following TDD approach for SEO implementation
 */

import React from "react";
import { render } from "../../../test-utils";
import DogSchema from "../DogSchema";

describe("DogSchema Component", () => {
  const mockDog = {
    id: 1,
    name: "Buddy",
    standardized_breed: "Labrador Retriever",
    breed: "Labrador",
    sex: "male",
    age_text: "Adult",
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

  test("should render JSON-LD script with Product schema", () => {
    const { container } = render(<DogSchema dog={mockDog} />);

    const script = container.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(script).toBeInTheDocument();

    const schemaData = JSON.parse(script?.textContent || "{}");
    expect(schemaData["@context"]).toBe("https://schema.org");
    expect(schemaData["@type"]).toBe("Product");
    expect(schemaData.additionalType).toBe("http://dbpedia.org/ontology/Dog");
    expect(schemaData.name).toBe("Buddy - Labrador Retriever");
  });

  test("should include all expected schema properties", () => {
    const { container } = render(<DogSchema dog={mockDog} />);

    const script = container.querySelector(
      'script[type="application/ld+json"]',
    );
    const schemaData = JSON.parse(script?.textContent || "{}");

    // Check core properties
    expect(schemaData.name).toBeDefined();
    expect(schemaData.description).toBeDefined();
    expect(schemaData.image).toBe("https://images.rescuedogs.me/buddy.jpg");

    // Check offers (fallback to 500 EUR since no adoption_fees in mock data)
    expect(schemaData.offers).toEqual({
      "@type": "Offer",
      price: "500",
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      priceValidUntil: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    });

    // Check source attribution
    expect(schemaData.isBasedOn).toEqual({
      "@type": "WebPage",
      url: "https://happypaws.org",
      name: "Happy Paws Rescue",
    });

    // Check additionalProperty array
    expect(Array.isArray(schemaData.additionalProperty)).toBe(true);
    expect(schemaData.additionalProperty.length).toBeGreaterThan(0);
  });

  test("should handle minimal dog data gracefully", () => {
    const minimalDog = {
      id: 2,
      name: "Luna",
      organization: {
        name: "City Shelter",
      },
    };

    const { container } = render(<DogSchema dog={minimalDog} />);

    const script = container.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(script).toBeInTheDocument();

    const schemaData = JSON.parse(script?.textContent || "{}");
    expect(schemaData["@type"]).toBe("Product");
    expect(schemaData.name).toBe("Luna");
    expect(schemaData.isBasedOn.name).toBe("City Shelter");
  });

  test("should not render when dog is null or undefined", () => {
    const { container: nullContainer } = render(
      <DogSchema dog={null as any} />,
    );
    expect(nullContainer.querySelector("script")).toBeNull();

    const { container: undefinedContainer } = render(
      <DogSchema dog={undefined as any} />,
    );
    expect(undefinedContainer.querySelector("script")).toBeNull();
  });

  test("should not render when dog has no name", () => {
    const invalidDog = {
      id: 3,
      breed: "Mixed",
      organization: {
        name: "Test Shelter",
      },
    };

    const { container } = render(<DogSchema dog={invalidDog as any} />);
    expect(container.querySelector("script")).toBeNull();
  });
});

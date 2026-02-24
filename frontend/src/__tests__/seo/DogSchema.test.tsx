/**
 * Tests for DogSchema component
 */

import React from "react";
import { render } from "@testing-library/react";
import DogSchema from "../../components/seo/DogSchema";

describe("DogSchema Component", () => {
  const mockDog = {
    id: 1,
    name: "Buddy",
    standardized_breed: "Labrador Retriever",
    status: "available",
    sex: "male",
    age_text: "Adult",
    primary_image_url: "https://images.rescuedogs.me/buddy.jpg",
    description: "Friendly dog looking for a loving home.",
    organization: {
      name: "Happy Paws Rescue",
      website_url: "https://happypaws.org",
      city: "San Francisco",
      country: "USA",
    },
  };

  test("renders JSON-LD script tag with correct type", () => {
    const { container } = render(<DogSchema dog={mockDog} />);
    const script = container.querySelector('script[type="application/ld+json"]');

    expect(script).toBeInTheDocument();
  });

  test("includes Product schema with Dog additionalType", () => {
    const { container } = render(<DogSchema dog={mockDog} />);
    const script = container.querySelector('script[type="application/ld+json"]');
    const schema = JSON.parse(script?.innerHTML || "{}");

    expect(schema["@context"]).toBe("https://schema.org");
    expect(schema["@type"]).toBe("Product");
    expect(schema.additionalType).toBe("http://dbpedia.org/ontology/Dog");
  });

  test("includes dog name and breed in schema", () => {
    const { container } = render(<DogSchema dog={mockDog} />);
    const script = container.querySelector('script[type="application/ld+json"]');
    const schema = JSON.parse(script?.innerHTML || "{}");

    expect(schema.name).toBe("Buddy - Labrador Retriever");
    expect(schema.description).toBe("Friendly dog looking for a loving home.");
    expect(schema.image).toBe("https://images.rescuedogs.me/buddy.jpg");
  });

  test("includes offers with availability when adoption fees exist", () => {
    const dogWithFees = {
      ...mockDog,
      organization: {
        ...mockDog.organization,
        adoption_fees: { usual_fee: 350, currency: "EUR" },
      },
    };
    const { container } = render(<DogSchema dog={dogWithFees} />);
    const script = container.querySelector('script[type="application/ld+json"]');
    const schema = JSON.parse(script?.innerHTML || "{}");

    expect(schema.offers).toBeDefined();
    expect(schema.offers["@type"]).toBe("Offer");
    expect(schema.offers.price).toBe("350");
    expect(schema.offers.priceCurrency).toBe("EUR");
    expect(schema.offers.availability).toBe("https://schema.org/InStock");
  });

  test("omits offers when no adoption fees exist", () => {
    const { container } = render(<DogSchema dog={mockDog} />);
    const script = container.querySelector('script[type="application/ld+json"]');
    const schema = JSON.parse(script?.innerHTML || "{}");

    expect(schema.offers).toBeUndefined();
  });

  test("includes additional properties for age, breed, gender, location", () => {
    const { container } = render(<DogSchema dog={mockDog} />);
    const script = container.querySelector('script[type="application/ld+json"]');
    const schema = JSON.parse(script?.innerHTML || "{}");

    expect(schema.additionalProperty).toBeDefined();
    expect(Array.isArray(schema.additionalProperty)).toBe(true);

    const properties = schema.additionalProperty;
    const ageProperty = properties.find(
      (p: { name: string }) => p.name === "Age"
    );
    const breedProperty = properties.find(
      (p: { name: string }) => p.name === "Breed"
    );
    const genderProperty = properties.find(
      (p: { name: string }) => p.name === "Gender"
    );
    const locationProperty = properties.find(
      (p: { name: string }) => p.name === "Location"
    );

    expect(ageProperty?.value).toBe("Adult");
    expect(breedProperty?.value).toBe("Labrador Retriever");
    expect(genderProperty?.value).toBe("Male");
    expect(locationProperty?.value).toBe("San Francisco, USA");
  });

  test("returns null for invalid dog data", () => {
    const { container } = render(<DogSchema dog={null as unknown as typeof mockDog} />);
    expect(container.firstChild).toBeNull();

    const { container: container2 } = render(
      <DogSchema dog={{ ...mockDog, name: "" }} />
    );
    expect(container2.firstChild).toBeNull();
  });

  test("handles dog with LLM tagline in name", () => {
    const dogWithTagline = {
      ...mockDog,
      llm_tagline: "A Gentle Giant Looking for Love",
    };
    const { container } = render(<DogSchema dog={dogWithTagline} />);
    const script = container.querySelector('script[type="application/ld+json"]');
    const schema = JSON.parse(script?.innerHTML || "{}");

    expect(schema.name).toBe("Buddy: A Gentle Giant Looking for Love");
  });
});

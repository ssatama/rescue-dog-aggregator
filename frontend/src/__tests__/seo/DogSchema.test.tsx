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
    age_min_months: 36,
    age_max_months: 48,
    primary_image_url: "https://images.rescuedogs.me/buddy.jpg",
    description: "Friendly dog looking for a loving home.",
    properties: { display_location: "Snetterton, Norfolk", location_country: "UK" },
    organization: {
      name: "Happy Paws Rescue",
      website_url: "https://happypaws.org",
      city: "London",
      country: "UK",
    },
  };

  test("renders JSON-LD script tag with correct type", () => {
    const { container } = render(<DogSchema dog={mockDog} />);
    const script = container.querySelector('script[type="application/ld+json"]');

    expect(script).toBeInTheDocument();
  });

  test("is an ItemPage about a Dog, not a Product", () => {
    const { container } = render(<DogSchema dog={mockDog} />);
    const script = container.querySelector('script[type="application/ld+json"]');
    const schema = JSON.parse(script?.innerHTML || "{}");

    expect(schema["@context"]).toBe("https://schema.org");
    expect(schema["@type"]).toBe("ItemPage");
    expect(schema.about.additionalType).toBe("http://dbpedia.org/ontology/Dog");
  });

  test("includes dog name and breed in schema", () => {
    const { container } = render(<DogSchema dog={mockDog} />);
    const script = container.querySelector('script[type="application/ld+json"]');
    const schema = JSON.parse(script?.innerHTML || "{}");

    expect(schema.name).toBe("Buddy - Labrador Retriever");
    expect(schema.description).toBe("Friendly dog looking for a loving home.");
    expect(schema.image).toBe("https://images.rescuedogs.me/buddy.jpg");
  });

  test("never states a price, even when the rescue lists a usual fee", () => {
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

    // Fees vary per dog and are the rescue's to state, so no Offer even when listed (#443)
    expect(schema.offers).toBeUndefined();
    expect(JSON.stringify(schema)).not.toContain("price");
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

    // additionalProperty isn't valid on Thing, so the facts are one disambiguating line (#443)
    expect(schema.about.disambiguatingDescription).toBe(
      "Age: 3 years, Breed: Labrador Retriever, Gender: Male, Location: Snetterton, Norfolk, United Kingdom",
    );
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

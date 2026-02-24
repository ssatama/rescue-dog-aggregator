/**
 * Tests for Schema.org adoption fee functionality
 * Following TDD approach - these tests should FAIL initially
 */

import { generatePetSchema } from "../schema";

describe("Schema.org Adoption Fee Functionality", () => {
  const mockDogWithAdoptionFees = {
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
      city: "Berlin",
      country: "DE",
      website_url: "https://happypaws.org",
      adoption_fees: {
        usual_fee: 350,
        currency: "EUR",
      },
    },
  };

  const mockDogWithoutAdoptionFees = {
    id: 2,
    name: "Luna",
    breed: "Mixed",
    status: "available",
    organization: {
      name: "City Shelter",
      city: "London",
      country: "UK",
      website_url: "https://cityshelter.org",
      // No adoption_fees property
    },
  };

  const mockDogWithDifferentCurrency = {
    id: 3,
    name: "Max",
    breed: "Golden Retriever",
    status: "available",
    organization: {
      name: "American Rescue",
      city: "New York",
      country: "US",
      website_url: "https://americanrescue.org",
      adoption_fees: {
        usual_fee: 450,
        currency: "USD",
      },
    },
  };

  const mockDogWithZeroFee = {
    id: 4,
    name: "Rocky",
    breed: "Pit Bull",
    status: "available",
    organization: {
      name: "Free Dogs Rescue",
      city: "Paris",
      country: "FR",
      website_url: "https://freedogs.org",
      adoption_fees: {
        usual_fee: 0,
        currency: "EUR",
      },
    },
  };

  test("should generate valid numeric price with organization adoption_fees", () => {
    const schema = generatePetSchema(mockDogWithAdoptionFees);

    expect(schema.offers).toEqual({
      "@type": "Offer",
      price: "350",
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      priceValidUntil: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
    });
  });

  test("should omit offers without adoption_fees", () => {
    const schema = generatePetSchema(mockDogWithoutAdoptionFees);

    expect(schema.offers).toBeUndefined();
  });

  test("should handle different currencies correctly", () => {
    const schema = generatePetSchema(mockDogWithDifferentCurrency);

    expect(schema.offers).toEqual({
      "@type": "Offer",
      price: "450",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      priceValidUntil: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    });
  });

  test("should generate priceValidUntil approximately 1 year from now", () => {
    const schema = generatePetSchema(mockDogWithAdoptionFees);
    const priceValidUntil = new Date(schema.offers.priceValidUntil);
    const now = new Date();
    const oneYearFromNow = new Date(
      now.getFullYear() + 1,
      now.getMonth(),
      now.getDate(),
    );

    // Allow some tolerance (within 1 day)
    const timeDiff = Math.abs(
      priceValidUntil.getTime() - oneYearFromNow.getTime(),
    );
    const oneDayInMs = 24 * 60 * 60 * 1000;

    expect(timeDiff).toBeLessThan(oneDayInMs);
  });

  test("should omit offers with invalid adoption_fees data", () => {
    const dogWithInvalidFees = {
      ...mockDogWithAdoptionFees,
      organization: {
        ...mockDogWithAdoptionFees.organization,
        adoption_fees: {
          usual_fee: null, // Invalid fee
          currency: "EUR",
        },
      },
    };

    const schema = generatePetSchema(dogWithInvalidFees);

    expect(schema.offers).toBeUndefined();
  });

  test("should convert numeric price to string", () => {
    const schema = generatePetSchema(mockDogWithAdoptionFees);

    expect(typeof schema.offers.price).toBe("string");
    expect(schema.offers.price).toBe("350");
    expect(schema.offers.price).not.toBe(350); // Should not be a number
  });
});

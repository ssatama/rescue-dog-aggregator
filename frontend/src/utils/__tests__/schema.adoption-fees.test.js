/**
 * Dogs are not priced products (#443): adoption fees vary per dog and are set by each
 * rescue, so the schema never states a price, even when the organization lists a usual fee.
 */

import { generatePetSchema } from "../schema";

describe("Schema.org adoption fees", () => {
  const dogWithFees = {
    id: 1,
    name: "Buddy",
    slug: "buddy-labrador-retriever-1",
    standardized_breed: "Labrador Retriever",
    status: "available",
    organization: {
      name: "Happy Paws Rescue",
      country: "DE",
      website_url: "https://happypaws.org",
      adoption_fees: { usual_fee: 350, currency: "EUR" },
    },
  };

  it("never emits an Offer or a price", () => {
    const json = JSON.stringify(generatePetSchema(dogWithFees));

    expect(json).not.toContain("Offer");
    expect(json).not.toContain("price");
    expect(json).not.toContain('"Product"');
  });
});

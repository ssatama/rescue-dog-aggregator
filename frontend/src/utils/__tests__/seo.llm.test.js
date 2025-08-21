/**
 * Tests for LLM-enhanced SEO generation
 */

import { generateSEODescription } from "../descriptionQuality";
import { generatePetSchema } from "../schema";

describe("generateSEODescription with LLM data", () => {
  it("should prioritize LLM description when available", () => {
    const dog = {
      name: "Max",
      llm_description:
        "Max is an energetic Border Collie who loves to play fetch and learn new tricks.",
      description: "Regular description",
      organization: {
        name: "Happy Tails Rescue",
        city: "Berlin",
        country: "Germany",
      },
    };

    const result = generateSEODescription(dog);

    expect(result).toBe(
      "Max is an energetic Border Collie who loves to play fetch and learn new tricks. Available from Happy Tails Rescue in Berlin, Germany.",
    );
  });

  it("should fall back to quality description when no LLM data", () => {
    const dog = {
      name: "Max",
      // Provide a quality description from properties that will pass quality check
      properties: {
        description:
          "Max is a wonderful dog who has been with us for several months now. He came to us as a stray but has quickly adapted to life in the shelter. He is very friendly with people and loves to play with other dogs. His favorite activities include long walks and playing fetch. He would make a great addition to any family looking for a loyal and energetic companion. Max is house-trained and knows basic commands.",
      },
      organization: {
        name: "Happy Tails Rescue",
        city: "Berlin",
        country: "Germany",
      },
    };

    const result = generateSEODescription(dog);

    // Should use the quality description and add organization info
    expect(result).toContain("Max is a wonderful dog");
    expect(result).toContain(
      "Available from Happy Tails Rescue in Berlin, Germany",
    );
  });

  it("should return null when no quality content available", () => {
    const dog = {
      name: "Max",
      // Provide a low-quality description that won't pass the quality check
      description: "Dog for adoption",
    };

    const result = generateSEODescription(dog);

    expect(result).toBeNull();
  });

  it("should handle missing organization data gracefully", () => {
    const dog = {
      name: "Max",
      llm_description: "Max is a friendly dog.",
    };

    const result = generateSEODescription(dog);

    expect(result).toBe("Max is a friendly dog.");
  });

  it("should handle organization with partial location data", () => {
    const dog = {
      name: "Buddy",
      llm_description: "Buddy is a playful pup.",
      organization: {
        name: "Animal Rescue",
        country: "Spain", // Only country, no city
      },
    };

    const result = generateSEODescription(dog);

    expect(result).toBe(
      "Buddy is a playful pup. Available from Animal Rescue in Spain.",
    );
  });
});

describe("generatePetSchema with LLM data", () => {
  it("should use LLM description in schema when available", () => {
    const dog = {
      name: "Luna",
      llm_description: "Luna is a gentle Golden Retriever who adores children.",
      llm_tagline: "The perfect family companion!",
      description: "Old description",
      properties: {
        description: "Properties description",
      },
      standardized_breed: "Golden Retriever",
    };

    const schema = generatePetSchema(dog);

    expect(schema).toMatchObject({
      "@type": "Product",
      name: "Luna: The perfect family companion!",
      description: "Luna is a gentle Golden Retriever who adores children.",
    });
  });

  it("should use LLM tagline in schema name when available", () => {
    const dog = {
      name: "Rex",
      llm_tagline: "Your loyal adventure buddy!",
      standardized_breed: "German Shepherd",
    };

    const schema = generatePetSchema(dog);

    expect(schema.name).toBe("Rex: Your loyal adventure buddy!");
  });

  it("should fall back to breed when no LLM tagline", () => {
    const dog = {
      name: "Rex",
      standardized_breed: "German Shepherd",
    };

    const schema = generatePetSchema(dog);

    expect(schema.name).toBe("Rex - German Shepherd");
  });

  it("should combine existing descriptions when no LLM description", () => {
    const dog = {
      name: "Buddy",
      description: "First description.",
      properties: {
        description: "Second description.",
      },
      breed: "Mixed",
    };

    const schema = generatePetSchema(dog);

    expect(schema.description).toBe("First description. Second description.");
  });

  it("should handle missing data gracefully", () => {
    const dog = {
      name: "Charlie",
    };

    const schema = generatePetSchema(dog);

    expect(schema).toMatchObject({
      "@type": "Product",
      name: "Charlie",
    });
    expect(schema.description).toBeUndefined();
  });
});

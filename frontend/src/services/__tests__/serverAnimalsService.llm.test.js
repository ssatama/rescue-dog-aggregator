/**
 * Tests for LLM-enhanced content fetching in serverAnimalsService
 */

import {
  getEnhancedDogContent,
  getAnimalBySlug,
  clearCache,
} from "../serverAnimalsService";

// Mock fetch globally
global.fetch = jest.fn();

// Mock cache function
jest.mock("react", () => ({
  cache: (fn) => fn,
}));

describe("getEnhancedDogContent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearCache();
    global.fetch.mockReset();
  });

  it("should return enhanced content when API returns valid data", async () => {
    const mockResponse = [
      {
        id: 123,
        description: "A playful and energetic dog who loves adventures.",
        tagline: "Your perfect hiking companion!",
        has_enhanced_data: true,
      },
    ];

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await getEnhancedDogContent(123);

    expect(result).toEqual({
      description: "A playful and energetic dog who loves adventures.",
      tagline: "Your perfect hiking companion!",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(
        "/api/animals/enhanced/detail-content?animal_ids=123",
      ),
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("should return null when API returns no enhanced data", async () => {
    const mockResponse = [
      {
        id: 123,
        description: null,
        tagline: null,
        has_enhanced_data: false,
      },
    ];

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await getEnhancedDogContent(123);

    expect(result).toBeNull();
  });

  it("should return null when API call fails", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const result = await getEnhancedDogContent(123);

    expect(result).toBeNull();
  });

  it("should return null when fetch throws an error", async () => {
    global.fetch.mockRejectedValueOnce(new Error("Network error"));

    const result = await getEnhancedDogContent(123);

    expect(result).toBeNull();
  });

  it("should return null when animalId is not provided", async () => {
    const result = await getEnhancedDogContent(null);

    expect(result).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe("getAnimalBySlug with LLM enhancement", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockReset();
  });

  it("should merge LLM data into animal object when available", async () => {
    const mockAnimal = {
      id: 123,
      name: "Bella",
      breed: "Labrador",
      slug: "bella-123",
    };

    const mockEnhanced = [
      {
        id: 123,
        description: "Bella is a gentle soul who loves cuddles.",
        tagline: "Your new best friend awaits!",
        has_enhanced_data: true,
      },
    ];

    // First call for animal data
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnimal,
    });

    // Second call for enhanced data
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockEnhanced,
    });

    const result = await getAnimalBySlug("bella-123");

    expect(result).toEqual({
      id: 123,
      name: "Bella",
      breed: "Labrador",
      slug: "bella-123",
      llm_description: "Bella is a gentle soul who loves cuddles.",
      llm_tagline: "Your new best friend awaits!",
      has_llm_data: true,
    });
  });

  it("should return animal without LLM data when enhancement fails", async () => {
    const mockAnimal = {
      id: 123,
      name: "Bella",
      breed: "Labrador",
      slug: "bella-123",
    };

    // First call for animal data
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnimal,
    });

    // Second call for enhanced data fails
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const result = await getAnimalBySlug("bella-123");

    expect(result).toEqual({
      id: 123,
      name: "Bella",
      breed: "Labrador",
      slug: "bella-123",
    });
  });

  it("should handle animal not found error", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    await expect(getAnimalBySlug("non-existent")).rejects.toThrow(
      "Animal not found",
    );
  });
});

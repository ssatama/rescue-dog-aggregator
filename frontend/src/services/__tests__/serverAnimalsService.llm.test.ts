import {
  getEnhancedDogContent,
  getAnimalBySlug,
  clearCache,
} from "../serverAnimalsService";

jest.mock("../../utils/logger", () => ({
  logger: { log: jest.fn(), error: jest.fn(), warn: jest.fn() },
  reportError: jest.fn(),
}));

global.fetch = jest.fn();

describe("getEnhancedDogContent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearCache();
    (global.fetch as jest.Mock).mockReset();
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

    (global.fetch as jest.Mock).mockResolvedValueOnce({
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

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await getEnhancedDogContent(123);

    expect(result).toBeNull();
  });

  it("should return null when API call fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const result = await getEnhancedDogContent(123);

    expect(result).toBeNull();
  });

  it("should return null when fetch throws an error", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error("Network error"),
    );

    const result = await getEnhancedDogContent(123);

    expect(result).toBeNull();
  });

  it("should return null when animalId is not provided", async () => {
    const result = await getEnhancedDogContent(null);

    expect(result).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("should return null when response is malformed", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => "not an array",
    });

    const result = await getEnhancedDogContent(123);

    expect(result).toBeNull();
  });
});

describe("getAnimalBySlug with LLM enhancement", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
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

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnimal,
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEnhanced,
    });

    const result = await getAnimalBySlug("bella-123");

    expect(result).toEqual(
      expect.objectContaining({
        id: 123,
        name: "Bella",
        breed: "Labrador",
        slug: "bella-123",
        llm_description: "Bella is a gentle soul who loves cuddles.",
        llm_tagline: "Your new best friend awaits!",
        has_llm_data: true,
      }),
    );
  });

  it("should return animal without LLM data when enhancement fails", async () => {
    const mockAnimal = {
      id: 123,
      name: "Bella",
      breed: "Labrador",
      slug: "bella-123",
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnimal,
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const result = await getAnimalBySlug("bella-123");

    expect(result).toEqual(
      expect.objectContaining({
        id: 123,
        name: "Bella",
        breed: "Labrador",
        slug: "bella-123",
      }),
    );
    expect(result).not.toBeNull();
    expect(result!.llm_description).toBeUndefined();
  });

  it("should return null for animal not found", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const result = await getAnimalBySlug("non-existent");
    expect(result).toBeNull();
  });

  it("should throw for non-404 HTTP errors", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await expect(getAnimalBySlug("some-slug")).rejects.toThrow(
      "Failed to fetch animal: HTTP 500",
    );
  });
});

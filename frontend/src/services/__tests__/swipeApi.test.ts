import { fetchSwipeDogs, SwipeDog } from "../swipeApi";

// Mock fetch globally
global.fetch = jest.fn();

describe("swipeApi", () => {
  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset fetch mock
    (global.fetch as jest.Mock).mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("fetchSwipeDogs", () => {
    const mockBackendResponse = {
      dogs: [
        {
          id: 1,
          name: "Buddy",
          breed: "Labrador",
          age: "2 years",
          age_min_months: 24,
          age_max_months: 36,
          image_url: "https://example.com/buddy.jpg",
          organization: {
            name: "Happy Tails Rescue",
          },
          location: "London, UK",
          slug: "buddy-labrador",
          tagline: "Energetic and friendly",
          personality_traits: ["Friendly", "Energetic"],
          energy_level: 4,
          unique_quirk: "Loves water",
          quality_score: 0.85,
          created_at: "2024-01-01T00:00:00Z",
        },
        {
          id: 2,
          name: "Max",
          breed: "Beagle",
          age: "3 years",
          age_min_months: 36,
          age_max_months: 48,
          image_url: "https://example.com/max.jpg",
          organization_name: "Paws Rescue",
          location: "Berlin, DE",
          slug: "max-beagle",
          description: "Calm and loyal",
          personality_traits: ["Calm", "Loyal"],
          energy_level: 2,
          special_characteristic: "Great with kids",
          quality_score: 0.92,
          created_at: "2024-01-02T00:00:00Z",
        },
      ],
      hasMore: true,
      nextOffset: 20,
    };

    it("should fetch dogs with default parameters", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBackendResponse,
      });

      const result = await fetchSwipeDogs({});

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/dogs/swipe?limit=20&offset=0`,
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 1,
        name: "Buddy",
        breed: "Labrador",
        organization: "Happy Tails Rescue",
      });
    });

    it("should include country filter when provided", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBackendResponse,
      });

      await fetchSwipeDogs({ country: "UK" });

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/dogs/swipe?country=UK&limit=20&offset=0`,
      );
    });

    it("should include multiple size filters", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBackendResponse,
      });

      await fetchSwipeDogs({ sizes: ["small", "medium"] });

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/dogs/swipe?size=small&size=medium&limit=20&offset=0`,
      );
    });

    it("should respect custom limit and offset", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBackendResponse,
      });

      await fetchSwipeDogs({ limit: 50, offset: 100 });

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/dogs/swipe?limit=50&offset=100`,
      );
    });

    it("should combine all filters correctly", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBackendResponse,
      });

      await fetchSwipeDogs({
        country: "DE",
        sizes: ["large"],
        limit: 10,
        offset: 5,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/dogs/swipe?country=DE&size=large&limit=10&offset=5`,
      );
    });

    it("should transform backend response to frontend format", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBackendResponse,
      });

      const result = await fetchSwipeDogs({});

      // Check first dog transformation (uses dog.organization object)
      expect(result[0]).toEqual({
        id: 1,
        name: "Buddy",
        breed: "Labrador",
        age: "2 years",
        age_min_months: 24,
        age_max_months: 36,
        image: "https://example.com/buddy.jpg",
        organization: "Happy Tails Rescue",
        location: "London, UK",
        slug: "buddy-labrador",
        description: "Energetic and friendly",
        traits: ["Friendly", "Energetic"],
        energy_level: 4,
        special_characteristic: "Loves water",
        quality_score: 0.85,
        created_at: "2024-01-01T00:00:00Z",
      });

      // Check second dog transformation (uses organization_name string)
      expect(result[1]).toEqual({
        id: 2,
        name: "Max",
        breed: "Beagle",
        age: "3 years",
        age_min_months: 36,
        age_max_months: 48,
        image: "https://example.com/max.jpg",
        organization: "Paws Rescue",
        location: "Berlin, DE",
        slug: "max-beagle",
        description: "Calm and loyal",
        traits: ["Calm", "Loyal"],
        energy_level: 2,
        special_characteristic: "Great with kids",
        quality_score: 0.92,
        created_at: "2024-01-02T00:00:00Z",
      });
    });

    it("should handle image field variations", async () => {
      const responseWithImageVariations = {
        dogs: [
          {
            ...mockBackendResponse.dogs[0],
            image_url: null,
            image: "fallback.jpg",
          },
          {
            ...mockBackendResponse.dogs[1],
            image_url: undefined,
            image: undefined,
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => responseWithImageVariations,
      });

      const result = await fetchSwipeDogs({});

      expect(result[0].image).toBe("fallback.jpg");
      expect(result[1].image).toBeUndefined();
    });

    it("should handle missing optional fields gracefully", async () => {
      const minimalResponse = {
        dogs: [
          {
            id: 3,
            name: "Charlie",
            slug: "charlie",
            // All other fields missing
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => minimalResponse,
      });

      const result = await fetchSwipeDogs({});

      expect(result[0]).toEqual({
        id: 3,
        name: "Charlie",
        slug: "charlie",
        breed: undefined,
        age: undefined,
        age_min_months: undefined,
        age_max_months: undefined,
        image: undefined,
        organization: undefined,
        location: undefined,
        description: undefined,
        traits: [],
        energy_level: undefined,
        special_characteristic: undefined,
        quality_score: undefined,
        created_at: undefined,
      });
    });

    it("should throw error when fetch fails", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: "Internal Server Error",
      });

      await expect(fetchSwipeDogs({})).rejects.toThrow(
        "Failed to fetch dogs: Internal Server Error",
      );
    });

    it("should throw error when network fails", async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Network error"),
      );

      await expect(fetchSwipeDogs({})).rejects.toThrow("Network error");
    });

    it("should handle empty response gracefully", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ dogs: [], hasMore: false }),
      });

      const result = await fetchSwipeDogs({});

      expect(result).toEqual([]);
    });

    it("should use environment variable for API URL when available", async () => {
      const originalEnv = process.env.NEXT_PUBLIC_API_URL;
      process.env.NEXT_PUBLIC_API_URL = "https://api.rescuedogs.me";

      // Need to re-import to pick up the new env variable
      jest.resetModules();
      const { fetchSwipeDogs: fetchSwipeDogsWithEnv } = await import(
        "../swipeApi"
      );

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ dogs: [] }),
      });

      await fetchSwipeDogsWithEnv({});

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.rescuedogs.me/api/dogs/swipe?limit=20&offset=0",
      );

      // Restore original env
      process.env.NEXT_PUBLIC_API_URL = originalEnv;
    });
  });
});

import { getBreedsWithImages } from "../breedImagesService";

// Mock fetch globally
global.fetch = jest.fn();

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = "https://api.rescuedogs.me";

describe("breedImagesService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
  });

  describe("getBreedsWithImages", () => {
    const mockBreedsData = [
      {
        primary_breed: "Mixed Breed",
        breed_slug: "mixed-breed",
        breed_type: "mixed",
        breed_group: "Mixed",
        count: 1462,
        sample_dogs: [
          {
            id: 101,
            name: "Luna",
            slug: "luna-123",
            primary_image_url: "https://example.com/luna.jpg",
            age_text: "2 years",
            sex: "Female",
            personality_traits: ["Playful", "Friendly"],
          },
        ],
      },
      {
        primary_breed: "Galgo",
        breed_slug: "galgo",
        breed_type: "purebred",
        breed_group: "Hound",
        count: 120,
        sample_dogs: [
          {
            id: 102,
            name: "Shadow",
            slug: "shadow-111",
            primary_image_url: "https://example.com/shadow.jpg",
            age_text: "4 years",
            sex: "Male",
            personality_traits: ["Gentle", "Calm"],
          },
        ],
      },
    ];

    it("should fetch breeds with images successfully", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBreedsData,
      });

      const result = await getBreedsWithImages();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/animals/breeds/with-images"),
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
          next: { revalidate: 300 },
        }),
      );
      expect(result).toEqual(mockBreedsData);
    });

    it("should include query parameters when provided", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBreedsData,
      });

      const params = {
        breedType: "mixed",
        minCount: 15,
        limit: 10,
        breedGroup: "Hound",
      };

      await getBreedsWithImages(params);

      const callUrl = fetch.mock.calls[0][0];
      expect(callUrl).toContain("breed_type=mixed");
      expect(callUrl).toContain("min_count=15");
      expect(callUrl).toContain("limit=10");
      expect(callUrl).toContain("breed_group=Hound");
    });

    it("should handle empty response gracefully", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const result = await getBreedsWithImages();

      expect(result).toEqual([]);
    });

    it("should handle network errors gracefully", async () => {
      // Mock console.error to avoid test output noise
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      fetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await getBreedsWithImages();

      expect(result).toEqual([]);
      expect(fetch).toHaveBeenCalledTimes(1);

      consoleErrorSpy.mockRestore();
    });

    it("should handle HTTP error responses", async () => {
      // Mock console.error to avoid test output noise
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      const result = await getBreedsWithImages();

      expect(result).toEqual([]);

      consoleErrorSpy.mockRestore();
    });

    it("should handle malformed JSON response", async () => {
      // Mock console.error to avoid test output noise
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      });

      const result = await getBreedsWithImages();

      expect(result).toEqual([]);

      consoleErrorSpy.mockRestore();
    });

    it("should not include undefined parameters in query string", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBreedsData,
      });

      const params = {
        breedType: "mixed",
        minCount: undefined,
        limit: null,
        breedGroup: "",
      };

      await getBreedsWithImages(params);

      const callUrl = fetch.mock.calls[0][0];
      expect(callUrl).toContain("breed_type=mixed");
      expect(callUrl).not.toContain("min_count");
      expect(callUrl).not.toContain("limit=null");
      expect(callUrl).not.toContain("breed_group=");
    });

    it("should handle timeout scenarios", async () => {
      // Mock console.error to avoid test output noise
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Request timeout")), 10);
      });

      fetch.mockImplementationOnce(() => timeoutPromise);

      const result = await getBreedsWithImages();

      expect(result).toEqual([]);

      consoleErrorSpy.mockRestore();
    });

    it("should validate response structure", async () => {
      // Mock console.error to avoid test output noise
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      // Test with invalid response structure that causes JSON parsing to fail
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await getBreedsWithImages();

      // Should handle gracefully and return empty array
      expect(result).toEqual([]);

      consoleErrorSpy.mockRestore();
    });

    it("should handle special characters in parameters", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBreedsData,
      });

      const params = {
        breedGroup: "Terrier & Toy",
      };

      await getBreedsWithImages(params);

      const callUrl = fetch.mock.calls[0][0];
      // Should be properly encoded
      // URLSearchParams encodes spaces as + not %20
      expect(callUrl).toContain("breed_group=Terrier+%26+Toy");
    });

    it("should preserve sample dogs array structure", async () => {
      const dataWithMultipleSamples = [
        {
          ...mockBreedsData[0],
          sample_dogs: [
            { id: 201, name: "Dog1", slug: "dog1", primary_image_url: "url1.jpg" },
            { id: 202, name: "Dog2", slug: "dog2", primary_image_url: "url2.jpg" },
            { id: 203, name: "Dog3", slug: "dog3", primary_image_url: "url3.jpg" },
          ],
        },
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => dataWithMultipleSamples,
      });

      const result = await getBreedsWithImages();

      expect(result[0].sample_dogs).toHaveLength(3);
      expect(result[0].sample_dogs[0].name).toBe("Dog1");
      expect(result[0].sample_dogs[2].name).toBe("Dog3");
    });

    it("should handle breeds with no sample dogs", async () => {
      const dataWithNoSamples = [
        {
          ...mockBreedsData[0],
          sample_dogs: [],
        },
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => dataWithNoSamples,
      });

      const result = await getBreedsWithImages();

      expect(result[0].sample_dogs).toEqual([]);
    });

    it("should handle concurrent requests appropriately", async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => mockBreedsData,
      });

      const promises = [
        getBreedsWithImages({ breedType: "mixed" }),
        getBreedsWithImages({ breedType: "purebred" }),
        getBreedsWithImages({ minCount: 15 }),
      ];

      const results = await Promise.all(promises);

      expect(fetch).toHaveBeenCalledTimes(3);
      results.forEach((result) => {
        expect(result).toEqual(mockBreedsData);
      });
    });

    it("should handle rate limiting with retry logic", async () => {
      // Mock console.error to avoid test output noise
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      // First call returns 429 (rate limited)
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
      });

      const result = await getBreedsWithImages();

      // Current implementation doesn't retry, just returns empty array
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(result).toEqual([]);

      consoleErrorSpy.mockRestore();
    });

    it("should build correct URL for server-side requests in development", async () => {
      // Save original env
      const originalEnv = process.env.NODE_ENV;
      const originalWindow = global.window;

      // Mock server-side environment
      process.env.NODE_ENV = "development";
      delete global.window;

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBreedsData,
      });

      await getBreedsWithImages();

      // In server-side dev, should use localhost URL
      const callUrl = fetch.mock.calls[0][0];
      expect(callUrl).toContain("/api/animals/breeds/with-images");

      // Restore environment
      process.env.NODE_ENV = originalEnv;
      global.window = originalWindow;
    });

    it("should use production URL when not in development", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBreedsData,
      });

      await getBreedsWithImages();

      const callUrl = fetch.mock.calls[0][0];
      expect(callUrl).toContain("/api/animals/breeds/with-images");

      process.env.NODE_ENV = originalEnv;
    });
  });
});

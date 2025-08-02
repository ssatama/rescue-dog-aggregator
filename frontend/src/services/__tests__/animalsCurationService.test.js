import { getAnimalsByCuration } from "../animalsService";
import { get } from "../../utils/api";
import { logger } from "../../utils/logger";

// Mock the api utility and logger
jest.mock("../../utils/api");
jest.mock("../../utils/logger");

const mockGet = get;
const mockLogger = logger;

describe("getAnimalsByCuration", () => {
  beforeEach(() => {
    mockGet.mockClear();
    mockLogger.log.mockClear();
  });

  const mockDogs = [
    {
      id: "1",
      name: "Luna",
      breed: "Mixed",
      primary_image_url: "https://example.com/luna.jpg",
      organization: {
        name: "Pets in Turkey",
        city: "Izmir",
        country: "Turkey",
      },
      created_at: "2025-06-15T10:00:00Z",
    },
    {
      id: "2",
      name: "Max",
      breed: "German Shepherd",
      primary_image_url: "https://example.com/max.jpg",
      organization: {
        name: "Berlin Rescue",
        city: "Berlin",
        country: "Germany",
      },
      created_at: "2025-06-10T10:00:00Z",
    },
    {
      id: "3",
      name: "Bella",
      breed: "Golden Retriever",
      primary_image_url: "https://example.com/bella.jpg",
      organization: { name: "Happy Tails", city: "Munich", country: "Germany" },
      created_at: "2025-06-12T10:00:00Z",
    },
    {
      id: "4",
      name: "Rocky",
      breed: "Beagle",
      primary_image_url: "https://example.com/rocky.jpg",
      organization: {
        name: "Tierschutz EU",
        city: "Vienna",
        country: "Austria",
      },
      created_at: "2025-06-14T10:00:00Z",
    },
  ];

  describe("Function Existence and Basic Functionality", () => {
    test("function exists and is callable", () => {
      expect(typeof getAnimalsByCuration).toBe("function");
    });

    test("returns a promise", () => {
      mockGet.mockResolvedValue(mockDogs);
      const result = getAnimalsByCuration("recent", 4);
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe("API Call Parameters", () => {
    test("calls API with correct endpoint and parameters for recent curation", async () => {
      mockGet.mockResolvedValue(mockDogs);

      await getAnimalsByCuration("recent", 4);

      expect(mockGet).toHaveBeenCalledWith("/api/animals", {
        curation_type: "recent",
        limit: 4,
        animal_type: "dog",
        status: "available",
      });
    });

    test("calls API with correct parameters for diverse curation", async () => {
      mockGet.mockResolvedValue(mockDogs);

      await getAnimalsByCuration("diverse", 4);

      expect(mockGet).toHaveBeenCalledWith("/api/animals", {
        curation_type: "diverse",
        limit: 4,
        animal_type: "dog",
        status: "available",
      });
    });

    test("uses default limit of 4 when not specified", async () => {
      mockGet.mockResolvedValue(mockDogs);

      await getAnimalsByCuration("recent");

      expect(mockGet).toHaveBeenCalledWith("/api/animals", {
        curation_type: "recent",
        limit: 4,
        animal_type: "dog",
        status: "available",
      });
    });

    test("accepts custom limit parameter", async () => {
      mockGet.mockResolvedValue(mockDogs.slice(0, 8));

      await getAnimalsByCuration("diverse", 8);

      expect(mockGet).toHaveBeenCalledWith("/api/animals", {
        curation_type: "diverse",
        limit: 8,
        animal_type: "dog",
        status: "available",
      });
    });

    test("always includes animal_type as dog", async () => {
      mockGet.mockResolvedValue(mockDogs);

      await getAnimalsByCuration("recent", 4);

      const callArgs = mockGet.mock.calls[0][1];
      expect(callArgs.animal_type).toBe("dog");
    });

    test("always includes status as available", async () => {
      mockGet.mockResolvedValue(mockDogs);

      await getAnimalsByCuration("recent", 4);

      const callArgs = mockGet.mock.calls[0][1];
      expect(callArgs.status).toBe("available");
    });
  });

  describe("Curation Type Validation", () => {
    test("accepts valid curation type: recent", async () => {
      mockGet.mockResolvedValue(mockDogs);

      await expect(getAnimalsByCuration("recent", 4)).resolves.toBeDefined();

      const callArgs = mockGet.mock.calls[0][1];
      expect(callArgs.curation_type).toBe("recent");
    });

    test("accepts valid curation type: diverse", async () => {
      mockGet.mockResolvedValue(mockDogs);

      await expect(getAnimalsByCuration("diverse", 4)).resolves.toBeDefined();

      const callArgs = mockGet.mock.calls[0][1];
      expect(callArgs.curation_type).toBe("diverse");
    });

    test("accepts valid curation type: random", async () => {
      mockGet.mockResolvedValue(mockDogs);

      await expect(getAnimalsByCuration("random", 4)).resolves.toBeDefined();

      const callArgs = mockGet.mock.calls[0][1];
      expect(callArgs.curation_type).toBe("random");
    });

    test("accepts valid curation type: recent_with_fallback", async () => {
      mockGet.mockResolvedValue(mockDogs);

      await expect(
        getAnimalsByCuration("recent_with_fallback", 4),
      ).resolves.toBeDefined();

      const callArgs = mockGet.mock.calls[0][1];
      expect(callArgs.curation_type).toBe("recent_with_fallback");
    });

    test("throws error for invalid curation type", async () => {
      await expect(getAnimalsByCuration("invalid", 4)).rejects.toThrow(
        "Invalid curation type. Must be one of: recent, recent_with_fallback, diverse, random",
      );

      expect(mockGet).not.toHaveBeenCalled();
    });

    test("throws error when curation type is missing", async () => {
      await expect(getAnimalsByCuration(undefined, 4)).rejects.toThrow(
        "Curation type is required",
      );

      expect(mockGet).not.toHaveBeenCalled();
    });
  });

  describe("Response Handling", () => {
    test("returns array of dogs from API response", async () => {
      mockGet.mockResolvedValue(mockDogs);

      const result = await getAnimalsByCuration("recent", 4);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(mockDogs);
      expect(result).toHaveLength(4);
    });

    test("returns empty array when API returns empty response", async () => {
      mockGet.mockResolvedValue([]);

      const result = await getAnimalsByCuration("recent", 4);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    test("handles API response with fewer dogs than requested", async () => {
      const partialDogs = mockDogs.slice(0, 2);
      mockGet.mockResolvedValue(partialDogs);

      const result = await getAnimalsByCuration("recent", 4);

      expect(result).toEqual(partialDogs);
      expect(result).toHaveLength(2);
    });
  });

  describe("Error Handling", () => {
    test("propagates API errors", async () => {
      const apiError = new Error("API Server Error");
      mockGet.mockRejectedValue(apiError);

      await expect(getAnimalsByCuration("recent", 4)).rejects.toThrow(
        "API Server Error",
      );
    });

    test("handles network errors gracefully", async () => {
      const networkError = new Error("Network Error");
      mockGet.mockRejectedValue(networkError);

      await expect(getAnimalsByCuration("diverse", 4)).rejects.toThrow(
        "Network Error",
      );
    });

    test("handles invalid limit parameter", async () => {
      await expect(getAnimalsByCuration("recent", -1)).rejects.toThrow(
        "Limit must be a positive number",
      );

      expect(mockGet).not.toHaveBeenCalled();
    });

    test("handles zero limit parameter", async () => {
      await expect(getAnimalsByCuration("recent", 0)).rejects.toThrow(
        "Limit must be a positive number",
      );

      expect(mockGet).not.toHaveBeenCalled();
    });

    test("handles non-numeric limit parameter", async () => {
      await expect(getAnimalsByCuration("recent", "invalid")).rejects.toThrow(
        "Limit must be a positive number",
      );

      expect(mockGet).not.toHaveBeenCalled();
    });
  });

  describe("Logging", () => {
    test("logs function call with parameters", async () => {
      mockGet.mockResolvedValue(mockDogs);

      await getAnimalsByCuration("recent", 4);

      expect(mockLogger.log).toHaveBeenCalledWith(
        "Fetching animals with curation type: recent, limit: 4",
      );
    });

    test("logs different curation types correctly", async () => {
      mockGet.mockResolvedValue(mockDogs);

      await getAnimalsByCuration("diverse", 8);

      expect(mockLogger.log).toHaveBeenCalledWith(
        "Fetching animals with curation type: diverse, limit: 8",
      );
    });

    test("logs API call parameters", async () => {
      mockGet.mockResolvedValue(mockDogs);

      await getAnimalsByCuration("recent", 4);

      expect(mockLogger.log).toHaveBeenCalledWith("API call parameters:", {
        curation_type: "recent",
        limit: 4,
        animal_type: "dog",
        status: "available",
      });
    });
  });

  describe("Data Structure Validation", () => {
    test("validates that returned dogs have required fields", async () => {
      mockGet.mockResolvedValue(mockDogs);

      const result = await getAnimalsByCuration("recent", 4);

      result.forEach((dog) => {
        expect(dog).toHaveProperty("id");
        expect(dog).toHaveProperty("name");
        expect(typeof dog.id).toBe("string");
        expect(typeof dog.name).toBe("string");
      });
    });

    test("handles dogs with optional fields gracefully", async () => {
      const dogsWithMissingFields = [
        {
          id: "1",
          name: "Luna",
          // Missing other fields
        },
        {
          id: "2",
          name: "Max",
          breed: "German Shepherd",
          // Missing image and organization
        },
      ];
      mockGet.mockResolvedValue(dogsWithMissingFields);

      const result = await getAnimalsByCuration("recent", 2);

      expect(result).toEqual(dogsWithMissingFields);
      expect(result).toHaveLength(2);
    });
  });

  describe("Performance and Efficiency", () => {
    test("makes only one API call per function invocation", async () => {
      mockGet.mockResolvedValue(mockDogs);

      await getAnimalsByCuration("recent", 4);

      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    test("does not cache results between calls", async () => {
      mockGet.mockResolvedValue(mockDogs);

      await getAnimalsByCuration("recent", 4);
      await getAnimalsByCuration("diverse", 4);

      expect(mockGet).toHaveBeenCalledTimes(2);
    });
  });
});

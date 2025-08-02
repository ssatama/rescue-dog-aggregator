// TDD Red Phase: Failing tests for Related Dogs API integration
import { getRelatedDogs } from "../relatedDogsService";
import { getAnimals } from "../animalsService";

// Mock the animalsService
jest.mock("../animalsService");

describe("RelatedDogsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getRelatedDogs", () => {
    it("should fetch dogs from the same organization excluding current dog", async () => {
      // Arrange
      const currentDogId = 123;
      const organizationId = 456;
      const mockRelatedDogs = [
        {
          id: 124,
          name: "Luna",
          breed: "Mixed Breed",
          age_text: "2 years",
          primary_image_url: "https://example.com/luna.jpg",
          organization_id: 456,
        },
        {
          id: 125,
          name: "Max",
          breed: "Terrier Mix",
          age_text: "4 years",
          primary_image_url: "https://example.com/max.jpg",
          organization_id: 456,
        },
      ];

      getAnimals.mockResolvedValue(mockRelatedDogs);

      // Act
      const result = await getRelatedDogs(organizationId, currentDogId);

      // Assert
      expect(getAnimals).toHaveBeenCalledWith({
        organization_id: organizationId,
        limit: 4,
        status: "available",
      });
      expect(result).toEqual(
        mockRelatedDogs.filter((dog) => dog.id !== currentDogId),
      );
    });

    it("should exclude current dog from results", async () => {
      // Arrange
      const currentDogId = 124;
      const organizationId = 456;
      const mockDogs = [
        { id: 123, name: "Other Dog", organization_id: 456 },
        { id: 124, name: "Current Dog", organization_id: 456 }, // This should be excluded
        { id: 125, name: "Another Dog", organization_id: 456 },
      ];

      getAnimals.mockResolvedValue(mockDogs);

      // Act
      const result = await getRelatedDogs(organizationId, currentDogId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result.some((dog) => dog.id === currentDogId)).toBe(false);
      expect(result.map((dog) => dog.name)).toEqual([
        "Other Dog",
        "Another Dog",
      ]);
    });

    it("should return empty array when no related dogs found", async () => {
      // Arrange
      const currentDogId = 123;
      const organizationId = 456;

      getAnimals.mockResolvedValue([]);

      // Act
      const result = await getRelatedDogs(organizationId, currentDogId);

      // Assert
      expect(result).toEqual([]);
    });

    it("should return empty array when only current dog exists in organization", async () => {
      // Arrange
      const currentDogId = 123;
      const organizationId = 456;
      const mockDogs = [
        { id: 123, name: "Current Dog", organization_id: 456 }, // Only current dog
      ];

      getAnimals.mockResolvedValue(mockDogs);

      // Act
      const result = await getRelatedDogs(organizationId, currentDogId);

      // Assert
      expect(result).toEqual([]);
    });

    it("should handle API errors gracefully", async () => {
      // Arrange
      const currentDogId = 123;
      const organizationId = 456;
      const apiError = new Error("API Error");

      getAnimals.mockRejectedValue(apiError);

      // Act & Assert
      await expect(
        getRelatedDogs(organizationId, currentDogId),
      ).rejects.toThrow("API Error");
    });

    it("should pass correct parameters to getAnimals", async () => {
      // Arrange
      const currentDogId = 123;
      const organizationId = 789;

      getAnimals.mockResolvedValue([]);

      // Act
      await getRelatedDogs(organizationId, currentDogId);

      // Assert
      expect(getAnimals).toHaveBeenCalledWith({
        organization_id: 789,
        limit: 4,
        status: "available",
      });
    });
  });
});

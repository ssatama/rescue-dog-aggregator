import {
  getAnimals,
  getAnimalById,
  getAnimalsByStandardizedBreed,
  getRandomAnimals,
} from "../animalsService";
import { get } from "../../utils/api";

// Mock the api utility
jest.mock("../../utils/api", () => ({
  get: jest.fn(),
}));

import {
  getLocationCountries,
  getAvailableCountries,
  getAvailableRegions,
  getStandardizedBreeds,
  getBreedGroups,
} from "../animalsService";

describe("animalsService", () => {
  beforeEach(() => {
    // Clear mock calls between tests
    jest.clearAllMocks();
  });

  test("getAnimals calls API with correct parameters", async () => {
    const filters = {
      search: "buddy",
      standardized_breed: "Labrador Retriever",
      sex: "Male",
      age_category: "Adult",
      standardized_size: "Large",
      limit: 10,
      offset: 0,
    };

    // Setup mock return value
    get.mockResolvedValue([{ id: 1, name: "Test Animal" }]);

    const result = await getAnimals(filters);

    // Check that get was called with correct parameters
    expect(get).toHaveBeenCalledWith(
      "/api/animals",
      expect.objectContaining({
        ...filters,
        status: "available",
        animal_type: "dog",
      }),
      {}, // Add empty options object as third parameter
    );

    // Check the result
    expect(result).toEqual([{ id: 1, name: "Test Animal" }]);
  });

  test("getAnimalById calls API with correct ID", async () => {
    // Setup mock
    get.mockResolvedValue({ id: 1, name: "Buddy" });

    // Call the service
    const result = await getAnimalById(1);

    // Check that get was called correctly
    expect(get).toHaveBeenCalledWith("/api/animals/1");
  });

  test("getAnimalsByStandardizedBreed delegates correctly", async () => {
    get.mockResolvedValue([]);

    await getAnimalsByStandardizedBreed("Poodle", { limit: 4 });
    // underlying getAnimals should have been called
    expect(get).toHaveBeenCalledWith(
      "/api/animals",
      expect.objectContaining({
        standardized_breed: "Poodle",
        limit: 4,
        animal_type: "dog",
        status: "available", // Add this since getAnimals adds it
      }),
      {}, // Add empty options object as third parameter
    );
  });

  test("getRandomAnimals calls /api/animals/random with limit", async () => {
    get.mockResolvedValue([{}]);
    // custom limit
    await getRandomAnimals(5);
    expect(get).toHaveBeenCalledWith("/api/animals/random", { limit: 5 });
    // default limit = 3
    await getRandomAnimals();
    expect(get).toHaveBeenLastCalledWith("/api/animals/random", { limit: 3 });
  });
});

describe("animalsService endpoints", () => {
  test("getAnimals includes status parameter if provided", async () => {
    // Setup mock
    get.mockResolvedValue([{ id: 1, name: "Test Animal" }]);

    // Call the service with explicit status
    const result = await getAnimals({ status: "adopted" });

    // Check that get was called with the provided status
    expect(get).toHaveBeenCalledWith(
      "/api/animals",
      expect.objectContaining({
        status: "adopted",
        animal_type: "dog",
      }),
      {},
    );

    expect(result).toEqual([{ id: 1, name: "Test Animal" }]);
  });

  test("getAnimals defaults to available status when not provided", async () => {
    // Setup mock
    get.mockResolvedValue([{ id: 1, name: "Test Animal" }]);

    // Call the service without status
    const result = await getAnimals({ page: 1 });

    // Check that get was called with default status
    expect(get).toHaveBeenCalledWith(
      "/api/animals",
      expect.objectContaining({
        status: "available",
        animal_type: "dog",
        page: 1,
      }),
      {},
    );

    expect(result).toEqual([{ id: 1, name: "Test Animal" }]);
  });

  test("getAnimals allows null status to fetch all dogs", async () => {
    // Setup mock
    get.mockResolvedValue([{ id: 1, name: "Test Animal" }]);

    // Call the service with null status
    const result = await getAnimals({ status: null });

    // Check that get was called without status parameter
    expect(get).toHaveBeenCalledWith(
      "/api/animals",
      expect.objectContaining({
        animal_type: "dog",
      }),
      {},
    );

    // Verify status is not in the params
    const callParams = get.mock.calls[0][1];
    expect(callParams).not.toHaveProperty("status");

    expect(result).toEqual([{ id: 1, name: "Test Animal" }]);
  });

  test("getAnimals supports all status values", async () => {
    get.mockResolvedValue([]);

    // Test available status
    await getAnimals({ status: "available" });
    expect(get).toHaveBeenCalledWith(
      "/api/animals",
      expect.objectContaining({ status: "available" }),
      {},
    );

    // Test adopted status
    await getAnimals({ status: "adopted" });
    expect(get).toHaveBeenCalledWith(
      "/api/animals",
      expect.objectContaining({ status: "adopted" }),
      {},
    );

    // Test reserved status
    await getAnimals({ status: "reserved" });
    expect(get).toHaveBeenCalledWith(
      "/api/animals",
      expect.objectContaining({ status: "reserved" }),
      {},
    );

    // Test unknown status
    await getAnimals({ status: "unknown" });
    expect(get).toHaveBeenCalledWith(
      "/api/animals",
      expect.objectContaining({ status: "unknown" }),
      {},
    );
  });
});

describe("animalsService meta endpoints", () => {
  it("getLocationCountries calls GET /api/animals/meta/location_countries", async () => {
    get.mockResolvedValue(["US", "CA"]);
    const countries = await getLocationCountries();
    expect(get).toHaveBeenCalledWith("/api/animals/meta/location_countries");
    expect(countries).toEqual(["US", "CA"]);
  });

  it("getAvailableCountries calls GET /api/animals/meta/available_countries", async () => {
    get.mockResolvedValue(["US", "MX"]);
    const countries = await getAvailableCountries();
    expect(get).toHaveBeenCalledWith("/api/animals/meta/available_countries");
    expect(countries).toEqual(["US", "MX"]);
  });

  it("getAvailableRegions returns [] and skips fetch when no country selected", async () => {
    const regions = await getAvailableRegions("");
    expect(regions).toEqual([]);
    expect(get).not.toHaveBeenCalledWith(
      "/api/animals/meta/available_regions",
      expect.anything(),
    );
  });

  it("getAvailableRegions calls endpoint when country provided", async () => {
    get.mockResolvedValue(["ON", "QC"]);
    const regions = await getAvailableRegions("Canada");
    expect(get).toHaveBeenCalledWith("/api/animals/meta/available_regions", {
      country: "Canada",
    });
    expect(regions).toEqual(["ON", "QC"]);
  });

  it("getStandardizedBreeds calls GET /api/animals/meta/breeds with breed_group", async () => {
    get.mockResolvedValue(["Labrador", "Poodle"]);
    const breeds = await getStandardizedBreeds("Sporting");
    expect(get).toHaveBeenCalledWith("/api/animals/meta/breeds", {
      breed_group: "Sporting",
    });
    expect(breeds).toEqual(["Labrador", "Poodle"]);
  });

  it("getBreedGroups calls GET /api/animals/meta/breed_groups", async () => {
    get.mockResolvedValue(["Sporting", "Hound"]);
    const groups = await getBreedGroups();
    expect(get).toHaveBeenCalledWith("/api/animals/meta/breed_groups");
    expect(groups).toEqual(["Sporting", "Hound"]);
  });
});

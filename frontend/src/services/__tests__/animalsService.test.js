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
      {} // Add empty options object as third parameter
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
      {} // Add empty options object as third parameter
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
import type { Filters } from "../dogsPage";
import type { DogFilterValues } from "../filterComponents";
import type { DogFilterParams, AgeCategory, SortOption } from "../../utils/dogFilters";

describe("Filter type hierarchy", () => {
  test("DogFilterParams keys are a subset of page-level Filters keys", () => {
    const dogFilterParams: DogFilterParams = {
      age: "Puppy",
      breed: "Labrador",
      shipsTo: "GB",
      sort: "newest",
    };

    const pageFilters: Filters = {
      searchQuery: "",
      sizeFilter: "",
      ageFilter: dogFilterParams.age ?? "",
      sexFilter: "",
      organizationFilter: "",
      breedFilter: dogFilterParams.breed ?? "",
      breedGroupFilter: "",
      locationCountryFilter: "",
      availableCountryFilter: dogFilterParams.shipsTo ?? "",
      availableRegionFilter: "",
    };

    expect(pageFilters.ageFilter).toBe("Puppy");
    expect(pageFilters.breedFilter).toBe("Labrador");
    expect(pageFilters.availableCountryFilter).toBe("GB");
  });

  test("DogFilterValues extends DogFilterParams with sex field", () => {
    const filterValues: DogFilterValues = {
      age: "Senior",
      breed: "Poodle",
      sex: "male",
      shipsTo: "IE",
      sort: "name-asc",
    };

    const params: DogFilterParams = filterValues;
    expect(params.age).toBe("Senior");
    expect(params.breed).toBe("Poodle");

    expect(filterValues.sex).toBe("male");
  });

  test("DogFilterParams is assignable from DogFilterValues (structural subtype)", () => {
    const values: DogFilterValues = { age: "Adult", sex: "female" };
    const params: DogFilterParams = values;

    expect(params.age).toBe("Adult");
  });

  test("AgeCategory union constrains age values", () => {
    const validAge: AgeCategory = "Puppy";
    const allAges: AgeCategory[] = ["All", "Puppy", "Young", "Adult", "Senior", "Unknown"];

    expect(validAge).toBe("Puppy");
    expect(allAges).toHaveLength(6);
  });

  test("SortOption union constrains sort values", () => {
    const validSort: SortOption = "newest";
    const allSorts: SortOption[] = ["newest", "name-asc", "name-desc", "oldest"];

    expect(validSort).toBe("newest");
    expect(allSorts).toHaveLength(4);
  });

  test("all DogFilterParams fields are optional", () => {
    const empty: DogFilterParams = {};
    expect(empty.age).toBeUndefined();
    expect(empty.breed).toBeUndefined();
    expect(empty.shipsTo).toBeUndefined();
    expect(empty.sort).toBeUndefined();
  });

  test("all DogFilterValues fields are optional", () => {
    const empty: DogFilterValues = {};
    expect(empty.age).toBeUndefined();
    expect(empty.sex).toBeUndefined();
  });
});

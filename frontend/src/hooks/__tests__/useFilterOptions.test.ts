import { renderHook } from "@testing-library/react"
import { useFilterOptions } from "../useFilterOptions"
import { FILTER_DEFAULTS } from "@/constants/filters"
import type { FilterCountsResponse } from "@/schemas/common"

const DEFAULT_FILTER_VALUES = {
  searchQuery: "",
  organizationFilter: FILTER_DEFAULTS.ORGANIZATION,
  standardizedBreedFilter: FILTER_DEFAULTS.BREED,
  sexFilter: FILTER_DEFAULTS.SEX,
  sizeFilter: FILTER_DEFAULTS.SIZE,
  ageCategoryFilter: FILTER_DEFAULTS.AGE,
  availableCountryFilter: FILTER_DEFAULTS.COUNTRY,
  locationCountryFilter: FILTER_DEFAULTS.COUNTRY,
  availableRegionFilter: FILTER_DEFAULTS.REGION,
}

const BASE_SIZE_OPTIONS = [FILTER_DEFAULTS.SIZE, "Tiny", "Small", "Medium", "Large", "Extra Large"]
const BASE_AGE_OPTIONS = [FILTER_DEFAULTS.AGE, "Puppy", "Young", "Adult", "Senior"]
const BASE_SEX_OPTIONS = [FILTER_DEFAULTS.SEX, "Male", "Female"]

const MOCK_FILTER_COUNTS: FilterCountsResponse = {
  total_count: 100,
  size_options: [
    { value: "Small", count: 10 },
    { value: "Medium", count: 20 },
    { value: "Large", count: 5 },
    { value: "XLarge", count: 3 },
  ],
  age_options: [
    { value: "Puppy", count: 15, label: "Puppy" },
    { value: "Adult", count: 30, label: "Adult" },
    { value: "Senior", count: 8, label: "Senior" },
  ],
  sex_options: [
    { value: "Male", count: 45 },
    { value: "Female", count: 55 },
  ],
}

describe("useFilterOptions", () => {
  describe("getOptionsWithCounts (via dynamic options)", () => {
    it("returns all static options when filterCounts is null", () => {
      const { result } = renderHook(() =>
        useFilterOptions({
          filterValues: DEFAULT_FILTER_VALUES,
          filterCounts: null,
          sizeOptions: BASE_SIZE_OPTIONS,
          ageOptions: BASE_AGE_OPTIONS,
          sexOptions: BASE_SEX_OPTIONS,
        }),
      )

      expect(result.current.dynamicSizeOptions).toEqual(BASE_SIZE_OPTIONS)
      expect(result.current.dynamicAgeOptions).toEqual(BASE_AGE_OPTIONS)
      expect(result.current.dynamicSexOptions).toEqual(BASE_SEX_OPTIONS)
    })

    it("returns all static options when filterCounts is undefined", () => {
      const { result } = renderHook(() =>
        useFilterOptions({
          filterValues: DEFAULT_FILTER_VALUES,
          filterCounts: undefined,
          sizeOptions: BASE_SIZE_OPTIONS,
          ageOptions: BASE_AGE_OPTIONS,
          sexOptions: BASE_SEX_OPTIONS,
        }),
      )

      expect(result.current.dynamicSizeOptions).toEqual(BASE_SIZE_OPTIONS)
    })

    it("filters zero-count size options but keeps Any default", () => {
      const { result } = renderHook(() =>
        useFilterOptions({
          filterValues: DEFAULT_FILTER_VALUES,
          filterCounts: MOCK_FILTER_COUNTS,
          sizeOptions: BASE_SIZE_OPTIONS,
          ageOptions: BASE_AGE_OPTIONS,
          sexOptions: BASE_SEX_OPTIONS,
        }),
      )

      expect(result.current.dynamicSizeOptions).toContain(FILTER_DEFAULTS.SIZE)
      expect(result.current.dynamicSizeOptions).toContain("Small")
      expect(result.current.dynamicSizeOptions).toContain("Medium")
      expect(result.current.dynamicSizeOptions).toContain("Large")
      expect(result.current.dynamicSizeOptions).toContain("Extra Large")
      expect(result.current.dynamicSizeOptions).not.toContain("Tiny")
    })

    it("handles size mapping from UI to API values", () => {
      const countsWithTiny: FilterCountsResponse = {
        ...MOCK_FILTER_COUNTS,
        size_options: [
          { value: "Tiny", count: 2 },
          { value: "XLarge", count: 0 },
        ],
      }

      const { result } = renderHook(() =>
        useFilterOptions({
          filterValues: DEFAULT_FILTER_VALUES,
          filterCounts: countsWithTiny,
          sizeOptions: BASE_SIZE_OPTIONS,
          ageOptions: BASE_AGE_OPTIONS,
          sexOptions: BASE_SEX_OPTIONS,
        }),
      )

      expect(result.current.dynamicSizeOptions).toContain("Tiny")
      expect(result.current.dynamicSizeOptions).not.toContain("Extra Large")
    })

    it("filters zero-count age options", () => {
      const { result } = renderHook(() =>
        useFilterOptions({
          filterValues: DEFAULT_FILTER_VALUES,
          filterCounts: MOCK_FILTER_COUNTS,
          sizeOptions: BASE_SIZE_OPTIONS,
          ageOptions: BASE_AGE_OPTIONS,
          sexOptions: BASE_SEX_OPTIONS,
        }),
      )

      expect(result.current.dynamicAgeOptions).toContain(FILTER_DEFAULTS.AGE)
      expect(result.current.dynamicAgeOptions).toContain("Puppy")
      expect(result.current.dynamicAgeOptions).toContain("Adult")
      expect(result.current.dynamicAgeOptions).toContain("Senior")
      expect(result.current.dynamicAgeOptions).not.toContain("Young")
    })
  })

  describe("activeFilterCount", () => {
    it("returns 0 when all filters are defaults", () => {
      const { result } = renderHook(() =>
        useFilterOptions({
          filterValues: DEFAULT_FILTER_VALUES,
          filterCounts: null,
          sizeOptions: BASE_SIZE_OPTIONS,
          ageOptions: BASE_AGE_OPTIONS,
          sexOptions: BASE_SEX_OPTIONS,
        }),
      )

      expect(result.current.activeFilterCount).toBe(0)
    })

    it("increments for each non-default filter", () => {
      const { result } = renderHook(() =>
        useFilterOptions({
          filterValues: {
            ...DEFAULT_FILTER_VALUES,
            searchQuery: "Rex",
            sizeFilter: "Large",
            sexFilter: "Male",
          },
          filterCounts: null,
          sizeOptions: BASE_SIZE_OPTIONS,
          ageOptions: BASE_AGE_OPTIONS,
          sexOptions: BASE_SEX_OPTIONS,
        }),
      )

      expect(result.current.activeFilterCount).toBe(3)
    })

    it("counts all 9 possible filters", () => {
      const { result } = renderHook(() =>
        useFilterOptions({
          filterValues: {
            searchQuery: "Rex",
            organizationFilter: "5",
            standardizedBreedFilter: "Labrador",
            sexFilter: "Male",
            sizeFilter: "Large",
            ageCategoryFilter: "Puppy",
            locationCountryFilter: "UK",
            availableCountryFilter: "DE",
            availableRegionFilter: "Bavaria",
          },
          filterCounts: null,
          sizeOptions: BASE_SIZE_OPTIONS,
          ageOptions: BASE_AGE_OPTIONS,
          sexOptions: BASE_SEX_OPTIONS,
        }),
      )

      expect(result.current.activeFilterCount).toBe(9)
    })
  })

  describe("sectionCounts", () => {
    it("returns all zeros when filters are defaults", () => {
      const { result } = renderHook(() =>
        useFilterOptions({
          filterValues: DEFAULT_FILTER_VALUES,
          filterCounts: null,
          sizeOptions: BASE_SIZE_OPTIONS,
          ageOptions: BASE_AGE_OPTIONS,
          sexOptions: BASE_SEX_OPTIONS,
        }),
      )

      expect(result.current.sectionCounts).toEqual({
        organization: 0,
        breed: 0,
        shipsToCountry: 0,
        age: 0,
        size: 0,
        sex: 0,
      })
    })

    it("returns 1 for each active section", () => {
      const { result } = renderHook(() =>
        useFilterOptions({
          filterValues: {
            ...DEFAULT_FILTER_VALUES,
            organizationFilter: "5",
            sizeFilter: "Large",
          },
          filterCounts: null,
          sizeOptions: BASE_SIZE_OPTIONS,
          ageOptions: BASE_AGE_OPTIONS,
          sexOptions: BASE_SEX_OPTIONS,
        }),
      )

      expect(result.current.sectionCounts.organization).toBe(1)
      expect(result.current.sectionCounts.size).toBe(1)
      expect(result.current.sectionCounts.breed).toBe(0)
      expect(result.current.sectionCounts.sex).toBe(0)
      expect(result.current.sectionCounts.age).toBe(0)
      expect(result.current.sectionCounts.shipsToCountry).toBe(0)
    })

    it("counts shipsToCountry from availableCountryFilter", () => {
      const { result } = renderHook(() =>
        useFilterOptions({
          filterValues: {
            ...DEFAULT_FILTER_VALUES,
            availableCountryFilter: "DE",
          },
          filterCounts: null,
          sizeOptions: BASE_SIZE_OPTIONS,
          ageOptions: BASE_AGE_OPTIONS,
          sexOptions: BASE_SEX_OPTIONS,
        }),
      )

      expect(result.current.sectionCounts.shipsToCountry).toBe(1)
    })
  })
})

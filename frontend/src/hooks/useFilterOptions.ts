import { useCallback, useMemo } from "react"
import { FILTER_DEFAULTS, SIZE_API_MAPPING, isDefaultFilterValue } from "@/constants/filters"
import type { FilterCount, FilterCountsResponse } from "@/schemas/common"

interface FilterValues {
  searchQuery: string
  organizationFilter: string
  standardizedBreedFilter: string
  sexFilter: string
  sizeFilter: string
  ageCategoryFilter: string
  locationCountryFilter?: string
  availableCountryFilter: string
  availableRegionFilter?: string
}

interface UseFilterOptionsParams {
  filterValues: FilterValues
  filterCounts?: FilterCountsResponse | null
  sizeOptions: string[]
  ageOptions: string[]
  sexOptions: string[]
}

export interface SectionCounts {
  organization: number
  breed: number
  shipsToCountry: number
  age: number
  size: number
  sex: number
}

interface UseFilterOptionsReturn {
  dynamicSizeOptions: string[]
  dynamicAgeOptions: string[]
  dynamicSexOptions: string[]
  sectionCounts: SectionCounts
  activeFilterCount: number
}

export function useFilterOptions({
  filterValues,
  filterCounts,
  sizeOptions,
  ageOptions,
  sexOptions,
}: UseFilterOptionsParams): UseFilterOptionsReturn {
  const getOptionsWithCounts = useCallback(
    (
      staticOptions: string[],
      dynamicOptions: FilterCount[] | undefined,
      filterType: string,
    ): string[] => {
      if (!filterCounts || !dynamicOptions) return staticOptions

      return staticOptions.filter((option) => {
        if (isDefaultFilterValue(option)) return true

        const dynamicOption = dynamicOptions.find((dynOpt) => {
          if (filterType === "size") {
            return dynOpt.value === SIZE_API_MAPPING[option as keyof typeof SIZE_API_MAPPING]
          }
          return dynOpt.value === option || dynOpt.label === option
        })

        return dynamicOption && dynamicOption.count > 0
      })
    },
    [filterCounts],
  )

  const dynamicSizeOptions = useMemo(
    () => getOptionsWithCounts(sizeOptions, filterCounts?.size_options, "size"),
    [filterCounts?.size_options, getOptionsWithCounts, sizeOptions],
  )

  const dynamicAgeOptions = useMemo(
    () => getOptionsWithCounts(ageOptions, filterCounts?.age_options, "age"),
    [filterCounts?.age_options, getOptionsWithCounts, ageOptions],
  )

  const dynamicSexOptions = useMemo(
    () => getOptionsWithCounts(sexOptions, filterCounts?.sex_options, "sex"),
    [filterCounts?.sex_options, getOptionsWithCounts, sexOptions],
  )

  const sectionCounts = useMemo((): SectionCounts => {
    const counts: SectionCounts = {
      organization: 0,
      breed: 0,
      shipsToCountry: 0,
      age: 0,
      size: 0,
      sex: 0,
    }

    if (
      filterValues.organizationFilter &&
      filterValues.organizationFilter !== FILTER_DEFAULTS.ORGANIZATION
    )
      counts.organization++
    if (
      filterValues.standardizedBreedFilter &&
      filterValues.standardizedBreedFilter !== FILTER_DEFAULTS.BREED
    )
      counts.breed++
    if (
      filterValues.availableCountryFilter &&
      filterValues.availableCountryFilter !== FILTER_DEFAULTS.COUNTRY
    )
      counts.shipsToCountry++
    if (
      filterValues.ageCategoryFilter &&
      filterValues.ageCategoryFilter !== FILTER_DEFAULTS.AGE
    )
      counts.age++
    if (
      filterValues.sizeFilter &&
      filterValues.sizeFilter !== FILTER_DEFAULTS.SIZE
    )
      counts.size++
    if (
      filterValues.sexFilter &&
      filterValues.sexFilter !== FILTER_DEFAULTS.SEX
    )
      counts.sex++

    return counts
  }, [
    filterValues.organizationFilter,
    filterValues.standardizedBreedFilter,
    filterValues.availableCountryFilter,
    filterValues.ageCategoryFilter,
    filterValues.sizeFilter,
    filterValues.sexFilter,
  ])

  const activeFilterCount = useMemo((): number => {
    let count = 0

    if (filterValues.searchQuery && filterValues.searchQuery.trim() !== "")
      count++
    count += sectionCounts.organization
    count += sectionCounts.breed
    count += sectionCounts.sex
    count += sectionCounts.size
    count += sectionCounts.age
    count += sectionCounts.shipsToCountry
    if (
      filterValues.locationCountryFilter &&
      filterValues.locationCountryFilter !== FILTER_DEFAULTS.COUNTRY
    )
      count++
    if (
      filterValues.availableRegionFilter &&
      filterValues.availableRegionFilter !== FILTER_DEFAULTS.REGION
    )
      count++

    return count
  }, [filterValues.searchQuery, filterValues.locationCountryFilter, filterValues.availableRegionFilter, sectionCounts])

  return {
    dynamicSizeOptions,
    dynamicAgeOptions,
    dynamicSexOptions,
    sectionCounts,
    activeFilterCount,
  }
}

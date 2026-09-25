import { useState, useEffect, useCallback, useMemo, type MutableRefObject } from "react";
import { useRouter } from "next/navigation";
import { useDebouncedCallback, type DebouncedState } from "use-debounce";
import { getAvailableRegions } from "../../services/animalsService";
import { reportError } from "../../utils/logger";
import {
  AGE_OPTIONS,
  FILTER_DEFAULTS,
  FIRST_TIME_FRIENDLY,
  LIVES_WELL_WITH,
  SIZE_API_MAPPING,
  SIZE_OPTIONS,
  isCatalogSort,
  isDefaultFilterValue,
  isEnergyBand,
  scaleValue,
} from "@/constants/filters";
import type {
  Filters,
  DogsPageMetadata,
  DogsPageInitialParams,
} from "../../types/dogsPage";

const DEBOUNCE_URL_UPDATE_MS = 500;

interface UseDogsFiltersParams {
  metadata: DogsPageMetadata;
  initialParams: DogsPageInitialParams;
  searchParams: URLSearchParams;
  pathname: string;
  scrollPositionRef: MutableRefObject<number>;
}

interface UseDogsFiltersReturn {
  filters: Filters;
  buildAPIParams: (filters: Filters) => Record<string, string>;
  updateURL: DebouncedState<(filters: Filters, page?: number, preserveScroll?: boolean) => void>;
  activeFilterCount: number;
  availableRegions: string[];
}

export default function useDogsFilters({
  metadata,
  initialParams,
  searchParams,
  pathname,
  scrollPositionRef,
}: UseDogsFiltersParams): UseDogsFiltersReturn {
  const router = useRouter();

  const validateOrganizationId = useCallback((orgId: string | null): string => {
    if (!orgId || orgId === FILTER_DEFAULTS.ORGANIZATION) return FILTER_DEFAULTS.ORGANIZATION;

    const organizations = metadata?.organizations || [];
    const isValidOrg = organizations.some(
      (org) => org.id?.toString() === orgId || org.id === parseInt(orgId, 10),
    );

    return isValidOrg ? orgId : FILTER_DEFAULTS.ORGANIZATION;
  }, [metadata?.organizations]);

  const filters: Filters = useMemo(() => ({
    searchQuery: searchParams.get("search") || "",
    sizeFilter: scaleValue(searchParams.get("size"), SIZE_OPTIONS, FILTER_DEFAULTS.SIZE),
    ageFilter: scaleValue(
      searchParams.get("age") || initialParams?.age_category || null,
      AGE_OPTIONS,
      FILTER_DEFAULTS.AGE,
    ),
    sexFilter: searchParams.get("sex") || FILTER_DEFAULTS.SEX,
    organizationFilter: validateOrganizationId(
      searchParams.get("organization_id"),
    ),
    breedFilter: searchParams.get("breed") || FILTER_DEFAULTS.BREED,
    breedGroupFilter: searchParams.get("breed_group") || FILTER_DEFAULTS.GROUP,
    locationCountryFilter:
      searchParams.get("location_country") ||
      initialParams?.location_country ||
      FILTER_DEFAULTS.COUNTRY,
    availableCountryFilter:
      searchParams.get("available_country") ||
      initialParams?.available_country ||
      FILTER_DEFAULTS.COUNTRY,
    availableRegionFilter: searchParams.get("available_region") || FILTER_DEFAULTS.REGION,
    ...Object.fromEntries(
      [...LIVES_WELL_WITH, FIRST_TIME_FRIENDLY].map(({ key, url }) => [
        key,
        searchParams.get(url) === "true" ? "true" : "",
      ]),
    ) as Pick<Filters, "goodWithKidsFilter" | "goodWithDogsFilter" | "goodWithCatsFilter" | "firstTimeFriendlyFilter">,
    energyFilter: isEnergyBand(searchParams.get("energy")) ? (searchParams.get("energy") as string) : "",
    sortFilter: isCatalogSort(searchParams.get("sort")) ? (searchParams.get("sort") as string) : FILTER_DEFAULTS.SORT,
  }), [searchParams, initialParams?.age_category, initialParams?.location_country, initialParams?.available_country, validateOrganizationId]);

  const updateURL = useDebouncedCallback(
    (newFilters: Filters, newPage = 1, preserveScroll = false) => {
      const params = new URLSearchParams();

      const urlKeyMap: Record<string, string> = {
        searchQuery: "search",
        organizationFilter: "organization_id",
        locationCountryFilter: "location_country",
        availableCountryFilter: "available_country",
        availableRegionFilter: "available_region",
        breedGroupFilter: "breed_group",
        sizeFilter: "size",
        ageFilter: "age",
        sexFilter: "sex",
        breedFilter: "breed",
        sortFilter: "sort",
        energyFilter: "energy",
        ...Object.fromEntries(
          [...LIVES_WELL_WITH, FIRST_TIME_FRIENDLY].map(({ key, url }) => [key, url]),
        ),
      };

      Object.entries(newFilters).forEach(([key, value]) => {
        const paramKey =
          urlKeyMap[key] ||
          key
            .replace("Filter", "")
            .replace(/([A-Z])/g, "_$1")
            .toLowerCase();

        if (
          value &&
          value !== FILTER_DEFAULTS.SEX &&
          value !== FILTER_DEFAULTS.SIZE &&
          value !== FILTER_DEFAULTS.AGE &&
          value !== FILTER_DEFAULTS.BREED &&
          value !== FILTER_DEFAULTS.COUNTRY &&
          value !== FILTER_DEFAULTS.REGION &&
          value !== FILTER_DEFAULTS.GROUP &&
          value !== FILTER_DEFAULTS.ORGANIZATION &&
          value !== FILTER_DEFAULTS.SORT
        ) {
          params.set(paramKey, value);
        }
      });

      if (newPage > 1) {
        params.set("page", newPage.toString());
      }

      if (preserveScroll && scrollPositionRef.current > 0) {
        params.set("scroll", scrollPositionRef.current.toString());
      }

      const newURL = params.toString()
        ? `${pathname}?${params.toString()}`
        : pathname;
      router.push(newURL, { scroll: false });
    },
    DEBOUNCE_URL_UPDATE_MS,
  );

  const activeFilterCount = Object.entries(filters).filter(
    ([key, value]) => key !== "sortFilter" && !isDefaultFilterValue(value),
  ).length;

  const [availableRegions, setAvailableRegions] = useState<string[]>([FILTER_DEFAULTS.REGION]);

  useEffect(() => {
    if (
      !filters.availableCountryFilter ||
      filters.availableCountryFilter === FILTER_DEFAULTS.COUNTRY
    ) {
      queueMicrotask(() => setAvailableRegions([FILTER_DEFAULTS.REGION]));
      return;
    }

    let cancelled = false;

    getAvailableRegions(filters.availableCountryFilter)
      .then((regions) => {
        if (!cancelled) setAvailableRegions([FILTER_DEFAULTS.REGION, ...regions]);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          reportError(err, { context: "getAvailableRegions", country: filters.availableCountryFilter });
          setAvailableRegions([FILTER_DEFAULTS.REGION]);
        }
      });

    return () => { cancelled = true; };
  }, [filters.availableCountryFilter]);

  useEffect(() => {
    return () => {
      updateURL?.cancel?.();
    };
  }, [updateURL]);

  return {
    filters,
    buildAPIParams,
    updateURL,
    activeFilterCount,
    availableRegions,
  };
}

function buildAPIParams(filterValues: Filters): Record<string, string> {
  const params: Record<string, string> = {};

  // Always sent: the API's own default is newest-first
  params.sort = filterValues.sortFilter || FILTER_DEFAULTS.SORT;

  const searchQuery = (filterValues.searchQuery || "").trim();
  if (searchQuery) {
    params.search = searchQuery;
  }

  const size = (filterValues.sizeFilter || "").trim();
  if (size && size !== FILTER_DEFAULTS.SIZE) {
    const mappedSize = SIZE_API_MAPPING[size];
    if (mappedSize) {
      params.standardized_size = mappedSize;
    }
  }

  const age = (filterValues.ageFilter || "").trim();
  if (age && age !== FILTER_DEFAULTS.AGE) {
    params.age_category = age;
  }

  const sex = (filterValues.sexFilter || "").trim();
  if (sex && sex !== FILTER_DEFAULTS.SEX) {
    params.sex = sex;
  }

  const orgId = (filterValues.organizationFilter || "").toString().trim();
  if (orgId && orgId !== FILTER_DEFAULTS.ORGANIZATION) {
    params.organization_id = orgId;
  }

  const breed = (filterValues.breedFilter || "").trim();
  if (breed && breed !== FILTER_DEFAULTS.BREED) {
    // primary_breed is the canonical identity, so a breed and its crosses stay
    // together. standardized_breed is the display label and would split them,
    // disagreeing with the breed pages.
    params.primary_breed = breed;
  }

  const breedGroup = (filterValues.breedGroupFilter || "").trim();
  if (breedGroup && breedGroup !== FILTER_DEFAULTS.GROUP) {
    params.breed_group = breedGroup;
  }

  const locationCountry = (filterValues.locationCountryFilter || "").trim();
  if (locationCountry && locationCountry !== FILTER_DEFAULTS.COUNTRY) {
    params.location_country = locationCountry;
  }

  const availableCountry = (filterValues.availableCountryFilter || "").trim();
  if (availableCountry && availableCountry !== FILTER_DEFAULTS.COUNTRY) {
    params.available_to_country = availableCountry;
  }

  const availableRegion = (filterValues.availableRegionFilter || "").trim();
  if (availableRegion && availableRegion !== FILTER_DEFAULTS.REGION) {
    params.available_to_region = availableRegion;
  }

  LIVES_WELL_WITH.forEach(({ key, url }) => {
    if (filterValues[key] === "true") params[url] = "true";
  });
  if (filterValues.firstTimeFriendlyFilter === "true") {
    params.experience_level = "first_time_ok";
  }
  if (isEnergyBand(filterValues.energyFilter)) {
    params.energy = filterValues.energyFilter;
  }

  return params;
}

export { buildAPIParams };

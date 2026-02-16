import { useState, useEffect, useCallback, useMemo, type MutableRefObject } from "react";
import { useRouter } from "next/navigation";
import { useDebouncedCallback, type DebouncedState } from "use-debounce";
import { getAvailableRegions } from "../../services/animalsService";
import { reportError } from "../../utils/logger";
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
    if (!orgId || orgId === "any") return "any";

    const organizations = metadata?.organizations || [];
    const isValidOrg = organizations.some(
      (org) => org.id?.toString() === orgId || org.id === parseInt(orgId, 10),
    );

    return isValidOrg ? orgId : "any";
  }, [metadata?.organizations]);

  const filters: Filters = useMemo(() => ({
    searchQuery: searchParams.get("search") || "",
    sizeFilter: searchParams.get("size") || "Any size",
    ageFilter:
      searchParams.get("age") || initialParams?.age_category || "Any age",
    sexFilter: searchParams.get("sex") || "Any",
    organizationFilter: validateOrganizationId(
      searchParams.get("organization_id"),
    ),
    breedFilter: searchParams.get("breed") || "Any breed",
    breedGroupFilter: searchParams.get("breed_group") || "Any group",
    locationCountryFilter:
      searchParams.get("location_country") ||
      initialParams?.location_country ||
      "Any country",
    availableCountryFilter:
      searchParams.get("available_country") ||
      initialParams?.available_country ||
      "Any country",
    availableRegionFilter: searchParams.get("available_region") || "Any region",
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
          value !== "Any" &&
          value !== "Any size" &&
          value !== "Any age" &&
          value !== "Any breed" &&
          value !== "Any country" &&
          value !== "Any region" &&
          value !== "Any group" &&
          value !== "any"
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
    ([_key, value]) =>
      value && !value.includes("Any") && value !== "any" && value !== "",
  ).length;

  const [availableRegions, setAvailableRegions] = useState<string[]>(["Any region"]);

  useEffect(() => {
    if (
      !filters.availableCountryFilter ||
      filters.availableCountryFilter === "Any country"
    ) {
      queueMicrotask(() => setAvailableRegions(["Any region"]));
      return;
    }

    let cancelled = false;

    getAvailableRegions(filters.availableCountryFilter)
      .then((regions) => {
        if (!cancelled) setAvailableRegions(["Any region", ...regions]);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          reportError(err, { context: "getAvailableRegions", country: filters.availableCountryFilter });
          setAvailableRegions(["Any region"]);
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

  const searchQuery = (filterValues.searchQuery || "").trim();
  if (searchQuery) {
    params.search = searchQuery;
  }

  const size = (filterValues.sizeFilter || "").trim();
  if (size && size !== "Any size") {
    params.standardized_size = size;
  }

  const age = (filterValues.ageFilter || "").trim();
  if (age && age !== "Any age") {
    params.age_category = age;
  }

  const sex = (filterValues.sexFilter || "").trim();
  if (sex && sex !== "Any") {
    params.sex = sex;
  }

  const orgId = (filterValues.organizationFilter || "").toString().trim();
  if (orgId && orgId !== "any") {
    params.organization_id = orgId;
  }

  const breed = (filterValues.breedFilter || "").trim();
  if (breed && breed !== "Any breed") {
    params.standardized_breed = breed;
  }

  const breedGroup = (filterValues.breedGroupFilter || "").trim();
  if (breedGroup && breedGroup !== "Any group") {
    params.breed_group = breedGroup;
  }

  const locationCountry = (filterValues.locationCountryFilter || "").trim();
  if (locationCountry && locationCountry !== "Any country") {
    params.location_country = locationCountry;
  }

  const availableCountry = (filterValues.availableCountryFilter || "").trim();
  if (availableCountry && availableCountry !== "Any country") {
    params.available_country = availableCountry;
  }

  const availableRegion = (filterValues.availableRegionFilter || "").trim();
  if (availableRegion && availableRegion !== "Any region") {
    params.available_region = availableRegion;
  }

  return params;
}

export { buildAPIParams };

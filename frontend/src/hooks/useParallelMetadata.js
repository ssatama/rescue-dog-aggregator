/**
 * Hook for parallel metadata API calls
 * TDD Implementation for Performance Optimization
 */
import { useState, useCallback, useEffect, useRef } from "react";
import {
  getStandardizedBreeds,
  getLocationCountries,
  getAvailableCountries,
} from "../services/animalsService";
import { getOrganizations } from "../services/organizationsService";
import { reportError } from "../utils/logger";
import { useMetadataCache } from "./useMetadataCache";

export function useParallelMetadata() {
  const [metadata, setMetadata] = useState({
    standardizedBreeds: ["Any breed"],
    locationCountries: ["Any country"],
    availableCountries: ["Any country"],
    organizations: [{ id: null, name: "Any organization" }],
  });

  const [metadataLoading, setMetadataLoading] = useState(true);
  const [metadataError, setMetadataError] = useState(null);

  // Create cached API functions
  const breedsCache = useMetadataCache("breeds", getStandardizedBreeds);
  const locationCountriesCache = useMetadataCache(
    "location-countries",
    getLocationCountries,
  );
  const availableCountriesCache = useMetadataCache(
    "available-countries",
    getAvailableCountries,
  );
  const organizationsCache = useMetadataCache(
    "organizations",
    getOrganizations,
  );

  const fetchAllMetadata = useCallback(async () => {
    setMetadataLoading(true);
    setMetadataError(null);

    try {
      // Execute all API calls in parallel for maximum performance
      const [breeds, locationCountries, availableCountries, organizations] =
        await Promise.all([
          breedsCache.fetchData(),
          locationCountriesCache.fetchData(),
          availableCountriesCache.fetchData(),
          organizationsCache.fetchData(),
        ]);

      // Process and set the metadata
      const processedBreeds = breeds
        ? ["Any breed", ...breeds.filter((b) => b !== "Any breed")]
        : ["Any breed"];
      const processedLocationCountries = locationCountries
        ? ["Any country", ...locationCountries]
        : ["Any country"];
      const processedAvailableCountries = availableCountries
        ? ["Any country", ...availableCountries]
        : ["Any country"];
      const processedOrganizations = organizations
        ? [
            { id: null, name: "Any organization" },
            ...(Array.isArray(organizations) ? organizations : []),
          ]
        : [{ id: null, name: "Any organization" }];

      setMetadata({
        standardizedBreeds: processedBreeds,
        locationCountries: processedLocationCountries,
        availableCountries: processedAvailableCountries,
        organizations: processedOrganizations,
      });
    } catch (err) {
      reportError(err, { context: "Failed to fetch metadata in parallel" });
      setMetadataError("Failed to load metadata. Please try again.");
    } finally {
      setMetadataLoading(false);
    }
  }, [
    breedsCache,
    locationCountriesCache,
    availableCountriesCache,
    organizationsCache,
  ]);

  // Stable ref for mount-only effect
  const fetchAllMetadataRef = useRef(fetchAllMetadata);
  fetchAllMetadataRef.current = fetchAllMetadata;

  // Fetch metadata on mount only
  useEffect(() => {
    fetchAllMetadataRef.current();
  }, []);

  return {
    metadata,
    metadataLoading,
    metadataError,
    refetchMetadata: fetchAllMetadata,
    clearMetadataCache: () => {
      breedsCache.clearCache();
      locationCountriesCache.clearCache();
      availableCountriesCache.clearCache();
      organizationsCache.clearCache();
    },
  };
}

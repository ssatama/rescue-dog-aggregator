import { useState, useCallback, useEffect, useRef } from "react";
import {
  getStandardizedBreeds,
  getLocationCountries,
  getAvailableCountries,
} from "../services/animalsService";
import { getOrganizations } from "../services/organizationsService";
import { reportError } from "../utils/logger";
import { useMetadataCache } from "./useMetadataCache";

interface OrganizationOption {
  id: number | string | null;
  name: string;
}

interface Metadata {
  standardizedBreeds: string[];
  locationCountries: string[];
  availableCountries: string[];
  organizations: OrganizationOption[];
}

interface UseParallelMetadataReturn {
  metadata: Metadata;
  metadataLoading: boolean;
  metadataError: string | null;
  refetchMetadata: () => Promise<void>;
  clearMetadataCache: () => void;
}

export function useParallelMetadata(): UseParallelMetadataReturn {
  const [metadata, setMetadata] = useState<Metadata>({
    standardizedBreeds: ["Any breed"],
    locationCountries: ["Any country"],
    availableCountries: ["Any country"],
    organizations: [{ id: null, name: "Any organization" }],
  });

  const [metadataLoading, setMetadataLoading] = useState(true);
  const [metadataError, setMetadataError] = useState<string | null>(null);

  const breedsCache = useMetadataCache("breeds", () => getStandardizedBreeds());
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
      const [breeds, locationCountries, availableCountries, organizations] =
        await Promise.all([
          breedsCache.fetchData(),
          locationCountriesCache.fetchData(),
          availableCountriesCache.fetchData(),
          organizationsCache.fetchData(),
        ]);

      const processedBreeds = breeds
        ? ["Any breed", ...breeds.filter((b: string) => b !== "Any breed")]
        : ["Any breed"];
      const processedLocationCountries = locationCountries
        ? ["Any country", ...locationCountries]
        : ["Any country"];
      const processedAvailableCountries = availableCountries
        ? ["Any country", ...availableCountries]
        : ["Any country"];
      const processedOrganizations = organizations
        ? [
            { id: null, name: "Any organization" } as OrganizationOption,
            ...(Array.isArray(organizations)
              ? (organizations as OrganizationOption[])
              : []),
          ]
        : [{ id: null, name: "Any organization" } as OrganizationOption];

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

  const fetchAllMetadataRef = useRef(fetchAllMetadata);
  fetchAllMetadataRef.current = fetchAllMetadata;

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

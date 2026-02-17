import { z } from "zod";
import type { ApiDog } from "../types/apiDog";
import { get } from "../utils/api";
import { logger, reportError } from "../utils/logger";
import {
  ApiDogSchema,
  BreedStatsSchema,
  StatisticsSchema,
} from "../schemas/animals";
import { FilterCountsResponseSchema } from "../schemas/common";

type AnimalParams = Record<string, unknown>;

function cleanFilterParams(params: AnimalParams): AnimalParams {
  const cleaned = Object.fromEntries(
    Object.entries(params).filter(
      ([key, v]) =>
        v != null &&
        v !== "" &&
        !(key === "sex" && v === "Any") &&
        !(key === "standardized_size" && v === "Any size") &&
        !(key === "age_category" && v === "Any age") &&
        !(key === "standardized_breed" && v === "Any breed") &&
        !(key === "breed_group" && v === "Any group") &&
        !(key === "organization_id" && v === "Any organization") &&
        !(key === "location_country" && v === "Any country") &&
        !(key === "available_to_country" && v === "Any country") &&
        !(key === "available_to_region" && v === "Any region"),
    ),
  );

  if (!cleaned.animal_type) {
    cleaned.animal_type = "dog";
  }

  return cleaned;
}

export async function getAnimals(
  params: AnimalParams = {},
  options: RequestInit = {},
): Promise<ApiDog[]> {
  logger.log("Fetching animals with params:", params);
  const cleanParams = cleanFilterParams(params);

  if (!("status" in params) && !cleanParams.status) {
    cleanParams.status = "available";
  }

  logger.log("Cleaned params for API:", cleanParams);
  return get<ApiDog[]>("/api/animals", cleanParams, {
    ...options,
    schema: z.array(ApiDogSchema),
  });
}

export async function getAnimalById(id: string | number): Promise<ApiDog> {
  logger.log(`Fetching animal by ID: ${id}`);
  return get<ApiDog>(`/api/animals/${id}`, {}, {
    schema: ApiDogSchema,
  });
}

export async function getAnimalBySlug(slug: string): Promise<ApiDog> {
  logger.log(`Fetching animal by slug: ${slug}`);
  return get<ApiDog>(`/api/animals/${slug}`, {}, {
    schema: ApiDogSchema,
  });
}

export async function getAnimalsByStandardizedBreed(
  standardizedBreed: string,
  additionalParams: AnimalParams = {},
): Promise<ApiDog[]> {
  const params = {
    ...additionalParams,
    standardized_breed: standardizedBreed,
    animal_type: "dog",
  };
  logger.log("Fetching animals by standardized breed:", params);
  return getAnimals(params);
}

export const getRandomAnimals = async (
  limit: number = 3,
): Promise<ApiDog[]> => {
  logger.log(`Fetching ${limit} random animals`);
  return get<ApiDog[]>("/api/animals/random", { limit }, {
    schema: z.array(ApiDogSchema),
  });
};

export async function getStandardizedBreeds(
  breedGroup: string | null = null,
): Promise<string[]> {
  const params: AnimalParams = {};
  if (breedGroup && breedGroup !== "Any group") {
    params.breed_group = breedGroup;
  }
  logger.log("Fetching standardized breeds with params:", params);

  try {
    const response = await get("/api/animals/meta/breeds", params);

    if (Array.isArray(response)) {
      return response as string[];
    }

    const obj = response as Record<string, unknown>;
    if (obj && Array.isArray(obj.data)) {
      return obj.data as string[];
    }

    if (obj && Array.isArray(obj.breeds)) {
      return obj.breeds as string[];
    }

    logger.warn(
      "Unexpected breeds API response structure:",
      typeof response,
      Object.keys(obj || {}),
    );

    return [];
  } catch (error) {
    logger.error("Error fetching standardized breeds:", error);
    reportError(error, { context: "getStandardizedBreeds", breedGroup });
    return [];
  }
}

export async function getBreedGroups(): Promise<string[]> {
  logger.log("Fetching breed groups");
  return get<string[]>("/api/animals/meta/breed_groups");
}

export async function getLocationCountries(): Promise<string[]> {
  logger.log("Fetching location countries");
  return get<string[]>("/api/animals/meta/location_countries");
}

export async function getAvailableCountries(): Promise<string[]> {
  logger.log("Fetching available-to countries");
  return get<string[]>("/api/animals/meta/available_countries");
}

export async function getAvailableRegions(
  country: string,
): Promise<string[]> {
  if (!country || country === "Any country") {
    logger.log("Skipping fetch for available regions - no country selected.");
    return [];
  }
  logger.log(`Fetching available regions for country: ${country}`);
  return get<string[]>("/api/animals/meta/available_regions", { country });
}

export async function getStatistics(): Promise<z.infer<typeof StatisticsSchema>> {
  logger.log("Fetching statistics");
  return get("/api/animals/statistics", {}, {
    schema: StatisticsSchema,
  });
}

const VALID_CURATION_TYPES = [
  "recent",
  "recent_with_fallback",
  "diverse",
  "random",
] as const;

export type CurationType = (typeof VALID_CURATION_TYPES)[number];

export async function getAnimalsByCuration(
  curationType: string,
  limit: number = 4,
): Promise<ApiDog[]> {
  if (!curationType) {
    throw new Error("Curation type is required");
  }

  if (
    !VALID_CURATION_TYPES.includes(
      curationType as (typeof VALID_CURATION_TYPES)[number],
    )
  ) {
    throw new Error(
      "Invalid curation type. Must be one of: recent, recent_with_fallback, diverse, random",
    );
  }

  if (typeof limit !== "number" || limit <= 0) {
    throw new Error("Limit must be a positive number");
  }

  logger.log(
    `Fetching animals with curation type: ${curationType}, limit: ${limit}`,
  );

  const params = {
    curation_type: curationType,
    limit,
    animal_type: "dog",
    status: "available",
  };

  logger.log("API call parameters:", params);

  return get<ApiDog[]>("/api/animals", params, {
    schema: z.array(ApiDogSchema),
  });
}

export async function getAllAnimals(
  params: AnimalParams = {},
): Promise<ApiDog[]> {
  logger.log("Fetching all animals");
  return getAnimals({
    ...params,
    limit: 10000,
  });
}

export async function getAllAnimalsForSitemap(
  params: AnimalParams = {},
): Promise<ApiDog[]> {
  logger.log("Fetching all animals for sitemap with pagination");

  const allAnimals: ApiDog[] = [];
  const limit = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    try {
      const batch = await getAnimals({
        ...params,
        limit,
        offset,
      });

      allAnimals.push(...batch);

      hasMore = batch.length === limit;
      offset += limit;

      logger.log(
        `Fetched ${batch.length} animals at offset ${offset - limit}, total so far: ${allAnimals.length}`,
      );
    } catch (error) {
      logger.error(`Error fetching animals at offset ${offset}:`, error);
      reportError(error, { context: "getAllAnimalsForSitemap", offset });
      hasMore = false;
    }
  }

  logger.log(`Sitemap fetch complete: ${allAnimals.length} total animals`);
  return allAnimals;
}

export async function getFilterCounts(
  params: AnimalParams = {},
  options: RequestInit = {},
): Promise<z.infer<typeof FilterCountsResponseSchema>> {
  logger.log("Fetching filter counts with params:", params);

  const cleanParams = cleanFilterParams(params);

  if (!cleanParams.status) {
    cleanParams.status = "available";
  }

  logger.log("Cleaned filter count params for API:", cleanParams);
  return get("/api/animals/meta/filter_counts", cleanParams, {
    ...options,
    schema: FilterCountsResponseSchema,
  });
}

export async function getSearchSuggestions(
  query: string,
  limit: number = 5,
): Promise<string[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }

  logger.log(`Fetching search suggestions for query: "${query}"`);

  try {
    const params = {
      q: query.trim(),
      limit: Math.min(Math.max(limit, 1), 10),
    };

    const suggestions = await get("/api/animals/search/suggestions", params);
    return Array.isArray(suggestions) ? (suggestions as string[]) : [];
  } catch (error) {
    logger.error("Error fetching search suggestions:", error);
    reportError(error, { context: "getSearchSuggestions", query });
    return [];
  }
}

export async function getBreedSuggestions(
  query: string,
  limit: number = 5,
): Promise<string[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }

  logger.log(`Fetching breed suggestions for query: "${query}"`);

  try {
    const params = {
      q: query.trim(),
      limit: Math.min(Math.max(limit, 1), 10),
    };

    const suggestions = await get("/api/animals/breeds/suggestions", params);
    return Array.isArray(suggestions) ? (suggestions as string[]) : [];
  } catch (error) {
    logger.error("Error fetching breed suggestions:", error);
    reportError(error, { context: "getBreedSuggestions", query });
    return [];
  }
}

interface BreedFilters {
  limit?: number;
  offset?: number;
  age?: string;
  sex?: string;
  size?: string;
  good_with_cats?: boolean;
  good_with_dogs?: boolean;
}

export async function getBreedDogs(
  breedSlug: string,
  filters: BreedFilters = {},
): Promise<ApiDog[] | { results: ApiDog[]; total: number }> {
  logger.log(`Fetching dogs for breed: ${breedSlug}`, filters);

  try {
    const breedStats = await get("/api/animals/breeds/stats", {}, {
      schema: BreedStatsSchema,
    });
    const breedData = breedStats.qualifying_breeds?.find(
      (breed) => breed.breed_slug === breedSlug,
    );

    if (!breedData) {
      throw new Error(`Breed not found: ${breedSlug}`);
    }

    const params: AnimalParams = {
      breed: breedData.primary_breed,
      limit: filters.limit || 12,
      offset: filters.offset || 0,
      animal_type: "dog",
      status: "available",
    };

    if (filters.age && filters.age !== "all") params.age = filters.age;
    if (filters.sex && filters.sex !== "all") params.sex = filters.sex;
    if (filters.size && filters.size !== "all") params.size = filters.size;
    if (filters.good_with_cats) params.good_with_cats = true;
    if (filters.good_with_dogs) params.good_with_dogs = true;

    return get<ApiDog[]>("/api/animals", params, {
      schema: z.array(ApiDogSchema),
    });
  } catch (error) {
    logger.error(`Error fetching breed dogs for ${breedSlug}:`, error);
    reportError(error, { context: "getBreedDogs", breedSlug });
    return { results: [], total: 0 };
  }
}

export async function getBreedFilterCounts(
  breedSlug: string,
): Promise<z.infer<typeof FilterCountsResponseSchema> | null> {
  logger.log(`Fetching filter counts for breed: ${breedSlug}`);

  try {
    const breedStats = await get("/api/animals/breeds/stats", {}, {
      schema: BreedStatsSchema,
    });
    const breedData = breedStats.qualifying_breeds?.find(
      (breed) => breed.breed_slug === breedSlug,
    );

    if (!breedData) {
      return null;
    }

    return getFilterCounts({
      breed: breedData.primary_breed,
      animal_type: "dog",
      status: "available",
    });
  } catch (error) {
    logger.error(`Error fetching breed filter counts for ${breedSlug}:`, error);
    reportError(error, { context: "getBreedFilterCounts", breedSlug });
    return null;
  }
}

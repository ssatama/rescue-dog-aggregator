import { z } from "zod";
import { getApiUrl } from "../utils/apiConfig";
import { stripNulls } from "../utils/api";
import { fetchWithRetry } from "../utils/serverFetch";
import { logger, reportError } from "../utils/logger";
import * as Sentry from "@sentry/nextjs";
import {
  ApiDogSchema,
  ApiOrganizationEmbeddedSchema,
  BreedStatsSchema,
  StatisticsSchema,
  CountryStatsResponseSchema,
  EnhancedDogContentItemSchema,
} from "../schemas/animals";
import { FilterCountsResponseSchema } from "../schemas/common";
import type { BreedStats } from "../schemas/animals";
import type { FilterCountsResponse } from "../schemas/common";
import type { Dog } from "../types/dog";
import type { BreedPageData, GalleryDog } from "../types/breeds";
import {
  transformApiDogToDog,
  transformApiDogsToDogs,
} from "../utils/dogTransformer";
import { getBreedDescription } from "../utils/breedDescriptions";

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

const cacheMap = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000;

let functionCounter = 0;
 
const functionIds = new WeakMap<(...args: any[]) => any, number>();

export const clearCache = (): void => {
  cacheMap.clear();
};

 
type AsyncFn = (...args: any[]) => Promise<any>;

const functionIdOf = (fn: AsyncFn): number => {
  if (!functionIds.has(fn)) {
    functionIds.set(fn, functionCounter++);
  }
  return functionIds.get(fn)!;
};

// Memoizes fn for CACHE_TTL. A failure is never stored, so the next call
// tries again.
const memoize = <T extends AsyncFn>(fn: T): T => {
  if (process.env.NODE_ENV === "test") return fn;

  const functionId = functionIdOf(fn);

  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const key = `fn_${functionId}_${JSON.stringify(args)}`;

    const entry = cacheMap.get(key);
    if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
      return entry.data as ReturnType<T>;
    }

    const result = await fn(...args);
    cacheMap.set(key, {
      data: result,
      timestamp: Date.now(),
    });

    if (cacheMap.size > 100) {
      const now = Date.now();
      for (const [k, v] of cacheMap.entries()) {
        if (now - v.timestamp > CACHE_TTL) {
          cacheMap.delete(k);
        }
      }
    }

    return result;
  }) as T;
};

type Cached<T extends AsyncFn> = T & {
  /**
   * The same fetch without the fallback: a failure throws. For ISR pages,
   * where a render that succeeded on fallback data is cached as if it were
   * real, and one that throws keeps the last good page instead (#659).
   */
  orThrow: T;
};

// Only a fetcher with a fallback gets .orThrow: one without already throws,
// or handles its own failure, and .orThrow would promise a throw it can't keep
function cache<T extends AsyncFn>(fn: T): T;
function cache<T extends AsyncFn>(fn: T, errorFallback: Awaited<ReturnType<T>>): Cached<T>;
function cache<T extends AsyncFn>(fn: T, errorFallback?: Awaited<ReturnType<T>>): T | Cached<T> {
  const strict = memoize(fn);
  if (errorFallback === undefined) {
    return strict;
  }

  const context = `cache-fn-${functionIdOf(fn)}`;
  const withFallback = (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      return await strict(...args);
    } catch (error) {
      reportError(error, { context });
      return (
        Array.isArray(errorFallback)
          ? [...errorFallback]
          : typeof errorFallback === "object" && errorFallback !== null
            ? { ...errorFallback }
            : errorFallback
      ) as ReturnType<T>;
    }
  }) as T;

  return Object.assign(withFallback, { orThrow: strict });
}

const API_URL = getApiUrl();

interface AnimalQueryParams {
  limit?: string | number;
  offset?: string | number;
  search?: string;
  size?: string;
  standardized_size?: string;
  age_category?: string;
  sex?: string;
  organization_id?: string | number;
  breed?: string;
  breed_type?: string;
  breed_group?: string;
  primary_breed?: string;
  location_country?: string;
  available_to_country?: string;
  available_to_region?: string;
  experience_level?: string;
  sort_by?: string;
  sort_order?: string;
  sort?: string;
  age_known?: boolean;
  curation_type?: string;
  animal_type?: string;
  status?: string;
}

export const getAnimals = cache(
  async (params: AnimalQueryParams = {}): Promise<Dog[]> => {
    const queryParams = new URLSearchParams();

    if (params.limit) queryParams.append("limit", String(params.limit));
    if (params.offset) queryParams.append("offset", String(params.offset));
    if (params.search) queryParams.append("search", params.search);
    if (params.size) queryParams.append("size", params.size);
    if (params.standardized_size)
      queryParams.append("standardized_size", params.standardized_size);
    if (params.age_category)
      queryParams.append("age_category", params.age_category);
    if (params.sex) queryParams.append("sex", params.sex);
    if (params.organization_id)
      queryParams.append("organization_id", String(params.organization_id));
    if (params.breed) queryParams.append("breed", params.breed);
    if (params.breed_type) queryParams.append("breed_type", params.breed_type);
    if (params.breed_group)
      queryParams.append("breed_group", params.breed_group);
    if (params.primary_breed)
      queryParams.append("primary_breed", params.primary_breed);
    if (params.location_country)
      queryParams.append("location_country", params.location_country);
    if (params.available_to_country)
      queryParams.append("available_to_country", params.available_to_country);
    if (params.available_to_region)
      queryParams.append("available_to_region", params.available_to_region);
    if (params.experience_level) queryParams.append("experience_level", params.experience_level);
    if (params.sort_by) queryParams.append("sort_by", params.sort_by);
    if (params.sort_order) queryParams.append("sort_order", params.sort_order);
    if (params.sort) queryParams.append("sort", params.sort);
    if (params.age_known) queryParams.append("age_known", "true");
    if (params.curation_type)
      queryParams.append("curation_type", params.curation_type);
    if (params.animal_type)
      queryParams.append("animal_type", params.animal_type);
    if (params.status) queryParams.append("status", params.status);

    const url = `${API_URL}/api/animals/?${queryParams.toString()}`;

    const response = await fetchWithRetry(url, {
      next: {
        revalidate: 86400,
        tags: ["animals"],
      },
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch animals: ${response.statusText}`);
    }

    const raw: unknown = await response.json();
    const parsed = z.array(ApiDogSchema).parse(stripNulls(raw));
    return transformApiDogsToDogs(parsed);
  },
  [],
);

export const getStandardizedBreeds = cache(
  async (): Promise<string[]> => {
    const response = await fetchWithRetry(`${API_URL}/api/animals/meta/breeds`, {
      next: {
        revalidate: 86400,
        tags: ["breeds"],
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch breeds: ${response.statusText}`);
    }

    const raw: unknown = await response.json();
    return z.array(z.string()).parse(raw);
  },
  [],
);

export const getLocationCountries = cache(
  async (): Promise<string[]> => {
    const response = await fetchWithRetry(
      `${API_URL}/api/animals/meta/location_countries`,
      {
        next: {
          revalidate: 86400,
          tags: ["location-countries"],
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch location countries: ${response.statusText}`,
      );
    }

    const raw: unknown = await response.json();
    return z.array(z.string()).parse(raw);
  },
  [],
);

export const getAvailableCountries = cache(
  async (): Promise<string[]> => {
    const response = await fetchWithRetry(
      `${API_URL}/api/animals/meta/available_countries`,
      {
        next: {
          revalidate: 86400,
          tags: ["available-countries"],
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch available countries: ${response.statusText}`,
      );
    }

    const raw: unknown = await response.json();
    return z.array(z.string()).parse(raw);
  },
  [],
);

export const getAvailableRegions = cache(
  async (country: string): Promise<string[]> => {
    if (!country || country === "Any country") {
      return [];
    }

    const response = await fetchWithRetry(
      `${API_URL}/api/animals/meta/available_regions?country=${encodeURIComponent(country)}`,
      {
        next: {
          revalidate: 86400,
          tags: ["available-regions", country],
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch regions: ${response.statusText}`);
    }

    const raw: unknown = await response.json();
    return z.array(z.string()).parse(raw);
  },
  [],
);

export const getOrganizations = cache(
  async (): Promise<z.infer<typeof ApiOrganizationEmbeddedSchema>[]> => {
    const response = await fetchWithRetry(`${API_URL}/api/organizations/`, {
      next: {
        revalidate: 86400,
        tags: ["organizations"],
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch organizations: ${response.statusText}`,
      );
    }

    const raw: unknown = await response.json();
    return z.array(ApiOrganizationEmbeddedSchema).parse(stripNulls(raw));
  },
  [],
);

export const getFilterCounts = cache(
  async (
    params: Record<string, string> = {},
  ): Promise<FilterCountsResponse | null> => {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== "") {
        queryParams.append(key, value);
      }
    });

    const response = await fetchWithRetry(
      `${API_URL}/api/animals/meta/filter_counts?${queryParams.toString()}`,
      {
        next: {
          revalidate: 60,
          tags: ["filter-counts"],
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch filter counts: ${response.statusText}`,
      );
    }

    const raw: unknown = await response.json();
    return FilterCountsResponseSchema.parse(stripNulls(raw));
  },
  null,
);

export const getStatistics = cache(
  async (): Promise<z.infer<typeof StatisticsSchema>> => {
    const response = await fetchWithRetry(`${API_URL}/api/animals/statistics`, {
      next: {
        revalidate: 21600,
        tags: ["statistics"],
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch statistics: ${response.statusText}`);
    }

    const raw: unknown = await response.json();
    return StatisticsSchema.parse(stripNulls(raw));
  },
  { total_dogs: 0, total_organizations: 0, countries: [], organizations: [] },
);

export const getBreedStats = cache(
  async (): Promise<BreedStats> => {
    const response = await fetchWithRetry(`${API_URL}/api/animals/breeds/stats`, {
      next: {
        revalidate: 604800,
        tags: ["breed-stats"],
      },
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch breed stats: ${response.statusText}`,
      );
    }

    const raw: unknown = await response.json();
    return BreedStatsSchema.parse(stripNulls(raw));
  },
  {
    total_dogs: 0,
    unique_breeds: 0,
    breed_groups: [],
    qualifying_breeds: [],
    purebred_count: 0,
    crossbreed_count: 0,
    error: true,
  } as BreedStats,
);

export const getAnimalsByCuration = cache(


  async (curationType: string, limit = 4): Promise<Dog[]> => {
    const queryParams = new URLSearchParams({
      curation_type: curationType,
      limit: limit.toString(),
      animal_type: "dog",
      status: "available",
    });

    const response = await fetchWithRetry(
      `${API_URL}/api/animals/?${queryParams.toString()}`,
      {
        next: {
          revalidate: 21600,
          tags: ["animals", `curation-${curationType}`],
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch ${curationType} animals: ${response.statusText}`,
      );
    }

    const raw: unknown = await response.json();
    const parsed = z.array(ApiDogSchema).parse(stripNulls(raw));
    return transformApiDogsToDogs(parsed);
  },
  [],
);

interface AllMetadata {
  standardizedBreeds: string[];
  locationCountries: string[];
  availableCountries: string[];
  organizations: Array<{ id: number | string | null; name: string; slug?: string }>;
}

/**
 * The catalog's filter options. `strict` throws on a failed fetch instead of
 * leaving that filter with only its "Any" option, for pages that must not be
 * cached that way (#659).
 */
export async function getAllMetadata({ strict = false } = {}): Promise<AllMetadata> {
  const pick = <T extends { orThrow: unknown }>(fetcher: T): T | T["orThrow"] =>
    strict ? fetcher.orThrow : fetcher;
  const [breeds, locationCountries, availableCountries, organizations] =
    await Promise.all([
      pick(getStandardizedBreeds)(),
      pick(getLocationCountries)(),
      pick(getAvailableCountries)(),
      pick(getOrganizations)(),
    ]);

  return {
    standardizedBreeds: breeds
      ? ["Any breed", ...breeds.filter((b: string) => b !== "Any breed")]
      : ["Any breed"],
    locationCountries: locationCountries
      ? ["Any country", ...locationCountries]
      : ["Any country"],
    availableCountries: availableCountries
      ? ["Any country", ...availableCountries]
      : ["Any country"],
    organizations: organizations
      ? [
          { id: null, name: "Any organization" } as const,
          ...(Array.isArray(organizations)
            ? organizations.map((org) => ({
                id: org.id ?? null,
                name: org.name,
                slug: org.slug,
              }))
            : []),
        ]
      : [{ id: null, name: "Any organization" }],
  };
}

export const getAllAnimals = cache(
  async (
    params: { limit?: string | number; offset?: string | number } = {},


  ): Promise<Dog[]> => {
    const queryParams = new URLSearchParams();

    if (params.limit) queryParams.append("limit", String(params.limit));
    else queryParams.append("limit", "1000");

    if (params.offset) queryParams.append("offset", String(params.offset));

    const url = `${API_URL}/api/animals/?${queryParams.toString()}`;

    const response = await fetchWithRetry(url, {
      next: {
        revalidate: 3600,
        tags: ["all-animals"],
      },
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch all animals: ${response.statusText}`,
      );
    }

    const raw: unknown = await response.json();
    const parsed = z.array(ApiDogSchema).parse(stripNulls(raw));
    return transformApiDogsToDogs(parsed);
  },
  [],
);

 
// The newest six with a photo and a page, for the breed page's gallery
function pickGalleryDogs(candidateDogs: Dog[], label: string): GalleryDog[] {
  const topDogs = candidateDogs
    .filter((dog): dog is Dog & { slug: string; primary_image_url: string } => Boolean(dog.primary_image_url && dog.slug))
    .slice(0, 6)
    .map((dog) => ({
      name: dog.name,
      slug: dog.slug,
      primary_image_url: dog.primary_image_url,
    }));

  if (topDogs.length === 0 && candidateDogs.length > 0) {
    logger.warn(`No dogs with images found for ${label} out of ${candidateDogs.length} candidates`);
  }
  return topDogs;
}

// Neither of these catches: a failure fails the render, which keeps the last
// good page and reaches Sentry once through onRequestError

/**
 * /breeds/mixed. Null when a good stats response has no Mixed group, i.e. no
 * mixed dogs: the page 404s, as a breed page does when its breed drops out,
 * and returns when a scraper's purge brings the group back. Not memoized, so
 * a null is never held past the stats it came from.
 */
export async function getMixedBreedPageData(): Promise<BreedPageData | null> {
  const [breedStats, candidateDogs] = await Promise.all([
    getBreedStats.orThrow(),
    getAnimals.orThrow({
      breed_group: "Mixed",
      limit: 30,
      sort: "newest",
    }),
  ]);
  const mixedGroup = breedStats.breed_groups?.find((g) => g.name === "Mixed");
  if (!mixedGroup?.count) {
    logger.warn("No Mixed group in the breed stats");
    return null;
  }

  return {
    primary_breed: "Mixed Breed",
    breed_slug: "mixed",
    breed_type: "mixed",
    breed_group: "Mixed",
    count: mixedGroup.count,
    // The group's own: the same dogs as its count
    average_age_months: mixedGroup.average_age_months,
    topDogs: pickGalleryDogs(candidateDogs, "Mixed breeds"),
    description:
      "Every mixed breed is unique! These wonderful dogs combine traits from multiple breeds, creating diverse personalities, unique looks, and often fewer health issues. Each one has their own special story and character.",
  };
}

export const getBreedBySlug = cache(async (slug: string): Promise<BreedPageData | null> => {
  // Not the fallback: it has no breeds, which would read as "no such breed"
  const breedStats = await getBreedStats.orThrow();
  const breedData = breedStats.qualifying_breeds?.find(
    (breed) => breed.breed_slug === slug,
  );

  if (!breedData) {
    logger.warn(`Breed not found in qualifying breeds: ${slug}`);
    return null;
  }

  const candidateDogs = await getAnimals.orThrow({
    primary_breed: breedData.primary_breed,
    limit: 30,
    sort: "newest",
  });

  // Only what the page uses: the stats row carries distributions and
  // personality data that would otherwise ship to every visitor
  return {
    primary_breed: breedData.primary_breed,
    breed_slug: slug,
    breed_group: breedData.breed_group,
    breed_type: breedData.breed_type,
    count: breedData.count,
    average_age_months: breedData.average_age_months,
    topDogs: pickGalleryDogs(candidateDogs, `"${breedData.primary_breed}"`),
    description:
      getBreedDescription(breedData.primary_breed) ||
      `${breedData.primary_breed} dogs are wonderful companions looking for loving homes.`,
  };
});

type ListFilter =
  | { primary_breed: string }
  | { breed_group: string }
  | { organization_id: string }
  | { age_category: string }
  | Record<string, never>;

async function fetchListCounts(listFilter: ListFilter): Promise<FilterCountsResponse | null> {
  // Its own fetch: getFilterCounts revalidates every minute, and a page
  // regenerates at its shortest fetch revalidate, not its own weekly one
  const query = new URLSearchParams({ ...listFilter, age_known: "true" });
  try {
    const response = await fetchWithRetry(`${API_URL}/api/animals/meta/filter_counts?${query.toString()}`, {
      next: { revalidate: 86400, tags: ["list-counts"] },
    });
    if (!response.ok) {
      throw new Error(response.statusText);
    }
    const raw: unknown = await response.json();
    return FilterCountsResponseSchema.parse(stripNulls(raw));
  } catch (error) {
    // The fallback's report is generic: the filter says which list failed
    throw new Error(`Failed to fetch list counts for ${query.toString()}: ${error instanceof Error ? error.message : String(error)}`, {
      cause: error,
    });
  }
}

/**
 * Unfiltered counts for one breed, rescue or age page, or for every dog
 * (country pages) (#500, #501, #502): a breed's practical stats, and how many
 * are adoptable to each country. Ages count only dogs with a recorded age. A
 * failure leaves the counts out; getListCounts.orThrow fails the page instead,
 * for pages that must not be cached without them (the breed pages).
 */
export const getListCounts = cache(fetchListCounts, null);

interface EnhancedContent {
  description: string;
  tagline: string;
}

export const getEnhancedDogContent = cache(
  async (animalId: number | string | null): Promise<EnhancedContent | null> => {
    if (!animalId) return null;

    try {
      const url = `${API_URL}/api/animals/enhanced/detail-content?animal_ids=${animalId}`;

      const response = await fetchWithRetry(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        next: {
          revalidate: 172800,
          tags: ["enhanced", `animal-enhanced-${animalId}`],
        },
      });

      if (!response.ok) {
        logger.warn(`Enhanced content not available for animal ${animalId}`);
        return null;
      }

      const raw: unknown = await response.json();
      const validated = z
        .array(EnhancedDogContentItemSchema)
        .parse(stripNulls(raw));

      const enhanced = validated[0] || null;

      if (
        enhanced?.has_enhanced_data &&
        enhanced.description &&
        enhanced.tagline
      ) {
        return {
          description: enhanced.description,
          tagline: enhanced.tagline,
        };
      }

      return null;
    } catch (error) {
      logger.error(
        `Error fetching enhanced content for animal ${animalId}:`,
        error,
      );
      reportError(error, { context: "getEnhancedDogContent", animalId });
      Sentry.withScope((scope) => {
        scope.setTag("feature", "animals");
        scope.setTag("operation", "getEnhancedDogContent");
        scope.setContext("request", { animalId });
        Sentry.captureException(error);
      });
      return null;
    }
  },
);

export type DogWithLlm = Dog & {
  llm_description?: string;
  llm_tagline?: string;
  has_llm_data?: boolean;
};

export const getAnimalBySlug = cache(async (slug: string): Promise<DogWithLlm | null> => {
  if (!slug) {
    throw new Error("Slug is required");
  }

  try {
    const response = await fetchWithRetry(`${API_URL}/api/animals/${slug}`, {
      next: {
        revalidate: 172800,
        tags: ["animal", slug],
      },
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        logger.log(`Animal not found (404): ${slug}`);
        return null;
      }
      if (response.status >= 500) {
        logger.warn(
          `Server error fetching animal ${slug}: HTTP ${response.status}`,
        );
      }
      throw new Error(`Failed to fetch animal: HTTP ${response.status}`);
    }

    const raw: unknown = await response.json();
    const parsed = ApiDogSchema.parse(stripNulls(raw));
    const animal = transformApiDogToDog(parsed);

    try {
      const enhanced = await getEnhancedDogContent(parsed.id);
      if (enhanced) {
        return {
          ...animal,
          llm_description: enhanced.description,
          llm_tagline: enhanced.tagline,
          has_llm_data: true,
        };
      }
    } catch (enhancedError) {
      logger.warn(`Enhanced content unavailable for ${slug}:`, enhancedError);
      reportError(enhancedError, { context: "getAnimalBySlug.enhanced", slug });
    }

    return animal;
  } catch (error) {
    logger.error(`Error fetching animal ${slug}:`, error);
    reportError(error, { context: "getAnimalBySlug", slug });
    Sentry.withScope((scope) => {
      scope.setTag("feature", "animals");
      scope.setTag("operation", "getAnimalBySlug");
      scope.setContext("request", { slug });
      Sentry.captureException(error);
    });
    throw error;
  }
});

export const getCountryStats = cache(
  async (): Promise<z.infer<typeof CountryStatsResponseSchema>> => {
    const response = await fetchWithRetry(`${API_URL}/api/animals/stats/by-country`, {
      next: {
        revalidate: 86400,
        tags: ["country-stats"],
      },
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch country stats: ${response.statusText}`,
      );
    }

    const raw: unknown = await response.json();
    return CountryStatsResponseSchema.parse(stripNulls(raw));
  },
  { total: 0, countries: [] },
);

interface AgeCategory {
  slug: string;
  apiValue: string;
  count: number;
}

interface AgeStats {
  total: number;
  ageCategories: AgeCategory[];
}

export const getAgeStats = cache(
  async (): Promise<AgeStats> => {
    // Puppy and senior pages promise an age, so dogs without one are not counted
    const response = await fetchWithRetry(`${API_URL}/api/animals/meta/filter_counts?age_known=true`, {
      next: {
        revalidate: 86400,
        tags: ["age-stats"],
      },
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch age stats: ${response.statusText}`);
    }

    const raw: unknown = await response.json();
    const data = FilterCountsResponseSchema.parse(stripNulls(raw));

    const ageOptions = data?.age_options || [];
    const puppyOption = ageOptions.find((opt) => opt.value === "Puppy");
    const seniorOption = ageOptions.find((opt) => opt.value === "Senior");

    const ageCategories: AgeCategory[] = [
      { slug: "puppies", apiValue: "Puppy", count: puppyOption?.count || 0 },
      { slug: "senior", apiValue: "Senior", count: seniorOption?.count || 0 },
    ];

    const total = ageCategories.reduce((sum, cat) => sum + cat.count, 0);

    return {
      total,
      ageCategories,
    };
  },
  {
    total: 0,
    ageCategories: [
      { slug: "puppies", apiValue: "Puppy", count: 0 },
      { slug: "senior", apiValue: "Senior", count: 0 },
    ],
  },
);

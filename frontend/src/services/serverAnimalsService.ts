import { z } from "zod";
import { getApiUrl } from "../utils/apiConfig";
import { stripNulls } from "../utils/api";
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
import type { BreedPageData, SampleDog, PersonalityMetrics } from "../types/breeds";
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

const cache = <T extends AsyncFn>(
  fn: T,
  errorFallback?: Awaited<ReturnType<T>>,
): T => {
  if (process.env.NODE_ENV === "test") {
    if (errorFallback === undefined) return fn;
    const withFallback = (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      try {
        return await fn(...args);
      } catch (error) {
        reportError(error, { context: "cache-test-fallback" });
        const cloned = Array.isArray(errorFallback)
          ? ([...errorFallback] as ReturnType<T>)
          : typeof errorFallback === "object" && errorFallback !== null
            ? ({ ...errorFallback } as ReturnType<T>)
            : (errorFallback as ReturnType<T>);
        return cloned;
      }
    }) as T;
    return withFallback;
  }

  if (!functionIds.has(fn)) {
    functionIds.set(fn, functionCounter++);
  }
  const functionId = functionIds.get(fn);

  const cached = (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const key = `fn_${functionId}_${JSON.stringify(args)}`;

    const entry = cacheMap.get(key);
    if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
      return entry.data as ReturnType<T>;
    }

    try {
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
    } catch (error) {
      if (errorFallback !== undefined) {
        reportError(error, { context: `cache-fn-${functionId}` });
        const cloned = Array.isArray(errorFallback)
          ? ([...errorFallback] as ReturnType<T>)
          : typeof errorFallback === "object" && errorFallback !== null
            ? ({ ...errorFallback } as ReturnType<T>)
            : (errorFallback as ReturnType<T>);
        return cloned;
      }
      throw error;
    }
  }) as T;

  return cached;
};

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
  sort_by?: string;
  sort_order?: string;
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
    if (params.sort_by) queryParams.append("sort_by", params.sort_by);
    if (params.sort_order) queryParams.append("sort_order", params.sort_order);
    if (params.curation_type)
      queryParams.append("curation_type", params.curation_type);
    if (params.animal_type)
      queryParams.append("animal_type", params.animal_type);
    if (params.status) queryParams.append("status", params.status);

    const url = `${API_URL}/api/animals/?${queryParams.toString()}`;

    const response = await fetch(url, {
      next: {
        revalidate: 300,
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
    const response = await fetch(`${API_URL}/api/animals/meta/breeds/`, {
      next: {
        revalidate: 3600,
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
    const response = await fetch(
      `${API_URL}/api/animals/meta/location_countries`,
      {
        next: {
          revalidate: 3600,
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
    const response = await fetch(
      `${API_URL}/api/animals/meta/available_countries`,
      {
        next: {
          revalidate: 3600,
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

    const response = await fetch(
      `${API_URL}/api/animals/meta/available_regions?country=${encodeURIComponent(country)}`,
      {
        next: {
          revalidate: 3600,
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
    const response = await fetch(`${API_URL}/api/organizations/`, {
      next: {
        revalidate: 3600,
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

    const response = await fetch(
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
    const response = await fetch(`${API_URL}/api/animals/statistics`, {
      next: {
        revalidate: 300,
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
    const response = await fetch(`${API_URL}/api/animals/breeds/stats`, {
      next: {
        revalidate: 3600,
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

    const response = await fetch(
      `${API_URL}/api/animals/?${queryParams.toString()}`,
      {
        next: {
          revalidate: 300,
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

interface HomePageData {
  statistics: z.infer<typeof StatisticsSchema>;
  recentDogs: Dog[];
  diverseDogs: Dog[];
  fetchedAt: string;
  error?: boolean;
}

export async function getHomePageData(): Promise<HomePageData> {
  const [statistics, recentDogs, diverseDogs] = await Promise.all([
    getStatistics(),
    getAnimalsByCuration("recent", 8),
    getAnimalsByCuration("diverse", 4),
  ]);

  return {
    statistics,
    recentDogs,
    diverseDogs,
    fetchedAt: new Date().toISOString(),
  };
}

interface AllMetadata {
  standardizedBreeds: string[];
  locationCountries: string[];
  availableCountries: string[];
  organizations: Array<{ id: number | string | null; name: string; slug?: string }>;
}

export async function getAllMetadata(): Promise<AllMetadata> {
  const [breeds, locationCountries, availableCountries, organizations] =
    await Promise.all([
      getStandardizedBreeds(),
      getLocationCountries(),
      getAvailableCountries(),
      getOrganizations(),
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

    const response = await fetch(url, {
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

 
export const getBreedBySlug = cache(async (slug: string): Promise<BreedPageData | null> => {
  try {
    if (slug === "mixed") {
      const breedStats = await getBreedStats();
      const mixedGroup = (
        breedStats.breed_groups as { name: string; count: number }[] | undefined
      )?.find((g) => g.name === "Mixed");

      const candidateDogs = await getAnimals({
        breed_group: "Mixed",
        limit: 30,
        sort_by: "created_at",
        sort_order: "desc",
      });
      const topDogs: SampleDog[] = candidateDogs
        .filter((dog: Dog) => dog.primary_image_url && dog.slug)
        .slice(0, 6)
        .map((dog) => ({
          name: dog.name,
          slug: dog.slug!,
          primary_image_url: dog.primary_image_url,
        }));

      if (topDogs.length === 0 && candidateDogs.length > 0) {
        logger.warn(`No dogs with images found for Mixed breeds out of ${candidateDogs.length} candidates`);
      }

      const allMixedDogs = await getAnimals({
        breed_group: "Mixed",
        limit: 200,
      });

      const organizationSet = new Set<string>();
      const countrySet = new Set<string>();

      if (breedStats?.qualifying_breeds) {
        breedStats.qualifying_breeds.forEach((breed) => {
          if (breed.breed_group === "Mixed" || breed.breed_type === "mixed") {
            if (breed.organizations) {
              breed.organizations.forEach((org: unknown) =>
                organizationSet.add(String(org)),
              );
            }
            if (breed.countries) {
              breed.countries.forEach((country: string) =>
                countrySet.add(country),
              );
            }
          }
        });
      }

      const personalityAggregation: Record<string, number> = {
        energy_level: 0,
        affection: 0,
        trainability: 0,
        independence: 0,
      };

      const personalityCount: Record<string, number> = {
        energy_level: 0,
        affection: 0,
        trainability: 0,
        independence: 0,
      };

      const traitsMap = new Map<string, number>();

      let totalAgeMonths = 0;
      let ageCount = 0;

       
      allMixedDogs.forEach((dog) => {
        if (dog.organization_id) {
          organizationSet.add(String(dog.organization_id));
        }

        if (dog.organization?.country) {
          countrySet.add(dog.organization.country);
        } else if (dog.available_country) {
          countrySet.add(dog.available_country);
        } else if (dog.country) {
          countrySet.add(dog.country);
        }

        if (dog.age_min_months && dog.age_max_months) {
          const avgAge = (dog.age_min_months + dog.age_max_months) / 2;
          totalAgeMonths += avgAge;
          ageCount++;
        }

        if (dog.properties) {
          ["energy_level", "affection", "trainability", "independence"].forEach(
            (trait) => {
              if (
                dog.properties?.[trait] !== undefined &&
                dog.properties?.[trait] !== null
              ) {
                const value = Number(dog.properties?.[trait]);
                if (!isNaN(value) && value >= 0 && value <= 100) {
                  personalityAggregation[trait] += value;
                  personalityCount[trait]++;
                }
              }
            },
          );

          if (dog.properties.personality_traits) {
            const traits = Array.isArray(dog.properties.personality_traits)
              ? dog.properties.personality_traits
              : [dog.properties.personality_traits];
            traits.forEach((trait: unknown) => {
              if (trait && typeof trait === "string") {
                traitsMap.set(trait, (traitsMap.get(trait) || 0) + 1);
              }
            });
          }
        }
      });

      const getMetric = (trait: string): { percentage: number; label: string } => {
        const defaults: Record<string, number> = {
          energy_level: 60, affection: 80, trainability: 70, independence: 50,
        };
        const percentage = personalityCount[trait] > 0
          ? Math.round(personalityAggregation[trait] / personalityCount[trait])
          : (defaults[trait] ?? 50);

        const label =
          percentage <= 20 ? "Very Low" :
          percentage <= 40 ? "Low" :
          percentage <= 60 ? "Medium" :
          percentage <= 80 ? "High" : "Very High";

        return { percentage, label };
      };

      const personalityMetrics: PersonalityMetrics = {
        energy_level: getMetric("energy_level"),
        affection: getMetric("affection"),
        trainability: getMetric("trainability"),
        independence: getMetric("independence"),
      };

      const commonTraits = Array.from(traitsMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([trait]) => trait);

      if (commonTraits.length === 0) {
        commonTraits.push(
          "Affectionate",
          "Gentle",
          "Loyal",
          "Smart",
          "Loving",
        );
      }

      const experienceDistribution = {
        first_time_ok: 0,
        some_experience: 0,
        experienced: 0,
      };

      allMixedDogs.forEach((dog) => {
        if (dog.properties?.experience_level) {
          const level = dog.properties.experience_level as string;
          if (level === "first_time_ok") {
            experienceDistribution.first_time_ok++;
          } else if (level === "some_experience") {
            experienceDistribution.some_experience++;
          } else if (level === "experienced") {
            experienceDistribution.experienced++;
          }
        }
      });

      const avgAgeMonths =
        ageCount > 0 ? Math.round(totalAgeMonths / ageCount) : 36;

      return {
        primary_breed: "Mixed Breed",
        breed_slug: "mixed",
        breed_type: "mixed",
        breed_group: "Mixed",
        count: mixedGroup?.count || 0,
        organizations: Array.from(organizationSet).slice(0, 10).map(String),
        countries: Array.from(countrySet),
        topDogs: topDogs,
        description:
          "Every mixed breed is unique! These wonderful dogs combine traits from multiple breeds, creating diverse personalities, unique looks, and often fewer health issues. Each one has their own special story and character.",
        personality_metrics: personalityMetrics,
        personality_traits: commonTraits,
        experience_distribution: experienceDistribution,
        average_age: avgAgeMonths / 12,
        average_age_months: avgAgeMonths,
      };
    }

    const breedStats = await getBreedStats();
     
    const breedData = breedStats.qualifying_breeds?.find(
      (breed) => breed.breed_slug === slug,
    );

    if (!breedData) {
      logger.warn(`Breed not found in qualifying breeds: ${slug}`);
      return null;
    }

    const candidateDogs = await getAnimals({
      breed: breedData.primary_breed,
      limit: 30,
      sort_by: "created_at",
      sort_order: "desc",
    });
    const topDogs: SampleDog[] = candidateDogs
      .filter((dog: Dog) => dog.primary_image_url && dog.slug)
      .slice(0, 6)
      .map((dog) => ({
        name: dog.name,
        slug: dog.slug!,
        primary_image_url: dog.primary_image_url,
      }));

    if (topDogs.length === 0 && candidateDogs.length > 0) {
      logger.warn(`No dogs with images found for "${breedData.primary_breed}" out of ${candidateDogs.length} candidates`);
    }

    return {
      ...breedData,
      breed_slug: slug,
      topDogs,
      description:
        getBreedDescription(breedData.primary_breed) ||
        `${breedData.primary_breed} dogs are wonderful companions looking for loving homes.`,
    };
  } catch (error) {
    logger.error(`Error fetching breed data for ${slug}:`, error);
    reportError(error, { context: "getBreedBySlug", slug });
    Sentry.withScope((scope) => {
      scope.setTag("feature", "animals");
      scope.setTag("operation", "getBreedBySlug");
      scope.setContext("request", { slug });
      Sentry.captureException(error);
    });
    throw error;
  }
});

type BreedDogFilters = Partial<AnimalQueryParams>;

export const getBreedDogs = cache(
  async (
    breedSlug: string,
    filters: BreedDogFilters = {},


  ): Promise<Dog[]> => {
    const breedStats = await getBreedStats();
    const breedData = breedStats.qualifying_breeds?.find(
      (breed) => breed.breed_slug === breedSlug,
    );

    if (!breedData) {
      throw new Error(`Breed not found: ${breedSlug}`);
    }

    const params: AnimalQueryParams = {
      breed: breedData.primary_breed,
      limit: filters.limit || 12,
      offset: filters.offset || 0,
      ...filters,
    };

    return getAnimals(params);
  },
  [],
);

export const getBreedFilterCounts = cache(
  async (breedSlug: string): Promise<FilterCountsResponse | null> => {
    try {
      const breedStats = await getBreedStats();
       
      const breedData = breedStats.qualifying_breeds?.find(
        (breed) => breed.breed_slug === breedSlug,
      );

      if (!breedData) {
        return null;
      }

      return getFilterCounts({
        breed: breedData.primary_breed,
      });
    } catch (error) {
      logger.error(
        `Error fetching breed filter counts for ${breedSlug}:`,
        error,
      );
      reportError(error, { context: "getBreedFilterCounts", breedSlug });
      Sentry.withScope((scope) => {
        scope.setTag("feature", "animals");
        scope.setTag("operation", "getBreedFilterCounts");
        scope.setContext("request", { breedSlug });
        Sentry.captureException(error);
      });
      return null;
    }
  },
);

interface EnhancedContent {
  description: string;
  tagline: string;
}

export const getEnhancedDogContent = cache(
  async (animalId: number | string | null): Promise<EnhancedContent | null> => {
    if (!animalId) return null;

    try {
      const url = `${API_URL}/api/animals/enhanced/detail-content?animal_ids=${animalId}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        next: {
          revalidate: 300,
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
    const response = await fetch(`${API_URL}/api/animals/${slug}/`, {
      next: {
        revalidate: 300,
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
    const response = await fetch(`${API_URL}/api/animals/stats/by-country`, {
      next: {
        revalidate: 300,
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
    const response = await fetch(`${API_URL}/api/animals/meta/filter_counts`, {
      next: {
        revalidate: 300,
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

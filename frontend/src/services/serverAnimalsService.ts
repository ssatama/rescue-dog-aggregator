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
import type { BreedStats, ApiDogParsed } from "../schemas/animals";
import type { FilterCountsResponse } from "../schemas/common";

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

const cache = <T extends AsyncFn>(fn: T): T => {
  if (process.env.NODE_ENV === "test") {
    return fn;
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

    const result = await fn(...args);

    const isErrorResult =
      result != null &&
      typeof result === "object" &&
      !Array.isArray(result) &&
      (result as Record<string, unknown>).error === true;

    if (!isErrorResult) {
      cacheMap.set(key, {
        data: result,
        timestamp: Date.now(),
      });
    }

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
   
  async (params: AnimalQueryParams = {}): Promise<any[]> => {
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

    try {
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
      return z.array(ApiDogSchema).parse(stripNulls(raw));
    } catch (error) {
      logger.error("Error fetching animals:", error);
      reportError(error, { url, context: "getAnimals" });
      Sentry.withScope((scope) => {
        scope.setTag("feature", "animals");
        scope.setTag("operation", "getAnimals");
        Sentry.captureException(error);
      });
      return [];
    }
  },
);

export const getStandardizedBreeds = cache(
  async (): Promise<string[]> => {
    try {
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
    } catch (error) {
      logger.error("Error fetching breeds:", error);
      reportError(error, { context: "getStandardizedBreeds" });
      Sentry.withScope((scope) => {
        scope.setTag("feature", "animals");
        scope.setTag("operation", "getStandardizedBreeds");
        Sentry.captureException(error);
      });
      return [];
    }
  },
);

export const getLocationCountries = cache(
  async (): Promise<string[]> => {
    try {
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
    } catch (error) {
      logger.error("Error fetching location countries:", error);
      reportError(error, { context: "getLocationCountries" });
      Sentry.withScope((scope) => {
        scope.setTag("feature", "animals");
        scope.setTag("operation", "getLocationCountries");
        Sentry.captureException(error);
      });
      return [];
    }
  },
);

export const getAvailableCountries = cache(
  async (): Promise<string[]> => {
    try {
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
    } catch (error) {
      logger.error("Error fetching available countries:", error);
      reportError(error, { context: "getAvailableCountries" });
      Sentry.withScope((scope) => {
        scope.setTag("feature", "animals");
        scope.setTag("operation", "getAvailableCountries");
        Sentry.captureException(error);
      });
      return [];
    }
  },
);

export const getAvailableRegions = cache(
  async (country: string): Promise<string[]> => {
    if (!country || country === "Any country") {
      return [];
    }

    try {
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
    } catch (error) {
      logger.error("Error fetching regions:", error);
      reportError(error, { context: "getAvailableRegions", country });
      Sentry.withScope((scope) => {
        scope.setTag("feature", "animals");
        scope.setTag("operation", "getAvailableRegions");
        Sentry.captureException(error);
      });
      return [];
    }
  },
);

export const getOrganizations = cache(
  async (): Promise<z.infer<typeof ApiOrganizationEmbeddedSchema>[]> => {
    try {
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
    } catch (error) {
      logger.error("Error fetching organizations:", error);
      reportError(error, { context: "getOrganizations" });
      Sentry.withScope((scope) => {
        scope.setTag("feature", "animals");
        scope.setTag("operation", "getOrganizations");
        Sentry.captureException(error);
      });
      return [];
    }
  },
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

    try {
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
    } catch (error) {
      logger.error("Error fetching filter counts:", error);
      reportError(error, { context: "getFilterCounts" });
      Sentry.withScope((scope) => {
        scope.setTag("feature", "animals");
        scope.setTag("operation", "getFilterCounts");
        Sentry.captureException(error);
      });
      return null;
    }
  },
);

export const getStatistics = cache(
  async (): Promise<z.infer<typeof StatisticsSchema>> => {
    try {
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
    } catch (error) {
      logger.error("Error fetching statistics:", error);
      reportError(error, { context: "getStatistics" });
      Sentry.withScope((scope) => {
        scope.setTag("feature", "animals");
        scope.setTag("operation", "getStatistics");
        Sentry.captureException(error);
      });
      return {
        total_dogs: 0,
        total_organizations: 0,
        countries: [],
        organizations: [],
      };
    }
  },
);

export const getBreedStats = cache(
  async (): Promise<BreedStats> => {
    try {
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
    } catch (error) {
      logger.error("Error fetching breed stats:", error);
      reportError(error, { context: "getBreedStats" });
      Sentry.withScope((scope) => {
        scope.setTag("feature", "animals");
        scope.setTag("operation", "getBreedStats");
        Sentry.captureException(error);
      });
      return {
        total_dogs: 0,
        unique_breeds: 0,
        breed_groups: [],
        qualifying_breeds: [],
        purebred_count: 0,
        crossbreed_count: 0,
        error: true,
      } as BreedStats;
    }
  },
);

export const getAnimalsByCuration = cache(
   
   
  async (curationType: string, limit = 4): Promise<any[]> => {
    try {
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
      return z.array(ApiDogSchema).parse(stripNulls(raw));
    } catch (error) {
      logger.error(`Error fetching ${curationType} animals:`, error);
      reportError(error, { curationType, context: "getAnimalsByCuration" });
      Sentry.withScope((scope) => {
        scope.setTag("feature", "animals");
        scope.setTag("operation", "getAnimalsByCuration");
        Sentry.captureException(error);
      });
      return [];
    }
  },
);

interface HomePageData {
  statistics: z.infer<typeof StatisticsSchema>;
   
  recentDogs: any[];
   
  diverseDogs: any[];
  fetchedAt: string;
  error?: boolean;
}

export const getHomePageData = cache(
  async (): Promise<HomePageData> => {
    try {
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
    } catch (error) {
      logger.error("Error fetching home page data:", error);
      reportError(error, { context: "getHomePageData" });
      Sentry.withScope((scope) => {
        scope.setTag("feature", "animals");
        scope.setTag("operation", "getHomePageData");
        Sentry.captureException(error);
      });
      return {
        statistics: {
          total_dogs: 0,
          total_organizations: 0,
          countries: [],
          organizations: [],
        },
        recentDogs: [],
        diverseDogs: [],
        fetchedAt: new Date().toISOString(),
        error: true,
      };
    }
  },
);

interface AllMetadata {
  standardizedBreeds: string[];
  locationCountries: string[];
  availableCountries: string[];
   
  organizations: any[];
}

export const getAllMetadata = cache(
  async (): Promise<AllMetadata> => {
    try {
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
              { id: null, name: "Any organization" },
              ...(Array.isArray(organizations) ? organizations : []),
            ]
          : [{ id: null, name: "Any organization" }],
      };
    } catch (error) {
      logger.error("Error fetching metadata:", error);
      reportError(error, { context: "getAllMetadata" });
      Sentry.withScope((scope) => {
        scope.setTag("feature", "animals");
        scope.setTag("operation", "getAllMetadata");
        Sentry.captureException(error);
      });
      return {
        standardizedBreeds: ["Any breed"],
        locationCountries: ["Any country"],
        availableCountries: ["Any country"],
        organizations: [{ id: null, name: "Any organization" }],
      };
    }
  },
);

export const getAllAnimals = cache(
  async (
    params: { limit?: string | number; offset?: string | number } = {},
     
   
  ): Promise<any[]> => {
    try {
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
      return z.array(ApiDogSchema).parse(stripNulls(raw));
    } catch (error) {
      logger.error("Error fetching all animals:", error);
      reportError(error, { context: "getAllAnimals" });
      Sentry.withScope((scope) => {
        scope.setTag("feature", "animals");
        scope.setTag("operation", "getAllAnimals");
        Sentry.captureException(error);
      });
      return [];
    }
  },
);

 
export const getBreedBySlug = cache(async (slug: string): Promise<any | null> => {
  try {
    if (slug === "mixed") {
      const breedStats = await getBreedStats();
      const mixedGroup = (
        breedStats.breed_groups as { name: string; count: number }[] | undefined
      )?.find((g) => g.name === "Mixed");

      const topDogs = await getAnimals({
        breed_group: "Mixed",
        limit: 6,
        sort_by: "created_at",
        sort_order: "desc",
      });

      const allMixedDogs = await getAnimals({
        breed_group: "Mixed",
        limit: 200,
      });

       
       
      const dogsArray = allMixedDogs as any[];

      const organizationSet = new Set<unknown>();
      const countrySet = new Set<string>();

      if (breedStats?.qualifying_breeds) {
        breedStats.qualifying_breeds.forEach((breed) => {
          if (breed.breed_group === "Mixed" || breed.breed_type === "mixed") {
            if (breed.organizations) {
              breed.organizations.forEach((org: unknown) =>
                organizationSet.add(org),
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
      let minAge = Infinity;
      let maxAge = 0;

       
      dogsArray.forEach((dog) => {
        if (dog.organization_id) {
          organizationSet.add(dog.organization_id);
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
          minAge = Math.min(minAge, dog.age_min_months);
          maxAge = Math.max(maxAge, dog.age_max_months);
        }

        if (dog.properties) {
          ["energy_level", "affection", "trainability", "independence"].forEach(
            (trait) => {
              if (
                dog.properties[trait] !== undefined &&
                dog.properties[trait] !== null
              ) {
                const value = Number(dog.properties[trait]);
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

      const personalityProfile: Record<string, number> = {};
      const personalityMetrics: Record<
        string,
        { percentage: number; label: string }
      > = {};

      Object.keys(personalityAggregation).forEach((trait) => {
        let percentage: number;
        if (personalityCount[trait] > 0) {
          percentage = Math.round(
            personalityAggregation[trait] / personalityCount[trait],
          );
        } else {
          percentage =
            trait === "energy_level"
              ? 60
              : trait === "affection"
                ? 80
                : trait === "trainability"
                  ? 70
                  : trait === "independence"
                    ? 50
                    : 50;
        }

        personalityProfile[trait] = percentage;

        let label: string;
        if (percentage <= 20) label = "Very Low";
        else if (percentage <= 40) label = "Low";
        else if (percentage <= 60) label = "Medium";
        else if (percentage <= 80) label = "High";
        else label = "Very High";

        personalityMetrics[trait] = {
          percentage,
          label,
        };
      });

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

      const experienceMap = new Map<string, number>();
       
      dogsArray.forEach((dog) => {
        if (dog.properties?.experience_level) {
          const level = dog.properties.experience_level as string;
          experienceMap.set(level, (experienceMap.get(level) || 0) + 1);
        }
      });

      const experienceDistribution = Array.from(experienceMap.entries()).map(
        ([level, count]) => ({
          level,
          count,
          percentage: Math.round((count / dogsArray.length) * 100),
        }),
      );

      const ageCategories: Record<string, number> = {
        Puppy: 0,
        Young: 0,
        Adult: 0,
        Senior: 0,
      };
       
      dogsArray.forEach((dog) => {
        if (dog.age_category) {
          ageCategories[dog.age_category] =
            (ageCategories[dog.age_category] || 0) + 1;
        }
      });

      const avgAgeMonths =
        ageCount > 0 ? Math.round(totalAgeMonths / ageCount) : 36;
      const avgAgeYears = Math.floor(avgAgeMonths / 12);
      const avgAgeText =
        avgAgeYears === 0
          ? `${avgAgeMonths} months`
          : avgAgeYears === 1
            ? "1 year"
            : `${avgAgeYears} years`;

       
      const organizationsCount =
        organizationSet.size > 0 ? organizationSet.size : 10;
      const countriesCount =
        countrySet.size > 0 ? countrySet.size : 2;

      return {
        primary_breed: "Mixed Breed",
        breed_slug: "mixed",
        breed_type: "mixed",
        breed_group: "Mixed",
        count: mixedGroup?.count || 0,
        organizations: Array.from(organizationSet).slice(0, 10),
        countries: Array.from(countrySet),
        organization_count: organizationsCount,
        country_count: countriesCount,
        topDogs: topDogs,
        description:
          "Every mixed breed is unique! These wonderful dogs combine traits from multiple breeds, creating diverse personalities, unique looks, and often fewer health issues. Each one has their own special story and character.",
        personality_profile: personalityProfile,
        personality_metrics: personalityMetrics,
        personality_traits: commonTraits,
        experience_distribution: experienceDistribution,
        age_distribution: ageCategories,
        average_age: avgAgeText,
        average_age_months: avgAgeMonths,
        available_count: mixedGroup?.count || 0,
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

    const topDogs = await getAnimals({
      breed: breedData.primary_breed,
      limit: 6,
      sort_by: "created_at",
      sort_order: "desc",
    });

    const breedDescriptions: Record<string, string> = {
      galgo:
        "Spanish Greyhounds are gentle sighthounds known for their calm, affectionate nature. Despite their athletic build, they're surprisingly lazy, preferring short bursts of exercise followed by long naps.",
      lurcher:
        "Lurchers are gentle sighthound crosses that combine speed with intelligence. These 'part-time athletes' are calm indoors but love a good sprint, making wonderful family companions.",
      greyhound:
        "Greyhounds are gentle giants known as '45 mph couch potatoes.' Despite their racing background, they're calm indoor companions who need surprisingly little exercise.",
      collie:
        "Collies are intelligent, loyal herding dogs famous for their devotion to family. These sensitive souls are excellent with children and make wonderful family pets.",
      "cocker-spaniel":
        "Cocker Spaniels are cheerful, affectionate dogs with gentle temperaments. These medium-sized companions are known for their beautiful, silky coats and expressive eyes.",
      "cavalier-king-charles-spaniel":
        "Cavalier King Charles Spaniels are gentle, affectionate toy spaniels perfect for companionship. They're equally happy on adventures or cuddling on laps.",
      "staffordshire-bull-terrier":
        "Staffordshire Bull Terriers are muscular, affectionate dogs known for their love of people and legendary devotion to family, especially children.",
      bulldog:
        "Bulldogs are gentle, affectionate companions known for their distinctive wrinkled faces. Despite their tough appearance, they're sweet-natured and excellent with children.",
      "french-bulldog":
        "French Bulldogs are charming, affectionate companions perfect for apartment living. These adaptable dogs are known for their distinctive 'bat ears' and playful personalities.",
      "labrador-retriever":
        "Labrador Retrievers are friendly, outgoing, and active companions who famously love water and retrieving games. They're excellent family dogs with a gentle nature.",
      "german-shepherd":
        "German Shepherds are versatile, intelligent working dogs devoted to their family. They're confident, courageous, and excel at everything they're trained to do.",
      "german-shepherd-dog":
        "German Shepherds are versatile, intelligent working dogs devoted to their family. They're confident, courageous, and excel at everything they're trained to do.",
      "mixed-breed":
        "Mixed breed dogs combine the best traits of multiple breeds, often resulting in unique personalities and appearances. Each one is truly one-of-a-kind.",
      podenco:
        "Podencos are ancient Spanish hunting dogs with keen senses and athletic builds. They're intelligent, independent, and make loyal companions when given proper exercise.",
      husky:
        "Siberian Huskies are energetic, intelligent dogs bred for endurance in harsh climates. They're friendly, dignified, and known for their striking blue eyes.",
      "siberian-husky":
        "Siberian Huskies are energetic, intelligent dogs bred for endurance in harsh climates. They're friendly, dignified, and known for their striking blue eyes.",
      boxer:
        "Boxers are playful, energetic dogs with patience and protective instincts. They're excellent with children and make devoted family guardians.",
      beagle:
        "Beagles are friendly, curious hounds with excellent noses and happy-go-lucky personalities. They're great with kids and other dogs.",
      "golden-retriever":
        "Golden Retrievers are intelligent, friendly, and devoted companions. They're eager to please and excel as family dogs and service animals.",
      pointer:
        "Pointers are energetic, even-tempered dogs bred for hunting. They're loyal, hardworking, and make excellent companions for active families.",
      "jack-russell-terrier":
        "Jack Russell Terriers are small dogs with enormous personalities and endless energy. These fearless terriers are intelligent but independent, requiring experienced owners who can match their wit and provide extensive exercise.",
      "shih-tzu":
        "Shih Tzus are affectionate lap dogs with cheerful dispositions, originally bred for Chinese royalty. These adaptable companions are excellent for apartment living and love being the center of attention.",
      "bichon-frise":
        "Bichon Frises are cheerful, fluffy companions with hypoallergenic coats and merry personalities. These adaptable dogs are excellent with children and make delightful family pets who love to be pampered.",
      chihuahua:
        "Chihuahuas are tiny dogs with giant personalities and fierce loyalty to their families. Despite their small size, they're confident watchdogs who make devoted companions for patient owners.",
      terrier:
        "Terriers are spirited, energetic dogs originally bred for hunting vermin. These confident, feisty companions are intelligent and loyal but need consistent training and plenty of mental stimulation.",
      spaniel:
        "Spaniels are gentle, affectionate sporting dogs known for their beautiful coats and loving temperaments. These versatile companions are excellent family dogs who enjoy both active adventures and quiet cuddles.",
    };

    return {
      ...breedData,
      breed_slug: slug,
      topDogs: topDogs,
      description:
        breedDescriptions[slug] ||
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
     
   
  ): Promise<any[]> => {
    try {
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
    } catch (error) {
      logger.error(`Error fetching breed dogs for ${breedSlug}:`, error);
      reportError(error, { context: "getBreedDogs", breedSlug });
      Sentry.withScope((scope) => {
        scope.setTag("feature", "animals");
        scope.setTag("operation", "getBreedDogs");
        scope.setContext("request", { breedSlug });
        Sentry.captureException(error);
      });
      return [];
    }
  },
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

 
type ApiDogWithLlm = ApiDogParsed & {
  llm_description?: string;
  llm_tagline?: string;
  has_llm_data?: boolean;
};

export const getAnimalBySlug = cache(async (slug: string): Promise<ApiDogWithLlm | null> => {
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
      throw new Error(`Failed to fetch animal: HTTP ${response.status}`);
    }

    const raw: unknown = await response.json();
    const animal = ApiDogSchema.parse(stripNulls(raw));

    try {
      const enhanced = await getEnhancedDogContent(animal.id);
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
    try {
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
    } catch (error) {
      logger.error("Error fetching country stats:", error);
      reportError(error, { context: "getCountryStats" });
      Sentry.withScope((scope) => {
        scope.setTag("feature", "animals");
        scope.setTag("operation", "getCountryStats");
        Sentry.captureException(error);
      });
      return {
        total: 0,
        countries: [],
      };
    }
  },
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

export const getAgeStats = cache(async (): Promise<AgeStats> => {
  try {
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
  } catch (error) {
    logger.error("Error fetching age stats:", error);
    reportError(error, { context: "getAgeStats" });
    Sentry.withScope((scope) => {
      scope.setTag("feature", "animals");
      scope.setTag("operation", "getAgeStats");
      Sentry.captureException(error);
    });
    return {
      total: 0,
      ageCategories: [
        { slug: "puppies", apiValue: "Puppy", count: 0 },
        { slug: "senior", apiValue: "Senior", count: 0 },
      ],
    };
  }
});

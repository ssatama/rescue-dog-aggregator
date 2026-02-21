import { z } from "zod";
import { getApiUrl } from "../utils/apiConfig";
import type { ApiDog } from "../types/apiDog";
import type { Dog } from "../types/dog";
import type { SwipeFilters } from "../hooks/useSwipeFilters";
import { transformApiDogsToDogs } from "../utils/dogTransformer";
import { getCountryFlag } from "../utils/countryUtils";
import { stripNulls } from "../utils/api";
import { SwipeResponseSchema } from "../schemas/animals";
import { SwipeCountrySchema } from "../schemas/swipe";
import { logger, reportError } from "../utils/logger";
import * as Sentry from "@sentry/nextjs";

const API_URL = getApiUrl();

export interface CountryOption {
  value: string;
  label: string;
  flag: string;
  count: number;
}

export interface SwipeDogsResponse {
  dogs: Dog[];
  total: number;
}

export async function getSwipeDogs(
  filters: Partial<SwipeFilters>,
): Promise<SwipeDogsResponse> {
  const params = new URLSearchParams();

  if (filters.country) {
    params.append("adoptable_to_country", filters.country);
  }

  if (filters.sizes && filters.sizes.length > 0) {
    filters.sizes.forEach((size) => {
      params.append("size[]", size);
    });
  }

  if (filters.ages && filters.ages.length > 0) {
    filters.ages.forEach((age) => {
      params.append("age[]", age);
    });
  }

  const url = `${API_URL}/api/dogs/swipe?${params.toString()}`;

  try {
    const response = await fetch(url, {
      next: {
        revalidate: 300,
        tags: ["swipe-dogs"],
      },
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch swipe dogs: ${response.statusText}`);
    }

    const raw: unknown = await response.json();
    const data = SwipeResponseSchema.parse(stripNulls(raw));
     
    const transformedDogs = transformApiDogsToDogs((data.dogs || []) as ApiDog[]);

    return {
      dogs: transformedDogs,
      total: data.total || transformedDogs.length,
    };
  } catch (error) {
    logger.error("Error fetching swipe dogs:", error);
    reportError(error, { url, filters });
    Sentry.withScope((scope) => {
      scope.setTag("feature", "swipe");
      scope.setTag("operation", "getSwipeDogs");
      scope.setContext("request", { url, filters });
      Sentry.captureException(error);
    });
    return { dogs: [], total: 0 };
  }
}

export async function getAvailableCountries(): Promise<CountryOption[]> {
  const url = `${API_URL}/api/dogs/available-countries`;

  try {
    const response = await fetch(url, {
      next: {
        revalidate: 3600,
        tags: ["available-countries"],
      },
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch available countries: ${response.statusText}`,
      );
    }

    const raw: unknown = await response.json();
    let rawArray: unknown;
    if (Array.isArray(raw)) {
      rawArray = raw;
    } else if (raw !== null && typeof raw === "object" && "countries" in raw) {
      rawArray = (raw as Record<string, unknown>).countries;
    } else {
      rawArray = raw;
    }
    const validated = z.array(SwipeCountrySchema).parse(stripNulls(rawArray));

    const countries: CountryOption[] = validated.map(
      (country) => ({
        value: country.code,
        label: country.name,
        flag: getCountryFlag(country.code) || "\u{1F3F3}\u{FE0F}",
        count: country.dogCount || 0,
      }),
    );

    return countries;
  } catch (error) {
    logger.error("Error fetching available countries:", error);
    reportError(error, { url });
    Sentry.withScope((scope) => {
      scope.setTag("feature", "swipe");
      scope.setTag("operation", "getAvailableCountries");
      scope.setContext("request", { url });
      Sentry.captureException(error);
    });
    return [];
  }
}

export function filtersToSearchParams(filters: SwipeFilters): string {
  const params = new URLSearchParams();

  if (filters.country) {
    params.append("country", filters.country);
  }

  if (filters.sizes && filters.sizes.length > 0) {
    filters.sizes.forEach((size) => {
      params.append("size", size);
    });
  }

  if (filters.ages && filters.ages.length > 0) {
    filters.ages.forEach((age) => {
      params.append("age", age);
    });
  }

  return params.toString();
}

export function searchParamsToFilters(
  searchParams: Record<string, string | string[] | undefined>,
): SwipeFilters {
  const country =
    typeof searchParams.country === "string" ? searchParams.country : "";

  const sizes: string[] = [];
  if (searchParams.size) {
    if (Array.isArray(searchParams.size)) {
      sizes.push(...searchParams.size);
    } else {
      sizes.push(searchParams.size);
    }
  }

  const ages: string[] = [];
  if (searchParams.age) {
    if (Array.isArray(searchParams.age)) {
      ages.push(...searchParams.age);
    } else {
      ages.push(searchParams.age);
    }
  }

  return { country, sizes, ages };
}

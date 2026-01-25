import { getApiUrl } from "../utils/apiConfig";
import type { Dog } from "../types/dog";
import type { SwipeFilters } from "../hooks/useSwipeFilters";
import { transformApiDogsToDogs } from "../utils/dogTransformer";

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

const COUNTRY_FLAGS: Record<string, string> = {
  UK: "\u{1F1EC}\u{1F1E7}",
  GB: "\u{1F1EC}\u{1F1E7}",
  US: "\u{1F1FA}\u{1F1F8}",
  DE: "\u{1F1E9}\u{1F1EA}",
  FR: "\u{1F1EB}\u{1F1F7}",
  ES: "\u{1F1EA}\u{1F1F8}",
  IT: "\u{1F1EE}\u{1F1F9}",
  NL: "\u{1F1F3}\u{1F1F1}",
  BE: "\u{1F1E7}\u{1F1EA}",
  AT: "\u{1F1E6}\u{1F1F9}",
  CH: "\u{1F1E8}\u{1F1ED}",
  SE: "\u{1F1F8}\u{1F1EA}",
  NO: "\u{1F1F3}\u{1F1F4}",
  DK: "\u{1F1E9}\u{1F1F0}",
  FI: "\u{1F1EB}\u{1F1EE}",
  PL: "\u{1F1F5}\u{1F1F1}",
  CZ: "\u{1F1E8}\u{1F1FF}",
  HU: "\u{1F1ED}\u{1F1FA}",
  RO: "\u{1F1F7}\u{1F1F4}",
  BG: "\u{1F1E7}\u{1F1EC}",
  GR: "\u{1F1EC}\u{1F1F7}",
  PT: "\u{1F1F5}\u{1F1F9}",
  IE: "\u{1F1EE}\u{1F1EA}",
  LU: "\u{1F1F1}\u{1F1FA}",
  MT: "\u{1F1F2}\u{1F1F9}",
  CY: "\u{1F1E8}\u{1F1FE}",
  EE: "\u{1F1EA}\u{1F1EA}",
  LV: "\u{1F1F1}\u{1F1FB}",
  LT: "\u{1F1F1}\u{1F1F9}",
  SK: "\u{1F1F8}\u{1F1F0}",
  SI: "\u{1F1F8}\u{1F1EE}",
  HR: "\u{1F1ED}\u{1F1F7}",
  BA: "\u{1F1E7}\u{1F1E6}",
  RS: "\u{1F1F7}\u{1F1F8}",
  ME: "\u{1F1F2}\u{1F1EA}",
  MK: "\u{1F1F2}\u{1F1F0}",
  AL: "\u{1F1E6}\u{1F1F1}",
  TR: "\u{1F1F9}\u{1F1F7}",
  SR: "\u{1F1F8}\u{1F1F7}",
};

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

    const data = await response.json();
    const transformedDogs = transformApiDogsToDogs(data.dogs || []);

    return {
      dogs: transformedDogs,
      total: data.total || transformedDogs.length,
    };
  } catch (error) {
    console.error("Error fetching swipe dogs:", error);
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

    const data = await response.json();

    interface CountryResponse {
      code: string;
      name: string;
      dog_count?: number;
      dogCount?: number;
    }

    const countries: CountryOption[] = (data.countries || data).map(
      (country: CountryResponse) => ({
        value: country.code,
        label: country.name,
        flag: COUNTRY_FLAGS[country.code] || "\u{1F3F3}\u{FE0F}",
        count: country.dog_count || country.dogCount || 0,
      }),
    );

    return countries;
  } catch (error) {
    console.error("Error fetching available countries:", error);
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

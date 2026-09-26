import { type Dog, type DogProfilerData, type DogStatus } from "../types/dog";
import type { ApiDog, ApiDogProfilerData } from "../types/apiDog";

function toSnakeCase(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

function transformProfilerData(
  apiData: ApiDogProfilerData | undefined,
): DogProfilerData | undefined {
  if (!apiData) return undefined;

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(apiData)) {
    result[toSnakeCase(key)] = value;
  }
  return result as DogProfilerData;
}

/**
 * Transforms API dog data to frontend Dog type
 * Handles camelCase to snake_case conversion and image normalization
 */
export function transformApiDogToDog(apiDog: ApiDog): Dog {
  // Get profiler data from either camelCase or snake_case field
  const apiProfilerData = apiDog.dogProfilerData || apiDog.dog_profiler_data;
  const transformedProfilerData = transformProfilerData(apiProfilerData);

  // Normalize image fields - ensure both primary_image_url and main_image are set
  const primaryImage =
    apiDog.primary_image_url || apiDog.image || apiDog.main_image || undefined;
  const mainImage =
    apiDog.main_image || apiDog.primary_image_url || apiDog.image || undefined;

  return {
    ...apiDog,
    // Ensure organization is kept as object
    organization:
      typeof apiDog.organization === "string"
        ? { name: apiDog.organization }
        : apiDog.organization,
    // Normalize image fields for consistent access
    primary_image_url: primaryImage,
    main_image: mainImage,
    // Set transformed profiler data
    dog_profiler_data: transformedProfilerData,
    // Preserve top-level fields for backward compatibility
    personality_traits:
      transformedProfilerData?.personality_traits ||
      apiDog.personality_traits ||
      [],
    description: transformedProfilerData?.description || apiDog.description,
    status: apiDog.status as DogStatus | undefined,
  };
}

/**
 * Transforms an array of API dogs to frontend Dog types
 */
export function transformApiDogsToDogs(apiDogs: ApiDog[]): Dog[] {
  return apiDogs.map(transformApiDogToDog);
}

import { z } from "zod";
import { getApiUrl } from "../utils/apiConfig";
import { logger, reportError } from "../utils/logger";
import { stripNulls } from "../utils/api";
import { fallbackInBuildWithoutApi, fetchWithRetry } from "../utils/serverFetch";
import { isBreedType } from "../utils/breedTypes";
import {
  BreedWithImagesSchema,
  BreedStatsSchema,
} from "../schemas/animals";

const API_URL = getApiUrl();

interface BreedImageParams {
  breedType?: string;
  breedGroup?: string;
  minCount?: number | string;
  limit?: number | string;
}

export interface BreedGroupDisplay {
  name: string;
  icon: string;
  description: string;
  count: number;
  top_breeds: Array<{
    name: string;
    slug: string;
    count: number;
    image_url: string | null;
  }>;
}

export async function getBreedsWithImages(
  params: BreedImageParams = {},
): Promise<z.infer<typeof BreedWithImagesSchema>[]> {
  const queryParams = new URLSearchParams();

  if (params.breedType) queryParams.append("breed_type", params.breedType);
  if (params.breedGroup) queryParams.append("breed_group", params.breedGroup);
  if (params.minCount !== undefined)
    queryParams.append("min_count", String(params.minCount));
  if (params.limit) queryParams.append("limit", String(params.limit));

  const queryString = queryParams.toString();
  const url = `${API_URL}/api/animals/breeds/with-images${queryString ? `?${queryString}` : ""}`;

  // The hub's sections come from here: a failure fails its render rather than
  // cache the hub without them (#675)
  return fetchBreedsWithImages(url).catch(fallbackInBuildWithoutApi([]));
}

async function fetchBreedsWithImages(
  url: string,
): Promise<z.infer<typeof BreedWithImagesSchema>[]> {
  const response = await fetchWithRetry(url, {
    headers: {
      "Content-Type": "application/json",
    },
    next: { revalidate: 604800, tags: ["breed-images"] },
  } as RequestInit);

  if (!response.ok) {
    throw new Error(`Failed to fetch breeds with images: ${response.status}`);
  }

  const data: unknown = await response.json();
  return z.array(BreedWithImagesSchema).parse(stripNulls(data));
}

export async function getMixedBreedData(): Promise<z.infer<
  typeof BreedWithImagesSchema
> | null> {
  const breeds = await getBreedsWithImages({
    breedType: "mixed",
    limit: 1,
  });
  return breeds[0] || null;
}

export async function getPopularBreedsWithImages(
  limit: number = 8,
): Promise<z.infer<typeof BreedWithImagesSchema>[]> {
  const breeds = await getBreedsWithImages({ minCount: 5, limit });

  // /breeds/with-images carries no breed-level traits, so the cards previously
  // showed the first sample dog's traits as if they described the breed. The
  // stats endpoint aggregates them properly; attach those instead.
  try {
    const statsResponse = await fetchWithRetry(`${API_URL}/api/animals/breeds/stats`, {
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 604800, tags: ["breed-stats"] },
    } as RequestInit);
    if (!statsResponse.ok) return breeds;

    const stats = await statsResponse.json();
    const traitsBySlug = new Map<string, string[]>(
      (stats?.qualifying_breeds ?? [])
        .filter((b: { breed_slug?: string; personality_traits?: string[] }) =>
          Boolean(b.breed_slug && b.personality_traits?.length),
        )
        .map((b: { breed_slug: string; personality_traits: string[] }) => [
          b.breed_slug,
          b.personality_traits,
        ]),
    );

    return breeds.map((breed) => ({
      ...breed,
      personality_traits: breed.breed_slug
        ? (traitsBySlug.get(breed.breed_slug) ?? breed.personality_traits)
        : breed.personality_traits,
    }));
  } catch (error) {
    logger.error("Failed to attach breed-level traits", error);
    return breeds;
  }
}

// Only the groups' photos may fail; without the stats the render fails (#675)
export async function getBreedGroupsWithTopBreeds(): Promise<
  BreedGroupDisplay[]
> {
  return fetchBreedGroups().catch(fallbackInBuildWithoutApi([]));
}

async function fetchBreedGroups(): Promise<BreedGroupDisplay[]> {
  const statsUrl = `${API_URL}/api/animals/breeds/stats`;
  const statsResponse = await fetchWithRetry(statsUrl, {
    headers: { "Content-Type": "application/json" },
    next: { revalidate: 604800, tags: ["breed-stats"] },
  } as RequestInit);

  if (!statsResponse.ok) {
    throw new Error(`Failed to fetch breed stats: ${statsResponse.status}`);
  }

  const rawStats: unknown = await statsResponse.json();
  const stats = BreedStatsSchema.parse(stripNulls(rawStats));

  let breedsWithImages: z.infer<typeof BreedWithImagesSchema>[] = [];
  try {
    const breedsWithImagesUrl = `${API_URL}/api/animals/breeds/with-images?min_count=2&limit=50`;
    const imagesResponse = await fetchWithRetry(breedsWithImagesUrl, {
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 604800, tags: ["breed-images"] },
    } as RequestInit);

    // Thrown so the catch below reports it: the groups stay, without photos
    if (!imagesResponse.ok) {
      throw new Error(`Failed to fetch breed images: ${imagesResponse.status}`);
    }
    const rawImages: unknown = await imagesResponse.json();
    breedsWithImages = z.array(BreedWithImagesSchema).parse(stripNulls(rawImages));
  } catch (imageError) {
    logger.warn(
      "Could not fetch breed images, continuing without them:",
      imageError,
    );
    reportError(imageError, { context: "getBreedGroupsWithTopBreeds:images" });
  }

  const breedImageMap: Record<string, string> = {};
  breedsWithImages.forEach((breed) => {
    if (breed.sample_dogs && breed.sample_dogs.length > 0) {
      const imageUrl = breed.sample_dogs[0].primary_image_url;
      if (imageUrl) {
        breedImageMap[breed.primary_breed] = imageUrl;
      }
    }
  });

  const groupConfigs: Record<
    string,
    { icon: string; description: string }
  > = {
    Hound: {
      icon: "\u{1F415}",
      description: "Calm indoors, strong instinct to follow a scent or a sprint",
    },
    Sporting: {
      icon: "\u{1F9AE}",
      description: "Energetic and people-focused; happiest with a job to do",
    },
    Herding: {
      icon: "\u{1F411}",
      description: "Clever and quick to learn; need their minds kept busy",
    },
    Working: {
      icon: "\u{1F4AA}",
      description: "Big, steady dogs that bond closely and take life seriously",
    },
    Terrier: {
      icon: "\u{1F9B4}",
      description: "Bold, funny and full of character in a small package",
    },
    Toy: {
      icon: "\u{1F380}",
      description: "Small companions who want to be wherever you are",
    },
    "Non-Sporting": {
      icon: "\u{1F43E}",
      description: "A varied group with one thing in common: made for company",
    },
    Mixed: {
      icon: "\u{2764}\u{FE0F}",
      description: "Unique personalities from diverse backgrounds",
    },
  };

  const breedGroups = (stats.breed_groups || [])
    .filter(
      (group) =>
        group.name !== "Unknown" &&
        group.name !== "Mixed" &&
        group.count >= 5,
    )
    .toSorted((a, b) => b.count - a.count)
    .slice(0, 8)
    .map((group) => {
      const groupBreeds = (stats.qualifying_breeds || [])
        // A group's breeds, not the type named after it (#669)
        .filter((breed) => breed.breed_group === group.name && !isBreedType(breed.primary_breed))
        .slice(0, 5)
        .map((breed) => ({
          name: breed.primary_breed,
          slug: breed.breed_slug,
          count: breed.count,
          image_url: breedImageMap[breed.primary_breed] || null,
        }));

      const config = groupConfigs[group.name] || {
        icon: "\u{1F436}",
        description: "Wonderful dogs waiting for homes",
      };

      return {
        name: `${group.name} Group`,
        icon: config.icon,
        description: config.description,
        count: group.count,
        top_breeds: groupBreeds,
      };
    });

  return breedGroups;
}

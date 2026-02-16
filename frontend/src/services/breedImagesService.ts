import { z } from "zod";
import { getApiUrl } from "../utils/apiConfig";
import { logger, reportError } from "../utils/logger";
import { stripNulls } from "../utils/api";
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

interface BreedGroupDisplay {
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

  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
      },
      next: { revalidate: 300 },
    } as RequestInit);

    if (!response.ok) {
      throw new Error(`Failed to fetch breeds with images: ${response.status}`);
    }

    const data: unknown = await response.json();
    return z.array(BreedWithImagesSchema).parse(stripNulls(data));
  } catch (error) {
    logger.error("Error fetching breeds with images:", error);
    reportError(error, { context: "getBreedsWithImages" });
    return [];
  }
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
  return getBreedsWithImages({
    minCount: 5,
    limit,
  });
}

export async function getBreedGroupsWithTopBreeds(): Promise<
  BreedGroupDisplay[]
> {
  try {
    const statsUrl = `${API_URL}/api/animals/breeds/stats`;
    const statsResponse = await fetch(statsUrl, {
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 300 },
    } as RequestInit);

    if (!statsResponse.ok) {
      logger.error(`Failed to fetch breed stats: ${statsResponse.status}`);
      return [];
    }

    const rawStats: unknown = await statsResponse.json();
    const stats = BreedStatsSchema.parse(stripNulls(rawStats));

    let breedsWithImages: z.infer<typeof BreedWithImagesSchema>[] = [];
    try {
      const breedsWithImagesUrl = `${API_URL}/api/animals/breeds/with-images?min_count=2&limit=50`;
      const imagesResponse = await fetch(breedsWithImagesUrl, {
        headers: { "Content-Type": "application/json" },
        next: { revalidate: 300 },
      } as RequestInit);

      if (imagesResponse.ok) {
        const rawImages: unknown = await imagesResponse.json();
        breedsWithImages = z.array(BreedWithImagesSchema).parse(stripNulls(rawImages));
      }
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
        description: "Bred for hunting by sight or scent",
      },
      Sporting: {
        icon: "\u{1F9AE}",
        description: "Active dogs bred for hunting and retrieving",
      },
      Herding: {
        icon: "\u{1F411}",
        description: "Intelligent breeds that control livestock",
      },
      Working: {
        icon: "\u{1F4AA}",
        description: "Strong dogs bred for guarding and rescue",
      },
      Terrier: { icon: "\u{1F9B4}", description: "Feisty & determined" },
      Toy: { icon: "\u{1F380}", description: "Small companions" },
      "Non-Sporting": {
        icon: "\u{1F43E}",
        description: "Diverse group of companion dogs",
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
          .filter((breed) => breed.breed_group === group.name)
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
  } catch (error) {
    logger.error("Error fetching breed groups:", error);
    reportError(error, { context: "getBreedGroupsWithTopBreeds" });
    return [];
  }
}

export async function getBreedsWithImagesForHomePage(
  params: BreedImageParams = {},
): Promise<z.infer<typeof BreedWithImagesSchema>[] | null> {
  const queryParams = new URLSearchParams();

  if (params.minCount) queryParams.append("min_count", String(params.minCount));
  if (params.limit) queryParams.append("limit", String(params.limit));

  const queryString = queryParams.toString();
  const url = `${API_URL}/api/animals/breeds/with-images${queryString ? `?${queryString}` : ""}`;

  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
      },
      next: { revalidate: 300 },
    } as RequestInit);

    if (!response.ok) {
      logger.error(`Failed to fetch breeds with images: ${response.status}`);
      return null;
    }

    const data: unknown = await response.json();
    return z.array(BreedWithImagesSchema).parse(stripNulls(data));
  } catch (error) {
    logger.error("Error fetching breeds with images:", error);
    reportError(error, { context: "getBreedsWithImagesForHomePage" });
    return null;
  }
}

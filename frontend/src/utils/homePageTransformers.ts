import type { Dog } from "@/types/dog";

interface RecentDogsResponse {
  dogs?: Dog[];
  results?: Dog[];
}

interface Statistics {
  total_dogs?: number;
  total_organizations?: number;
}

interface BreedWithImages {
  primary_breed?: string;
  name?: string;
  breed_type?: string;
  breed_group?: string;
  count?: number;
  description?: string;
  sample_dogs?: { primary_image_url?: string }[];
}

interface MobileHomePageData {
  dogs: Dog[];
  statistics: {
    totalDogs: number;
    totalOrganizations: number;
    totalBreeds: number;
  };
  breedStats?: Record<string, unknown>;
  countryStats: { code: string; count: number }[];
  ageStats: { slug: string; count: number }[];
}

export function transformMobileHomePageData({
  initialRecentDogs,
  initialStatistics,
  breedsWithImages,
  countryStats = [],
  ageStats = [],
}: {
  initialRecentDogs: RecentDogsResponse | Dog[] | null | undefined;
  initialStatistics: Statistics | null | undefined;
  breedsWithImages: BreedWithImages[] | null | undefined;
  countryStats?: { code: string; count: number }[];
  ageStats?: { slug: string; count: number }[];
}): MobileHomePageData {
  const list = Array.isArray(initialRecentDogs)
    ? initialRecentDogs
    : Array.isArray(initialRecentDogs?.dogs)
      ? initialRecentDogs.dogs
      : Array.isArray(initialRecentDogs?.results)
        ? initialRecentDogs.results
        : [];

  const mobileDogs = list.slice(0, 8).map((d) => ({ ...d, id: String(d.id) }));

  let transformedBreedStats: Record<string, unknown> | undefined;
  if (breedsWithImages && Array.isArray(breedsWithImages)) {
    const validBreeds = breedsWithImages.filter((breed) => {
      const breedName = breed.primary_breed || breed.name || "";
      const lowerBreedName = breedName.toLowerCase();

      const isMixed =
        lowerBreedName.includes("mix") ||
        breed.breed_type === "mixed" ||
        breed.breed_group === "Mixed";
      const isUnknown =
        lowerBreedName === "unknown" || lowerBreedName === "" || !breedName;

      return !isMixed && !isUnknown && (breed.count ?? 0) > 0;
    });

    const shuffled = [...validBreeds].sort(() => 0.5 - Math.random());
    const selectedBreeds = shuffled.slice(0, 3);

    transformedBreedStats = {
      total_dogs: validBreeds.reduce((sum, b) => sum + (b.count ?? 0), 0),
      breeds: selectedBreeds.map((breed) => ({
        name: breed.primary_breed || breed.name || "",
        breed_name: breed.primary_breed || breed.name || "",
        slug: (breed.primary_breed || breed.name || "")
          .toLowerCase()
          .replace(/\s+/g, "-"),
        description:
          breed.description ||
          `Discover ${breed.count || 0} wonderful ${breed.primary_breed || breed.name}s looking for their forever homes.`,
        count: breed.count || 0,
        available_count: breed.count || 0,
        image_url: breed.sample_dogs?.[0]?.primary_image_url || null,
        imageUrl: breed.sample_dogs?.[0]?.primary_image_url || null,
      })),
    };
  }

  return {
    dogs: mobileDogs,
    statistics: {
      totalDogs: initialStatistics?.total_dogs || 0,
      totalOrganizations: initialStatistics?.total_organizations || 0,
      totalBreeds: 50,
    },
    breedStats: transformedBreedStats || undefined,
    countryStats,
    ageStats,
  };
}

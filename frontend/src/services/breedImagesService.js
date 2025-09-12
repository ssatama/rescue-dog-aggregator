// Use internal URL for server-side requests in development
const API_URL =
  process.env.NODE_ENV === "development" && typeof window === "undefined"
    ? "http://localhost:8000" // Server-side in dev
    : process.env.NEXT_PUBLIC_API_URL || "https://api.rescuedogs.me";

export async function getBreedsWithImages(params = {}) {
  const queryParams = new URLSearchParams();

  if (params.breedType) queryParams.append("breed_type", params.breedType);
  if (params.breedGroup) queryParams.append("breed_group", params.breedGroup);
  if (params.minCount !== undefined)
    queryParams.append("min_count", params.minCount);
  if (params.limit) queryParams.append("limit", params.limit);

  const queryString = queryParams.toString();
  const url = `${API_URL}/api/animals/breeds/with-images${queryString ? `?${queryString}` : ""}`;

  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
      },
      next: { revalidate: 300 }, // 5 minute cache
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch breeds with images: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching breeds with images:", error);
    return [];
  }
}

export async function getMixedBreedData() {
  return getBreedsWithImages({
    breedType: "mixed",
    limit: 1,
  }).then((breeds) => breeds[0] || null);
}

export async function getPopularBreedsWithImages(limit = 8) {
  return getBreedsWithImages({
    minCount: 15,
    limit,
  });
}

export async function getBreedGroupsWithTopBreeds() {
  try {
    // First get breed stats
    const statsUrl = `${API_URL}/api/animals/breeds/stats`;
    const statsResponse = await fetch(statsUrl, {
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 300 },
    });

    if (!statsResponse.ok) {
      console.error(`Failed to fetch breed stats: ${statsResponse.status}`);
      return [];
    }

    const stats = await statsResponse.json();

    // Then get breeds with images - use fallback if this fails
    let breedsWithImages = [];
    try {
      const breedsWithImagesUrl = `${API_URL}/api/animals/breeds/with-images?min_count=5&limit=50`;
      const imagesResponse = await fetch(breedsWithImagesUrl, {
        headers: { "Content-Type": "application/json" },
        next: { revalidate: 300 },
      });

      if (imagesResponse.ok) {
        breedsWithImages = await imagesResponse.json();
      }
    } catch (imageError) {
      console.warn(
        "Could not fetch breed images, continuing without them:",
        imageError,
      );
    }

    // Create a map of breed images
    const breedImageMap = {};
    breedsWithImages.forEach((breed) => {
      if (breed.sample_dogs && breed.sample_dogs.length > 0) {
        breedImageMap[breed.primary_breed] =
          breed.sample_dogs[0].primary_image_url;
      }
    });

    // Transform breed groups with their top breeds
    const breedGroups = (stats.breed_groups || [])
      .filter(
        (group) =>
          group.name !== "Unknown" && group.count > 0 && group.name !== "Mixed",
      )
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
      .map((group) => {
        // Get top breeds for this group from qualifying_breeds with images
        const groupBreeds = (stats.qualifying_breeds || [])
          .filter((breed) => breed.breed_group === group.name)
          .slice(0, 5)
          .map((breed) => ({
            name: breed.primary_breed,
            slug: breed.breed_slug,
            count: breed.count,
            image_url: breedImageMap[breed.primary_breed] || null,
          }));

        const groupConfigs = {
          Hound: {
            icon: "🐕",
            description: "Bred for hunting by sight or scent",
          },
          Sporting: {
            icon: "🦮",
            description: "Active dogs bred for hunting and retrieving",
          },
          Herding: {
            icon: "🐑",
            description: "Intelligent breeds that control livestock",
          },
          Working: {
            icon: "💪",
            description: "Strong dogs bred for guarding and rescue",
          },
          Terrier: { icon: "🦴", description: "Feisty & determined" },
          Toy: { icon: "🎀", description: "Small companions" },
          "Non-Sporting": {
            icon: "🐾",
            description: "Diverse group of companion dogs",
          },
          Mixed: {
            icon: "❤️",
            description: "Unique personalities from diverse backgrounds",
          },
        };

        const config = groupConfigs[group.name] || {
          icon: "🐶",
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
    console.error("Error fetching breed groups:", error);
    return [];
  }
}

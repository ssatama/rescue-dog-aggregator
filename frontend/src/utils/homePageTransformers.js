/**
 * Utility functions for transforming homepage data
 */

/**
 * Transforms data for mobile homepage display
 * @param {Object} params - Transformation parameters
 * @param {Array|Object} params.initialRecentDogs - Recent dogs data (various formats)
 * @param {Object} params.initialStatistics - Statistics data
 * @param {Array} params.breedsWithImages - Breeds data with images
 * @param {Array} params.countryStats - Country statistics data
 * @param {Array} params.ageStats - Age category statistics data
 * @returns {Object} Transformed data for MobileHomePage component
 */
export function transformMobileHomePageData({
  initialRecentDogs,
  initialStatistics,
  breedsWithImages,
  countryStats = [],
  ageStats = [],
}) {
  // Normalize whatever shape we get into a plain array
  const list = Array.isArray(initialRecentDogs?.dogs)
    ? initialRecentDogs.dogs
    : Array.isArray(initialRecentDogs?.results)
      ? initialRecentDogs.results
      : Array.isArray(initialRecentDogs)
        ? initialRecentDogs
        : [];

  // Get first 8 dogs for mobile display with string IDs
  const mobileDogs = list.slice(0, 8).map((d) => ({ ...d, id: String(d.id) }));

  // Transform breeds with images to the format expected by MobileHomePage
  let transformedBreedStats = null;
  if (breedsWithImages && Array.isArray(breedsWithImages)) {
    // Filter out breeds that don't have detail pages
    const validBreeds = breedsWithImages.filter((breed) => {
      const breedName = breed.primary_breed || breed.name || "";
      const lowerBreedName = breedName.toLowerCase();

      // Exclude mixed breeds and unknown breeds
      const isMixed =
        lowerBreedName.includes("mix") ||
        breed.breed_type === "mixed" ||
        breed.breed_group === "Mixed";
      const isUnknown =
        lowerBreedName === "unknown" || lowerBreedName === "" || !breedName;

      return !isMixed && !isUnknown && breed.count > 0;
    });

    // Select 3 random valid breeds from the available breeds
    const shuffled = [...validBreeds].sort(() => 0.5 - Math.random());
    const selectedBreeds = shuffled.slice(0, 3);

    transformedBreedStats = {
      breeds: selectedBreeds.map((breed) => ({
        name: breed.primary_breed || breed.name,
        breed_name: breed.primary_breed || breed.name,
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
      totalBreeds: 50, // Default to 50+ as we don't have exact breed count in basic statistics
    },
    breedStats: transformedBreedStats, // Pass transformed breed data for carousel
    countryStats, // Pass country stats for country browse section
    ageStats, // Pass age stats for age browse section
  };
}
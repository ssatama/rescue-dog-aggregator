// This file contains functions to interact with the animal-related API endpoints.

import { get } from "../utils/api"; // Assuming api utility exists
import { logger } from "../utils/logger";

/**
 * Fetches a list of animals based on provided filters.
 * @param {object} params - Filtering parameters (limit, offset, breed, size, etc.)
 * @returns {Promise<Array>} - Promise resolving to an array of animal objects.
 */
export async function getAnimals(params = {}) {
  logger.log("Fetching animals with params:", params);
  // Remove null/undefined/default values before sending
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(
      ([key, v]) =>
        v != null &&
        v !== "" &&
        !(key === "sex" && v === "Any") &&
        !(key === "standardized_size" && v === "Any size") && // Check standardized_size
        !(key === "age_category" && v === "Any age") &&
        !(key === "standardized_breed" && v === "Any breed") &&
        !(key === "breed_group" && v === "Any group") &&
        !(key === "organization_id" && v === "Any organization") &&
        !(key === "location_country" && v === "Any country") &&
        !(key === "available_to_country" && v === "Any country") &&
        !(key === "available_to_region" && v === "Any region"),
    ),
  );

  // Ensure animal_type is always sent if not explicitly provided otherwise
  if (!cleanParams.animal_type) {
    cleanParams.animal_type = "dog";
  }
  // Ensure status is 'available' if not explicitly provided otherwise
  if (!cleanParams.status) {
    cleanParams.status = "available";
  }

  logger.log("Cleaned params for API:", cleanParams);
  return get("/api/animals", cleanParams);
}

/**
 * Fetches a single animal by its ID.
 * @param {string|number} id - The ID of the animal.
 * @returns {Promise<object>} - Promise resolving to the animal object.
 */
export async function getAnimalById(id) {
  logger.log(`Fetching animal by ID: ${id}`);
  return get(`/api/animals/${id}`);
}

/**
 * Fetches a single animal by its slug.
 * @param {string} slug - The slug of the animal.
 * @returns {Promise<object>} - Promise resolving to the animal object.
 */
export async function getAnimalBySlug(slug) {
  logger.log(`Fetching animal by slug: ${slug}`);
  return get(`/api/animals/${slug}`);
}

/**
 * Fetches animals filtered by standardized breed.
 * @param {string} standardizedBreed - The standardized breed name.
 * @param {object} additionalParams - Other filtering parameters.
 * @returns {Promise<Array>} - Promise resolving to an array of animal objects.
 */
export async function getAnimalsByStandardizedBreed(
  standardizedBreed,
  additionalParams = {},
) {
  const params = {
    ...additionalParams,
    standardized_breed: standardizedBreed,
    animal_type: "dog", // Ensure we are fetching dogs
  };
  logger.log("Fetching animals by standardized breed:", params);
  return getAnimals(params);
}

/**
 * Fetches a specified number of random animals.
 * @param {number} limit - The number of random animals to fetch.
 * @returns {Promise<Array>} - A promise that resolves to an array of animal objects.
 */
export const getRandomAnimals = async (limit = 3) => {
  logger.log(`Fetching ${limit} random animals`);
  // The backend /random endpoint now defaults to dogs and available status
  return get("/api/animals/random", { limit });
};

// --- Meta Endpoints ---

/**
 * Fetches a distinct list of standardized breeds.
 * @param {string} [breedGroup] - Optional breed group to filter by.
 * @returns {Promise<Array<string>>} - Promise resolving to an array of breed names.
 */
export async function getStandardizedBreeds(breedGroup = null) {
  const params = {};
  if (breedGroup && breedGroup !== "Any group") {
    params.breed_group = breedGroup;
  }
  logger.log("Fetching standardized breeds with params:", params);

  try {
    const response = await get("/api/animals/meta/breeds", params);

    // Defensive handling for different response structures
    // API might return: array directly, {data: array}, {breeds: array}, or other wrapper
    if (Array.isArray(response)) {
      return response;
    }

    // Check for common wrapper patterns
    if (response && Array.isArray(response.data)) {
      return response.data;
    }

    if (response && Array.isArray(response.breeds)) {
      return response.breeds;
    }

    // Log unexpected response structure for debugging
    logger.warn(
      "Unexpected breeds API response structure:",
      typeof response,
      Object.keys(response || {}),
    );

    // Return empty array as fallback to prevent .filter() errors
    return [];
  } catch (error) {
    logger.error("Error fetching standardized breeds:", error);
    return [];
  }
}

/**
 * Fetches a distinct list of breed groups.
 * @returns {Promise<Array<string>>} - Promise resolving to an array of breed group names.
 */
export async function getBreedGroups() {
  logger.log("Fetching breed groups");
  return get("/api/animals/meta/breed_groups");
}

// --- NEW: Location Meta Endpoints ---

/**
 * Fetches a distinct list of countries where organizations are located.
 * @returns {Promise<Array<string>>} - Promise resolving to an array of country names.
 */
export async function getLocationCountries() {
  logger.log("Fetching location countries");
  return get("/api/animals/meta/location_countries");
}

/**
 * Fetches a distinct list of countries organizations can adopt to.
 * @returns {Promise<Array<string>>} - Promise resolving to an array of country names.
 */
export async function getAvailableCountries() {
  logger.log("Fetching available-to countries");
  return get("/api/animals/meta/available_countries");
}

/**
 * Fetches a distinct list of regions within a specific country organizations can adopt to.
 * @param {string} country - The country to fetch regions for.
 * @returns {Promise<Array<string>>} - Promise resolving to an array of region names.
 */
export async function getAvailableRegions(country) {
  if (!country || country === "Any country") {
    logger.log("Skipping fetch for available regions - no country selected.");
    return Promise.resolve([]); // Return empty array if no country specified
  }
  logger.log(`Fetching available regions for country: ${country}`);
  return get("/api/animals/meta/available_regions", { country });
}

// --- END NEW ---

/**
 * Fetches aggregated statistics about available dogs and organizations.
 * @returns {Promise<object>} - Promise resolving to statistics object with total_dogs, total_organizations, countries, and organizations.
 */
export async function getStatistics() {
  logger.log("Fetching statistics");
  return get("/api/animals/statistics");
}

/**
 * Fetches animals using a specific curation type.
 * @param {string} curationType - The curation type ('recent', 'diverse', or 'random')
 * @param {number} limit - The number of animals to fetch (default: 4)
 * @returns {Promise<Array>} - Promise resolving to an array of animal objects.
 */
export async function getAnimalsByCuration(curationType, limit = 4) {
  // Input validation
  if (!curationType) {
    throw new Error("Curation type is required");
  }

  const validCurationTypes = [
    "recent",
    "recent_with_fallback",
    "diverse",
    "random",
  ];
  if (!validCurationTypes.includes(curationType)) {
    throw new Error(
      "Invalid curation type. Must be one of: recent, recent_with_fallback, diverse, random",
    );
  }

  if (typeof limit !== "number" || limit <= 0) {
    throw new Error("Limit must be a positive number");
  }

  logger.log(
    `Fetching animals with curation type: ${curationType}, limit: ${limit}`,
  );

  const params = {
    curation_type: curationType,
    limit,
    animal_type: "dog",
    status: "available",
  };

  logger.log("API call parameters:", params);

  return get("/api/animals", params);
}

/**
 * Fetches all animals (for static generation and general use).
 * @param {object} params - Optional filtering parameters
 * @returns {Promise<Array>} - Promise resolving to an array of animal objects.
 */
export async function getAllAnimals(params = {}) {
  logger.log("Fetching all animals");
  return getAnimals({
    ...params,
    limit: 10000, // Request maximum limit
  });
}

/**
 * Fetches all animals with quality filtering for sitemap generation.
 * Implements pagination to fetch all dogs (API has 1000 item limit per request)
 * @param {object} params - Optional filtering parameters
 * @returns {Promise<Array>} - Promise resolving to an array of ALL animal objects.
 */
export async function getAllAnimalsForSitemap(params = {}) {
  logger.log("Fetching all animals for sitemap with pagination");

  const allAnimals = [];
  const limit = 1000; // API max limit
  let offset = 0;
  let hasMore = true;

  // Fetch all pages until we get less than the limit
  while (hasMore) {
    try {
      const batch = await getAnimals({
        ...params,
        limit,
        offset,
      });

      allAnimals.push(...batch);

      // If we got less than the limit, we've reached the end
      hasMore = batch.length === limit;
      offset += limit;

      logger.log(
        `Fetched ${batch.length} animals at offset ${offset - limit}, total so far: ${allAnimals.length}`,
      );
    } catch (error) {
      logger.error(`Error fetching animals at offset ${offset}:`, error);
      hasMore = false; // Stop on error to return what we have
    }
  }

  logger.log(`Sitemap fetch complete: ${allAnimals.length} total animals`);
  return allAnimals;
}

/**
 * Fetches filter counts for each option based on current filter context.
 * @param {object} params - Current filter context (search, animal_type, status, etc.)
 * @returns {Promise<object>} - Promise resolving to filter counts response.
 */
export async function getFilterCounts(params = {}) {
  logger.log("Fetching filter counts with params:", params);

  // Remove null/undefined/default values before sending
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(
      ([key, v]) =>
        v != null &&
        v !== "" &&
        !(key === "sex" && v === "Any") &&
        !(key === "standardized_size" && v === "Any size") &&
        !(key === "age_category" && v === "Any age") &&
        !(key === "standardized_breed" && v === "Any breed") &&
        !(key === "organization_id" && v === "Any organization") &&
        !(key === "location_country" && v === "Any country") &&
        !(key === "available_to_country" && v === "Any country") &&
        !(key === "available_to_region" && v === "Any region"),
    ),
  );

  // Ensure animal_type is always sent if not explicitly provided otherwise
  if (!cleanParams.animal_type) {
    cleanParams.animal_type = "dog";
  }
  // Ensure status is 'available' if not explicitly provided otherwise
  if (!cleanParams.status) {
    cleanParams.status = "available";
  }

  logger.log("Cleaned filter count params for API:", cleanParams);
  return get("/api/animals/meta/filter_counts", cleanParams);
}

// --- Search Suggestions Endpoints ---

/**
 * Fetches search suggestions for animal names.
 * @param {string} query - Search query string
 * @param {number} limit - Maximum number of suggestions (default: 5)
 * @returns {Promise<Array<string>>} - Promise resolving to array of name suggestions
 */
export async function getSearchSuggestions(query, limit = 5) {
  if (!query || query.trim().length === 0) {
    return [];
  }

  logger.log(`Fetching search suggestions for query: "${query}"`);

  try {
    const params = {
      q: query.trim(),
      limit: Math.min(Math.max(limit, 1), 10), // Ensure limit is between 1-10
    };

    const suggestions = await get("/api/animals/search/suggestions", params);
    return Array.isArray(suggestions) ? suggestions : [];
  } catch (error) {
    logger.error("Error fetching search suggestions:", error);
    return [];
  }
}

/**
 * Fetches breed suggestions with fuzzy matching.
 * @param {string} query - Breed query string
 * @param {number} limit - Maximum number of suggestions (default: 5)
 * @returns {Promise<Array<string>>} - Promise resolving to array of breed suggestions
 */
export async function getBreedSuggestions(query, limit = 5) {
  if (!query || query.trim().length === 0) {
    return [];
  }

  logger.log(`Fetching breed suggestions for query: "${query}"`);

  try {
    const params = {
      q: query.trim(),
      limit: Math.min(Math.max(limit, 1), 10), // Ensure limit is between 1-10
    };

    const suggestions = await get("/api/animals/breeds/suggestions", params);
    return Array.isArray(suggestions) ? suggestions : [];
  } catch (error) {
    logger.error("Error fetching breed suggestions:", error);
    return [];
  }
}

/**
 * Fetches dogs for a specific breed with filters.
 * @param {string} breedSlug - The breed slug
 * @param {object} filters - Filtering parameters
 * @returns {Promise<object>} - Promise resolving to dogs and metadata
 */
export async function getBreedDogs(breedSlug, filters = {}) {
  logger.log(`Fetching dogs for breed: ${breedSlug}`, filters);

  try {
    const breedStats = await get("/api/animals/breeds/stats");
    const breedData = breedStats.qualifying_breeds?.find(
      (breed) => breed.breed_slug === breedSlug,
    );

    if (!breedData) {
      throw new Error(`Breed not found: ${breedSlug}`);
    }

    const params = {
      breed: breedData.primary_breed,
      limit: filters.limit || 12,
      offset: filters.offset || 0,
      animal_type: "dog",
      status: "available",
    };

    if (filters.age && filters.age !== "all") params.age = filters.age;
    if (filters.sex && filters.sex !== "all") params.sex = filters.sex;
    if (filters.size && filters.size !== "all") params.size = filters.size;
    if (filters.good_with_cats) params.good_with_cats = true;
    if (filters.good_with_dogs) params.good_with_dogs = true;

    return get("/api/animals", params);
  } catch (error) {
    logger.error(`Error fetching breed dogs for ${breedSlug}:`, error);
    return { results: [], total: 0 };
  }
}

/**
 * Fetches filter counts for a specific breed.
 * @param {string} breedSlug - The breed slug
 * @returns {Promise<object>} - Promise resolving to filter counts
 */
export async function getBreedFilterCounts(breedSlug) {
  logger.log(`Fetching filter counts for breed: ${breedSlug}`);

  try {
    const breedStats = await get("/api/animals/breeds/stats");
    const breedData = breedStats.qualifying_breeds?.find(
      (breed) => breed.breed_slug === breedSlug,
    );

    if (!breedData) {
      return null;
    }

    return getFilterCounts({
      breed: breedData.primary_breed,
      animal_type: "dog",
      status: "available",
    });
  } catch (error) {
    logger.error(`Error fetching breed filter counts for ${breedSlug}:`, error);
    return null;
  }
}

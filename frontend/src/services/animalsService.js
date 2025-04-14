// This file contains functions to interact with the animal-related API endpoints.

import { get } from '../utils/api'; // Assuming api utility exists

/**
 * Fetches a list of animals based on provided filters.
 * @param {object} params - Filtering parameters (limit, offset, breed, size, etc.)
 * @returns {Promise<Array>} - Promise resolving to an array of animal objects.
 */
export async function getAnimals(params = {}) {
  console.log("Fetching animals with params:", params); // Keep for debugging if needed
  // Remove null/undefined values before sending
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([_, v]) => v != null && v !== '' && v !== 'Any' && v !== 'Any size' && v !== 'Any age' && v !== 'Any breed' && v !== 'Any group')
  );
  // CHANGE PATH HERE
  return get('/api/animals', cleanParams);
}

/**
 * Fetches a single animal by its ID.
 * @param {string|number} id - The ID of the animal.
 * @returns {Promise<object>} - Promise resolving to the animal object.
 */
export async function getAnimalById(id) {
  if (!id) {
    throw new Error("Animal ID is required.");
  }
  // CHANGE PATH HERE
  return get(`/api/animals/${id}`);
}

/**
 * Fetches animals filtered by standardized breed.
 * @param {string} standardizedBreed - The standardized breed name.
 * @param {object} additionalParams - Other filtering parameters.
 * @returns {Promise<Array>} - Promise resolving to an array of animal objects.
 */
export async function getAnimalsByStandardizedBreed(standardizedBreed, additionalParams = {}) {
  if (!standardizedBreed) {
    throw new Error("Standardized breed is required.");
  }
  // CHANGE PATH HERE
  return get('/api/animals', {
    standardized_breed: standardizedBreed,
    ...additionalParams
  });
}

/**
 * Fetches a specified number of random animals.
 * @param {number} limit - The number of random animals to fetch.
 * @returns {Promise<Array>} - A promise that resolves to an array of animal objects.
 */
export const getRandomAnimals = async (limit = 3) => {
  try {
    // Assuming your API endpoint is /api/animals/random
    // Double-check this path if needed
    const data = await get('/api/animals/random', { limit });
    return data;
  } catch (error) {
    console.error(`Error fetching random animals: ${error}`);
    throw error; // Re-throw the error to be handled by the component
  }
};

// --- Add functions for new meta endpoints ---

/**
 * Fetches a distinct list of standardized breeds.
 * @param {string} [breedGroup] - Optional breed group to filter by.
 * @returns {Promise<Array<string>>} - Promise resolving to an array of breed names.
 */
export async function getStandardizedBreeds(breedGroup = null) {
    const params = {};
    if (breedGroup && breedGroup !== 'Any group') {
        params.breed_group = breedGroup;
    }
    // CHANGE PATH HERE
    return get('/api/animals/meta/breeds', params);
}

/**
 * Fetches a distinct list of breed groups.
 * @returns {Promise<Array<string>>} - Promise resolving to an array of breed group names.
 */
export async function getBreedGroups() {
    // CHANGE PATH HERE
    return get('/api/animals/meta/breed_groups');
}


// --- Keep or update other specific functions if needed ---
// Example: If you had getFeaturedDogs, decide if it should be getFeaturedAnimals
// export async function getFeaturedAnimals(limit = 4) {
//   return get('/api/animals', { limit: limit, /* add other criteria? */ });
// }
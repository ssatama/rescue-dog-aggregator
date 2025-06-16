// This file contains functions to interact with the animal-related API endpoints.

import { get } from '../utils/api'; // Assuming api utility exists
import { logger } from '../utils/logger';

/**
 * Fetches a list of animals based on provided filters.
 * @param {object} params - Filtering parameters (limit, offset, breed, size, etc.)
 * @returns {Promise<Array>} - Promise resolving to an array of animal objects.
 */
export async function getAnimals(params = {}) {
  logger.log("Fetching animals with params:", params);
  // Remove null/undefined/default values before sending
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([key, v]) =>
        v != null &&
        v !== '' &&
        !(key === 'sex' && v === 'Any') &&
        !(key === 'standardized_size' && v === 'Any size') && // Check standardized_size
        !(key === 'age_category' && v === 'Any age') &&
        !(key === 'standardized_breed' && v === 'Any breed') &&
        !(key === 'organization_id' && v === 'Any organization') &&
        !(key === 'location_country' && v === 'Any country') &&
        !(key === 'available_to_country' && v === 'Any country') &&
        !(key === 'available_to_region' && v === 'Any region')
    )
  );

  // Ensure animal_type is always sent if not explicitly provided otherwise
  if (!cleanParams.animal_type) {
    cleanParams.animal_type = 'dog';
  }
  // Ensure status is 'available' if not explicitly provided otherwise
  if (!cleanParams.status) {
      cleanParams.status = 'available';
  }

  logger.log("Cleaned params for API:", cleanParams);
  return get('/api/animals', cleanParams);
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
 * Fetches animals filtered by standardized breed.
 * @param {string} standardizedBreed - The standardized breed name.
 * @param {object} additionalParams - Other filtering parameters.
 * @returns {Promise<Array>} - Promise resolving to an array of animal objects.
 */
export async function getAnimalsByStandardizedBreed(standardizedBreed, additionalParams = {}) {
  const params = {
    ...additionalParams,
    standardized_breed: standardizedBreed,
    animal_type: 'dog' // Ensure we are fetching dogs
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
  return get('/api/animals/random', { limit });
};

// --- Meta Endpoints ---

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
  logger.log("Fetching standardized breeds with params:", params);
  return get('/api/animals/meta/breeds', params);
}

/**
 * Fetches a distinct list of breed groups.
 * @returns {Promise<Array<string>>} - Promise resolving to an array of breed group names.
 */
export async function getBreedGroups() {
  logger.log("Fetching breed groups");
  return get('/api/animals/meta/breed_groups');
}

// --- NEW: Location Meta Endpoints ---

/**
 * Fetches a distinct list of countries where organizations are located.
 * @returns {Promise<Array<string>>} - Promise resolving to an array of country names.
 */
export async function getLocationCountries() {
  logger.log("Fetching location countries");
  return get('/api/animals/meta/location_countries');
}

/**
 * Fetches a distinct list of countries organizations can adopt to.
 * @returns {Promise<Array<string>>} - Promise resolving to an array of country names.
 */
export async function getAvailableCountries() {
  logger.log("Fetching available-to countries");
  return get('/api/animals/meta/available_countries');
}

/**
 * Fetches a distinct list of regions within a specific country organizations can adopt to.
 * @param {string} country - The country to fetch regions for.
 * @returns {Promise<Array<string>>} - Promise resolving to an array of region names.
 */
export async function getAvailableRegions(country) {
  if (!country || country === 'Any country') {
    logger.log("Skipping fetch for available regions - no country selected.");
    return Promise.resolve([]); // Return empty array if no country specified
  }
  logger.log(`Fetching available regions for country: ${country}`);
  return get('/api/animals/meta/available_regions', { country });
}

// --- END NEW ---

/**
 * Fetches aggregated statistics about available dogs and organizations.
 * @returns {Promise<object>} - Promise resolving to statistics object with total_dogs, total_organizations, countries, and organizations.
 */
export async function getStatistics() {
  logger.log("Fetching statistics");
  return get('/api/animals/statistics');
}
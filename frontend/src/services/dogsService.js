// src/services/dogsService.js

import { get } from '../utils/api';

/**
 * Fetch dogs with optional filtering and pagination
 * @param {Object} params - Filter and pagination parameters
 * @returns {Promise} - Resolved promise with dogs data
 */
export async function getDogs(params = {}) {
    console.log("API call with params:", params);
    
    // Format any null or undefined values
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v != null)
    );
    
    console.log("Cleaned params:", cleanParams);
    
    return get('/api/dogs', cleanParams);
  }

/**
 * Fetch dogs with standardized breed filtering
 * @param {string} standardizedBreed - Standardized breed name
 * @param {Object} additionalParams - Additional filter parameters
 * @returns {Promise} - Resolved promise with filtered dogs data
 */
export async function getDogsByStandardizedBreed(standardizedBreed, additionalParams = {}) {
  return get('/api/dogs', { 
    standardized_breed: standardizedBreed, 
    ...additionalParams 
  });
}

/**
 * Fetch dogs by breed group
 * @param {string} breedGroup - Dog breed group (Sporting, Hound, Working, etc.)
 * @param {Object} additionalParams - Additional filter parameters
 * @returns {Promise} - Resolved promise with filtered dogs data
 */
export async function getDogsByBreedGroup(breedGroup, additionalParams = {}) {
  return get('/api/dogs', { 
    breed_group: breedGroup, 
    ...additionalParams 
  });
}

/**
 * Fetch dogs with standardized size filtering
 * @param {string} standardizedSize - Standardized size (Tiny, Small, Medium, Large, XLarge)
 * @param {Object} additionalParams - Additional filter parameters
 * @returns {Promise} - Resolved promise with filtered dogs data
 */
export async function getDogsByStandardizedSize(standardizedSize, additionalParams = {}) {
  return get('/api/dogs', { 
    standardized_size: standardizedSize, 
    ...additionalParams 
  });
}

/**
 * Fetch dogs by age category
 * @param {string} ageCategory - Age category (Puppy, Young, Adult, Senior)
 * @param {Object} additionalParams - Additional filter parameters
 * @returns {Promise} - Resolved promise with filtered dogs data
 */
export async function getDogsByAgeCategory(ageCategory, additionalParams = {}) {
  return get('/api/dogs', { 
    age_category: ageCategory, 
    ...additionalParams 
  });
}

/**
 * Fetch dogs by age range in months
 * @param {number} minAge - Minimum age in months
 * @param {number} maxAge - Maximum age in months
 * @param {Object} additionalParams - Additional filter parameters
 * @returns {Promise} - Resolved promise with filtered dogs data
 */
export async function getDogsByAgeRange(minAge, maxAge, additionalParams = {}) {
  const params = { ...additionalParams };
  
  if (minAge !== undefined && minAge !== null) {
    params.min_age_months = minAge;
  }
  
  if (maxAge !== undefined && maxAge !== null) {
    params.max_age_months = maxAge;
  }
  
  return get('/api/dogs', params);
}

/**
 * Fetch a specific dog by ID
 * @param {number|string} id - Dog ID
 * @returns {Promise} - Resolved promise with dog data
 */
export async function getDogById(id) {
  return get(`/api/dogs/${id}`);
}

/**
 * Fetch available breed groups
 * @returns {Promise} - Resolved promise with available breed groups
 */
export async function getBreedGroups() {
  return get('/api/dogs/breeds/groups');
}

/**
 * Fetch available standardized breeds
 * @param {string} breedGroup - Optional filter by breed group
 * @returns {Promise} - Resolved promise with available standardized breeds
 */
export async function getStandardizedBreeds(breedGroup = null) {
  const params = breedGroup ? { breed_group: breedGroup } : {};
  return get('/api/dogs/breeds/standardized', params);
}
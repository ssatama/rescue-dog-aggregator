// src/services/dogsService.js

import { get } from '../utils/api';

/**
 * Fetch dogs with optional filtering and pagination
 * @param {Object} params - Filter and pagination parameters
 * @returns {Promise} - Resolved promise with dogs data
 */
export async function getDogs(params = {}) {
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
 * Fetch dogs with specific breed
 * @param {string} breed - Dog breed to filter by
 * @returns {Promise} - Resolved promise with filtered dogs data
 */
export async function getDogsByBreed(breed) {
  return get('/api/dogs', { breed });
}

/**
 * Fetch dogs with specific size
 * @param {string} size - Dog size to filter by (Small, Medium, Large)
 * @returns {Promise} - Resolved promise with filtered dogs data
 */
export async function getDogsBySize(size) {
  return get('/api/dogs', { size });
}

/**
 * Fetch dogs by status
 * @param {string} status - Status to filter by (available, pending, adopted)
 * @returns {Promise} - Resolved promise with filtered dogs data
 */
export async function getDogsByStatus(status = 'available') {
  return get('/api/dogs', { status });
}
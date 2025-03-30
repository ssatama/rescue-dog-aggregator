// src/services/organizationsService.js

import { get } from '../utils/api';

/**
 * Fetch all organizations
 * @returns {Promise} - Resolved promise with organizations data
 */
export async function getOrganizations() {
  return get('/api/organizations');
}

/**
 * Fetch a specific organization by ID
 * @param {number|string} id - Organization ID
 * @returns {Promise} - Resolved promise with organization data
 */
export async function getOrganizationById(id) {
  return get(`/api/organizations/${id}`);
}

/**
 * Fetch dogs from a specific organization
 * @param {number|string} id - Organization ID
 * @param {Object} params - Filter and pagination parameters
 * @returns {Promise} - Resolved promise with dogs data
 */
export async function getOrganizationDogs(id, params = {}) {
  return get('/api/dogs', {
    ...params,
    organization_id: id
  });
}
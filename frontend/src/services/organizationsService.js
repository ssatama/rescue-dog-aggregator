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
  return get('/api/animals', {
    ...params,
    organization_id: id,
    animal_type: 'dog' // Also explicitly filter for dogs here
  });
}

import {
  getOrganizations,
  getOrganizationById,
  getOrganizationDogs
} from '../organizationsService';
import { get } from '../../utils/api';

jest.mock('../../utils/api', () => ({
  get: jest.fn(),
}));

describe('organizationsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getOrganizations calls GET /api/organizations', async () => {
    get.mockResolvedValue([{ id: 1, name: 'Org A' }]);
    await getOrganizations();
    expect(get).toHaveBeenCalledWith('/api/organizations');
  });

  it('getOrganizationById calls GET /api/organizations/:id', async () => {
    get.mockResolvedValue({ id: 2, name: 'Org B' });
    await getOrganizationById(2);
    expect(get).toHaveBeenCalledWith('/api/organizations/2');
  });

  it('getOrganizationDogs calls GET /api/animals with org filter + animal_type', async () => {
    const params = { limit: 5, offset: 0 };
    get.mockResolvedValue([{ id: 10, name: 'Dog X' }]);
    await getOrganizationDogs(7, params);
    expect(get).toHaveBeenCalledWith('/api/animals', {
      ...params,
      organization_id: 7,
      animal_type: 'dog'
    });
  });
});
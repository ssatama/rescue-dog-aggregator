// src/services/__tests__/enhancedOrganizationsService.test.js

import {
  getOrganizationStatistics,
  getOrganizationRecentDogs,
  getEnhancedOrganizations
} from '../organizationsService';
import * as api from '../../utils/api';

// Mock the API utility
jest.mock('../../utils/api');

describe('Enhanced Organizations Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrganizationStatistics', () => {
    test('fetches statistics for a specific organization', async () => {
      const mockStats = {
        total_dogs: 25,
        new_this_week: 3,
        new_this_month: 8
      };

      api.get.mockResolvedValueOnce(mockStats);

      const result = await getOrganizationStatistics(1);

      expect(api.get).toHaveBeenCalledWith('/api/organizations/1/statistics');
      expect(result).toEqual(mockStats);
    });

    test('handles API errors gracefully', async () => {
      const mockError = new Error('API Error');
      api.get.mockRejectedValueOnce(mockError);

      await expect(getOrganizationStatistics(1)).rejects.toThrow('API Error');
    });

    test('works with string organization ID', async () => {
      const mockStats = { total_dogs: 10, new_this_week: 1 };
      api.get.mockResolvedValueOnce(mockStats);

      await getOrganizationStatistics('2');

      expect(api.get).toHaveBeenCalledWith('/api/organizations/2/statistics');
    });
  });

  describe('getOrganizationRecentDogs', () => {
    test('fetches recent dogs with default limit', async () => {
      const mockDogs = [
        { id: 1, name: 'Buddy', thumbnail_url: 'https://example.com/dog1.jpg' },
        { id: 2, name: 'Max', thumbnail_url: 'https://example.com/dog2.jpg' }
      ];

      api.get.mockResolvedValueOnce(mockDogs);

      const result = await getOrganizationRecentDogs(1);

      expect(api.get).toHaveBeenCalledWith('/api/organizations/1/recent-dogs', { limit: 3 });
      expect(result).toEqual(mockDogs);
    });

    test('fetches recent dogs with custom limit', async () => {
      const mockDogs = [
        { id: 1, name: 'Buddy', thumbnail_url: 'https://example.com/dog1.jpg' }
      ];

      api.get.mockResolvedValueOnce(mockDogs);

      const result = await getOrganizationRecentDogs(1, 1);

      expect(api.get).toHaveBeenCalledWith('/api/organizations/1/recent-dogs', { limit: 1 });
      expect(result).toEqual(mockDogs);
    });

    test('handles empty results', async () => {
      api.get.mockResolvedValueOnce([]);

      const result = await getOrganizationRecentDogs(1);

      expect(result).toEqual([]);
    });

    test('handles API errors gracefully', async () => {
      const mockError = new Error('Recent dogs API Error');
      api.get.mockRejectedValueOnce(mockError);

      await expect(getOrganizationRecentDogs(1)).rejects.toThrow('Recent dogs API Error');
    });
  });

  describe('getEnhancedOrganizations', () => {
    const mockOrganizations = [
      {
        id: 1,
        name: 'Pets in Turkey',
        total_dogs: 25,
        new_this_week: 3,
        service_regions: ['TR', 'RO'],
        ships_to: ['DE', 'NL', 'BE']
      },
      {
        id: 2,
        name: 'REAN',
        total_dogs: 15,
        new_this_week: 1,
        service_regions: ['DE'],
        ships_to: ['DE', 'AT']
      }
    ];

    const mockRecentDogs = [
      { id: 1, name: 'Buddy', thumbnail_url: 'https://example.com/dog1.jpg' },
      { id: 2, name: 'Max', thumbnail_url: 'https://example.com/dog2.jpg' }
    ];

    test('fetches enhanced organizations data successfully', async () => {
      // Mock the main organizations call
      api.get.mockImplementation((url) => {
        if (url === '/api/organizations') {
          return Promise.resolve(mockOrganizations);
        }
        if (url.includes('/recent-dogs')) {
          return Promise.resolve(mockRecentDogs);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const result = await getEnhancedOrganizations();

      expect(api.get).toHaveBeenCalledWith('/api/organizations');
      expect(api.get).toHaveBeenCalledWith('/api/organizations/1/recent-dogs', { limit: 3 });
      expect(api.get).toHaveBeenCalledWith('/api/organizations/2/recent-dogs', { limit: 3 });

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        ...mockOrganizations[0],
        recent_dogs: mockRecentDogs
      });
      expect(result[1]).toMatchObject({
        ...mockOrganizations[1],
        recent_dogs: mockRecentDogs
      });
    });

    test('handles organizations with zero dogs', async () => {
      const orgsWithZeroDogs = [
        { id: 1, name: 'New Org', total_dogs: 0 }
      ];

      api.get.mockImplementation((url) => {
        if (url === '/api/organizations') {
          return Promise.resolve(orgsWithZeroDogs);
        }
        return Promise.reject(new Error('Should not call recent dogs for zero-dog orgs'));
      });

      const result = await getEnhancedOrganizations();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        ...orgsWithZeroDogs[0],
        recent_dogs: []
      });

      // Should not call recent dogs API for organizations with 0 dogs
      expect(api.get).toHaveBeenCalledTimes(1);
      expect(api.get).toHaveBeenCalledWith('/api/organizations');
    });

    test('handles partial failures gracefully', async () => {
      api.get.mockImplementation((url) => {
        if (url === '/api/organizations') {
          return Promise.resolve(mockOrganizations);
        }
        if (url === '/api/organizations/1/recent-dogs') {
          return Promise.resolve(mockRecentDogs);
        }
        if (url === '/api/organizations/2/recent-dogs') {
          return Promise.reject(new Error('Recent dogs fetch failed'));
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const result = await getEnhancedOrganizations();

      expect(result).toHaveLength(2);
      
      // First organization should have recent dogs
      expect(result[0]).toMatchObject({
        ...mockOrganizations[0],
        recent_dogs: mockRecentDogs
      });

      // Second organization should have empty recent dogs due to error
      expect(result[1]).toMatchObject({
        ...mockOrganizations[1],
        recent_dogs: []
      });
    });

    test('handles complete failure of main organizations call', async () => {
      const mainError = new Error('Organizations API failed');
      api.get.mockRejectedValueOnce(mainError);

      await expect(getEnhancedOrganizations()).rejects.toThrow('Organizations API failed');
    });

    test('handles empty organizations list', async () => {
      api.get.mockResolvedValueOnce([]);

      const result = await getEnhancedOrganizations();

      expect(result).toEqual([]);
      expect(api.get).toHaveBeenCalledTimes(1);
    });

    test('includes proper error handling and logging', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      api.get.mockImplementation((url) => {
        if (url === '/api/organizations') {
          return Promise.resolve(mockOrganizations);
        }
        if (url.includes('/recent-dogs')) {
          return Promise.reject(new Error('Recent dogs API down'));
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const result = await getEnhancedOrganizations();

      expect(result).toHaveLength(2);
      expect(result[0].recent_dogs).toEqual([]);
      expect(result[1].recent_dogs).toEqual([]);

      // Should have logged warnings for failed recent dogs calls
      expect(consoleSpy).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch recent dogs for organization'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
      errorSpy.mockRestore();
      process.env.NODE_ENV = originalNodeEnv;
    });

    test('maintains organization order from API', async () => {
      const orderedOrgs = [
        { id: 3, name: 'Alpha Rescue', total_dogs: 5 },
        { id: 1, name: 'Beta Rescue', total_dogs: 10 },
        { id: 2, name: 'Gamma Rescue', total_dogs: 15 }
      ];

      api.get.mockImplementation((url) => {
        if (url === '/api/organizations') {
          return Promise.resolve(orderedOrgs);
        }
        if (url.includes('/recent-dogs')) {
          return Promise.resolve([]);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const result = await getEnhancedOrganizations();

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe(3);
      expect(result[1].id).toBe(1);
      expect(result[2].id).toBe(2);
    });
  });

  describe('Performance and Error Resilience', () => {
    test('handles network timeouts gracefully', async () => {
      const timeoutError = new Error('Network timeout');
      timeoutError.code = 'TIMEOUT';
      
      api.get.mockRejectedValueOnce(timeoutError);

      await expect(getOrganizationStatistics(1)).rejects.toThrow('Network timeout');
    });

    test('handles malformed API responses', async () => {
      api.get.mockResolvedValueOnce(null);

      const result = await getOrganizationRecentDogs(1);
      expect(result).toBeNull();
    });

    test('concurrent recent dogs fetching works correctly', async () => {
      const orgs = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        name: `Org ${i + 1}`,
        total_dogs: 5
      }));

      let callCount = 0;
      api.get.mockImplementation((url) => {
        if (url === '/api/organizations') {
          return Promise.resolve(orgs);
        }
        if (url.includes('/recent-dogs')) {
          callCount++;
          return Promise.resolve([{ id: callCount, name: `Dog ${callCount}` }]);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const result = await getEnhancedOrganizations();

      expect(result).toHaveLength(10);
      expect(callCount).toBe(10); // Should have made 10 concurrent calls
      
      // Each organization should have unique recent dogs
      result.forEach((org, index) => {
        expect(org.recent_dogs).toHaveLength(1);
        expect(org.recent_dogs[0].name).toBe(`Dog ${index + 1}`);
      });
    });
  });
});
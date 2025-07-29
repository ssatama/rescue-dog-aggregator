/**
 * Tests for dynamic sitemap.xml generation
 * Following TDD approach for SEO implementation
 */

// Mock the services
jest.mock('../../services/animalsService', () => ({
  getAllAnimals: jest.fn()
}));

jest.mock('../../services/organizationsService', () => ({
  getAllOrganizations: jest.fn()
}));

import { getAllAnimals } from '../../services/animalsService';
import { getAllOrganizations } from '../../services/organizationsService';

// Import the sitemap generation function (to be implemented)
import { generateSitemap, formatSitemapEntry, formatDateForSitemap } from '../../utils/sitemap';

describe('Dynamic Sitemap Generation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockDogs = [
    {
      id: 1,
      slug: 'buddy-mixed-breed-1',
      name: 'Buddy',
      updated_at: '2024-01-15T10:00:00Z',
      organization: { name: 'Happy Paws' }
    },
    {
      id: 2,
      slug: 'luna-labrador-retriever-2',
      name: 'Luna',
      updated_at: '2024-01-16T11:00:00Z',
      organization: { name: 'City Shelter' }
    }
  ];

  const mockOrganizations = [
    {
      id: 1,
      slug: 'happy-paws-rescue-1',
      name: 'Happy Paws Rescue',
      updated_at: '2024-01-10T09:00:00Z'
    },
    {
      id: 2,
      slug: 'city-animal-shelter-2',
      name: 'City Animal Shelter',
      updated_at: '2024-01-12T14:00:00Z'
    }
  ];

  describe('formatSitemapEntry', () => {
    test('should format basic sitemap entry with required fields', () => {
      const entry = formatSitemapEntry({
        url: 'https://rescuedogs.me/dogs/1',
        lastmod: '2024-01-15T10:00:00Z',
        changefreq: 'daily',
        priority: 0.8
      });

      expect(entry).toEqual({
        url: 'https://rescuedogs.me/dogs/1',
        lastmod: '2024-01-15T10:00:00Z',
        changefreq: 'daily',
        priority: 0.8
      });
    });

    test('should handle entry with minimal data', () => {
      const entry = formatSitemapEntry({
        url: 'https://rescuedogs.me/about'
      });

      expect(entry.url).toBe('https://rescuedogs.me/about');
      expect(entry.lastmod).toBeUndefined();
      expect(entry.changefreq).toBeUndefined();
      expect(entry.priority).toBeUndefined();
    });

    test('should validate URL format', () => {
      expect(() => formatSitemapEntry({ url: 'invalid-url' })).toThrow();
      expect(() => formatSitemapEntry({ url: '' })).toThrow();
      expect(() => formatSitemapEntry({})).toThrow();
    });

    test('should validate priority range', () => {
      expect(() => formatSitemapEntry({
        url: 'https://rescuedogs.me/test',
        priority: 1.5
      })).toThrow();

      expect(() => formatSitemapEntry({
        url: 'https://rescuedogs.me/test',
        priority: -0.1
      })).toThrow();
    });

    test('should validate changefreq values', () => {
      const validFreqs = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'];
      
      validFreqs.forEach(freq => {
        expect(() => formatSitemapEntry({
          url: 'https://rescuedogs.me/test',
          changefreq: freq
        })).not.toThrow();
      });

      expect(() => formatSitemapEntry({
        url: 'https://rescuedogs.me/test',
        changefreq: 'invalid'
      })).toThrow();
    });
  });

  describe('generateSitemap', () => {
    test('should generate complete sitemap with all content types', async () => {
      getAllAnimals.mockResolvedValue(mockDogs);
      getAllOrganizations.mockResolvedValue(mockOrganizations);

      const sitemap = await generateSitemap();

      expect(sitemap).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(sitemap).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
      expect(sitemap).toContain('</urlset>');
    });

    test('should include static pages with correct priorities', async () => {
      getAllAnimals.mockResolvedValue([]);
      getAllOrganizations.mockResolvedValue([]);

      const sitemap = await generateSitemap();

      // Homepage should have highest priority
      expect(sitemap).toContain('<loc>https://rescuedogs.me/</loc>');
      expect(sitemap).toContain('<priority>1</priority>');

      // Main sections should have high priority
      expect(sitemap).toContain('<loc>https://rescuedogs.me/dogs</loc>');
      expect(sitemap).toContain('<loc>https://rescuedogs.me/organizations</loc>');
      expect(sitemap).toContain('<loc>https://rescuedogs.me/search</loc>');

      // Informational pages should have medium priority
      expect(sitemap).toContain('<loc>https://rescuedogs.me/about</loc>');
      expect(sitemap).toContain('<loc>https://rescuedogs.me/contact</loc>');
    });

    test('should include all dog pages with dynamic content', async () => {
      getAllAnimals.mockResolvedValue(mockDogs);
      getAllOrganizations.mockResolvedValue([]);

      const sitemap = await generateSitemap();

      // Should include individual dog pages
      expect(sitemap).toContain('<loc>https://rescuedogs.me/dogs/buddy-mixed-breed-1</loc>');
      expect(sitemap).toContain('<loc>https://rescuedogs.me/dogs/luna-labrador-retriever-2</loc>');

      // Should include lastmod dates from dog data (formatted for XML sitemap)
      expect(sitemap).toContain('<lastmod>2024-01-15T10:00:00+00:00</lastmod>');
      expect(sitemap).toContain('<lastmod>2024-01-16T11:00:00+00:00</lastmod>');

      // Dog pages should have high priority and daily updates
      expect(sitemap).toContain('<changefreq>daily</changefreq>');
      expect(sitemap).toContain('<priority>0.8</priority>');
    });

    test('should include all organization pages', async () => {
      getAllAnimals.mockResolvedValue([]);
      getAllOrganizations.mockResolvedValue(mockOrganizations);

      const sitemap = await generateSitemap();

      // Should include individual organization pages
      expect(sitemap).toContain('<loc>https://rescuedogs.me/organizations/happy-paws-rescue-1</loc>');
      expect(sitemap).toContain('<loc>https://rescuedogs.me/organizations/city-animal-shelter-2</loc>');

      // Should include lastmod dates from organization data (formatted for XML sitemap)
      expect(sitemap).toContain('<lastmod>2024-01-10T09:00:00+00:00</lastmod>');
      expect(sitemap).toContain('<lastmod>2024-01-12T14:00:00+00:00</lastmod>');

      // Organization pages should have medium-high priority and weekly updates
      expect(sitemap).toContain('<changefreq>weekly</changefreq>');
      expect(sitemap).toContain('<priority>0.7</priority>');
    });

    test('should handle empty data gracefully', async () => {
      getAllAnimals.mockResolvedValue([]);
      getAllOrganizations.mockResolvedValue([]);

      const sitemap = await generateSitemap();

      // Should still include static pages
      expect(sitemap).toContain('<loc>https://rescuedogs.me/</loc>');
      expect(sitemap).toContain('<loc>https://rescuedogs.me/dogs</loc>');
      expect(sitemap).toContain('<loc>https://rescuedogs.me/organizations</loc>');

      // Should be valid XML
      expect(sitemap).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(sitemap).toContain('</urlset>');
    });

    test('should handle API errors gracefully', async () => {
      getAllAnimals.mockRejectedValue(new Error('Database error'));
      getAllOrganizations.mockRejectedValue(new Error('Database error'));

      const sitemap = await generateSitemap();

      // Should still generate sitemap with static pages only
      expect(sitemap).toContain('<loc>https://rescuedogs.me/</loc>');
      expect(sitemap).toContain('</urlset>');
    });

    test('should validate generated XML format', async () => {
      getAllAnimals.mockResolvedValue(mockDogs);
      getAllOrganizations.mockResolvedValue(mockOrganizations);

      const sitemap = await generateSitemap();

      // Basic XML structure validation
      expect(sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
      expect(sitemap).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
      expect(sitemap.endsWith('</urlset>')).toBe(true);

      // Count opening and closing url tags should match
      const openTags = (sitemap.match(/<url>/g) || []).length;
      const closeTags = (sitemap.match(/<\/url>/g) || []).length;
      expect(openTags).toBe(closeTags);
      expect(openTags).toBeGreaterThan(0);
    });

    test('should respect URL limits for large datasets', async () => {
      // Generate large dataset
      const largeDogList = Array.from({ length: 60000 }, (_, i) => ({
        id: i + 1,
        name: `Dog ${i + 1}`,
        updated_at: '2024-01-15T10:00:00Z'
      }));

      getAllAnimals.mockResolvedValue(largeDogList);
      getAllOrganizations.mockResolvedValue([]);

      const sitemap = await generateSitemap();

      // Should limit URLs to 50,000 (sitemap standard limit)
      const urlCount = (sitemap.match(/<url>/g) || []).length;
      expect(urlCount).toBeLessThanOrEqual(50000);
    });

    test('should include proper encoding for special characters', async () => {
      const dogsWithSpecialChars = [
        {
          id: 1,
          name: 'Ñoño & María',
          updated_at: '2024-01-15T10:00:00Z'
        }
      ];

      getAllAnimals.mockResolvedValue(dogsWithSpecialChars);
      getAllOrganizations.mockResolvedValue([]);

      const sitemap = await generateSitemap();

      // Should properly encode URLs and handle special characters
      expect(sitemap).toContain('<loc>https://rescuedogs.me/dogs/unknown-dog-1</loc>');
      expect(sitemap).not.toContain('&'); // Should not contain unescaped ampersands
    });
  });

  describe('formatDateForSitemap', () => {
    test('should format API date with microseconds to W3C datetime format', () => {
      const apiDate = '2025-07-14T08:58:28.426257';
      const result = formatDateForSitemap(apiDate);
      
      // Should be in W3C datetime format (ISO 8601 with timezone)
      expect(result).toBe('2025-07-14T08:58:28+00:00');
    });

    test('should handle API date without microseconds', () => {
      const apiDate = '2025-07-14T08:58:28';
      const result = formatDateForSitemap(apiDate);
      
      expect(result).toBe('2025-07-14T08:58:28+00:00');
    });

    test('should handle API date with timezone already present', () => {
      const apiDate = '2025-07-14T08:58:28Z';
      const result = formatDateForSitemap(apiDate);
      
      expect(result).toBe('2025-07-14T08:58:28+00:00');
    });

    test('should return null for invalid date strings', () => {
      expect(formatDateForSitemap('invalid-date')).toBeNull();
      expect(formatDateForSitemap('2025-13-40T99:99:99')).toBeNull();
    });

    test('should return null for null or undefined input', () => {
      expect(formatDateForSitemap(null)).toBeNull();
      expect(formatDateForSitemap(undefined)).toBeNull();
      expect(formatDateForSitemap('')).toBeNull();
    });

    test('should handle edge case of future dates', () => {
      const futureDate = '2030-12-31T23:59:59.999999';
      const result = formatDateForSitemap(futureDate);
      
      expect(result).toBe('2030-12-31T23:59:59+00:00');
    });

    test('should handle edge case of very old dates', () => {
      const oldDate = '1970-01-01T00:00:00.000000';
      const result = formatDateForSitemap(oldDate);
      
      expect(result).toBe('1970-01-01T00:00:00+00:00');
    });
  });

  describe('generateDogPages with real API date format', () => {
    test('should format dog dates correctly with real API microsecond format', async () => {
      // Mock dogs with the actual API date format (microseconds, no timezone)
      const mockDogsWithRealDates = [
        {
          id: 1,
          name: 'Buddy',
          updated_at: '2025-07-14T08:58:28.426257', // Real API format
          organization: { name: 'Happy Paws' }
        },
        {
          id: 2,
          name: 'Luna',
          updated_at: '2025-07-11T20:13:59.641485', // Real API format
          organization: { name: 'City Shelter' }
        }
      ];

      getAllAnimals.mockResolvedValue(mockDogsWithRealDates);
      getAllOrganizations.mockResolvedValue([]);

      const sitemap = await generateSitemap();

      // Should contain properly formatted lastmod dates
      expect(sitemap).toContain('<lastmod>2025-07-14T08:58:28+00:00</lastmod>');
      expect(sitemap).toContain('<lastmod>2025-07-11T20:13:59+00:00</lastmod>');
      
      // Should not contain the raw API date format
      expect(sitemap).not.toContain('2025-07-14T08:58:28.426257');
      expect(sitemap).not.toContain('2025-07-11T20:13:59.641485');
    });
  });

  describe('generateOrganizationPages with real API date format', () => {
    test('should format organization dates correctly with real API microsecond format', async () => {
      // Mock organizations with the actual API date format (microseconds, no timezone)
      const mockOrgsWithRealDates = [
        {
          id: 1,
          name: 'Happy Paws Rescue',
          updated_at: '2025-07-11T20:13:59.641485' // Real API format
        },
        {
          id: 2,
          name: 'City Animal Shelter',
          updated_at: '2025-07-10T15:30:45.123456' // Real API format
        }
      ];

      getAllAnimals.mockResolvedValue([]);
      getAllOrganizations.mockResolvedValue(mockOrgsWithRealDates);

      const sitemap = await generateSitemap();

      // Should contain properly formatted lastmod dates
      expect(sitemap).toContain('<lastmod>2025-07-11T20:13:59+00:00</lastmod>');
      expect(sitemap).toContain('<lastmod>2025-07-10T15:30:45+00:00</lastmod>');
      
      // Should not contain the raw API date format
      expect(sitemap).not.toContain('2025-07-11T20:13:59.641485');
      expect(sitemap).not.toContain('2025-07-10T15:30:45.123456');
    });
  });
});
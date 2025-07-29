/**
 * Integration tests for Next.js metadata processing and validation
 */
import { generateMetadata as generateDogMetadata } from '../../app/dogs/[slug]/page';
import { generateMetadata as generateOrgMetadata } from '../../app/organizations/[slug]/page';

// Mock the services
jest.mock('../../services/animalsService', () => ({
  getAnimalBySlug: jest.fn()
}));

jest.mock('../../services/organizationsService', () => ({
  getOrganizationBySlug: jest.fn()
}));

import { getAnimalBySlug } from '../../services/animalsService';
import { getOrganizationBySlug } from '../../services/organizationsService';

describe('Metadata Validation Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('OpenGraph Type Validation', () => {
    test('should use valid OpenGraph types for all pages', async () => {
      // Valid OpenGraph types according to specification
      const validTypes = [
        'website', 'article', 'profile', 'book', 
        'video.movie', 'video.episode', 'video.tv_show', 'video.other',
        'music.song', 'music.album', 'music.playlist', 'music.radio_station'
      ];

      // Test dog detail page
      const mockDog = {
        id: 1,
        slug: 'test-dog-test-breed-1',
        name: 'Test Dog',
        standardized_breed: 'Test Breed',
        organization: { name: 'Test Org' }
      };
      getAnimalBySlug.mockResolvedValue(mockDog);
      
      const dogMetadata = await generateDogMetadata({ params: { slug: 'test-dog-test-breed-1' } });
      expect(validTypes).toContain(dogMetadata.openGraph.type);

      // Test organization detail page
      const mockOrg = {
        id: 1,
        slug: 'test-organization-1',
        name: 'Test Organization',
        description: 'Test description'
      };
      getOrganizationBySlug.mockResolvedValue(mockOrg);
      
      const orgMetadata = await generateOrgMetadata({ params: { slug: 'test-organization-1' } });
      expect(validTypes).toContain(orgMetadata.openGraph.type);
    });

    test('should never use invalid OpenGraph types', async () => {
      // Common invalid types that might be mistakenly used
      const invalidTypes = [
        'organization', 'company', 'business', 'nonprofit', 
        'charity', 'rescue', 'shelter', 'dog', 'animal'
      ];

      const mockOrg = {
        id: 1,
        slug: 'test-organization-1',
        name: 'Test Organization',
        description: 'Test description'
      };
      getOrganizationBySlug.mockResolvedValue(mockOrg);
      
      const orgMetadata = await generateOrgMetadata({ params: { slug: 'test-organization-1' } });
      
      invalidTypes.forEach(invalidType => {
        expect(orgMetadata.openGraph.type).not.toBe(invalidType);
      });
    });
  });

  describe('Required Metadata Fields', () => {
    test('should include all required OpenGraph fields', async () => {
      const mockOrg = {
        id: 1,
        slug: 'test-organization-1',
        name: 'Test Organization',
        description: 'Test description'
      };
      getOrganizationBySlug.mockResolvedValue(mockOrg);
      
      const metadata = await generateOrgMetadata({ params: { slug: 'test-organization-1' } });
      
      // Required OpenGraph fields
      expect(metadata.openGraph.title).toBeDefined();
      expect(metadata.openGraph.description).toBeDefined();
      expect(metadata.openGraph.type).toBeDefined();
      expect(metadata.openGraph.siteName).toBeDefined();
      
      // Ensure they're not empty strings
      expect(metadata.openGraph.title).not.toBe('');
      expect(metadata.openGraph.description).not.toBe('');
      expect(metadata.openGraph.type).not.toBe('');
      expect(metadata.openGraph.siteName).not.toBe('');
    });

    test('should include Twitter Card metadata', async () => {
      const mockOrg = {
        id: 1,
        slug: 'test-organization-1',
        name: 'Test Organization',
        description: 'Test description'
      };
      getOrganizationBySlug.mockResolvedValue(mockOrg);
      
      const metadata = await generateOrgMetadata({ params: { slug: 'test-organization-1' } });
      
      expect(metadata.twitter).toBeDefined();
      expect(metadata.twitter.card).toBeDefined();
      expect(metadata.twitter.title).toBeDefined();
      expect(metadata.twitter.description).toBeDefined();
      
      // Valid Twitter card types
      const validCardTypes = ['summary', 'summary_large_image', 'app', 'player'];
      expect(validCardTypes).toContain(metadata.twitter.card);
    });
  });

  describe('Error Handling in Metadata Generation', () => {
    test('should handle service errors gracefully', async () => {
      getOrganizationBySlug.mockRejectedValue(new Error('Service error'));
      
      const metadata = await generateOrgMetadata({ params: { slug: '999' } });
      
      expect(metadata.title).toContain('Not Found');
      expect(metadata.description).toBeDefined();
      // Should not include OpenGraph when there's an error
      expect(metadata.openGraph).toBeUndefined();
    });

    test('should handle missing data gracefully', async () => {
      const mockOrgMinimal = {
        id: 1,
        slug: 'test-organization-1',
        name: 'Test Organization'
        // Missing description, city, country
      };
      getOrganizationBySlug.mockResolvedValue(mockOrgMinimal);
      
      const metadata = await generateOrgMetadata({ params: { slug: 'test-organization-1' } });
      
      expect(metadata.title).toBeDefined();
      expect(metadata.description).toBeDefined();
      expect(metadata.openGraph.type).toBe('website');
    });
  });
});
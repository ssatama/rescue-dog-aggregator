/**
 * Tests for SEO meta tags implementation
 */
import { generateMetadata as generateDogMetadata } from '../../app/dogs/[id]/page';
import { generateMetadata as generateOrgMetadata } from '../../app/organizations/[id]/page';

// Mock the services
jest.mock('../../services/animalsService', () => ({
  getAnimalById: jest.fn()
}));

jest.mock('../../services/organizationsService', () => ({
  getOrganizationById: jest.fn()
}));

import { getAnimalById } from '../../services/animalsService';
import { getOrganizationById } from '../../services/organizationsService';

describe('SEO Meta Tags', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Dog Detail Page Meta Tags', () => {
    test('should generate meta tags for dog detail page', async () => {
      const mockDog = {
        id: 1,
        name: 'Buddy',
        standardized_breed: 'Labrador Retriever',
        primary_image_url: 'https://example.com/buddy.jpg',
        description: 'A friendly dog looking for a loving home.',
        organization: {
          name: 'Happy Paws Rescue',
          city: 'San Francisco',
          country: 'USA'
        }
      };

      getAnimalById.mockResolvedValue(mockDog);

      const metadata = await generateDogMetadata({ params: { id: '1' } });

      expect(metadata).toEqual({
        title: 'Buddy - Labrador Retriever Available for Adoption | Rescue Dog Aggregator',
        description: 'Meet Buddy, a Labrador Retriever looking for a forever home. A friendly dog looking for a loving home. Available for adoption from Happy Paws Rescue in San Francisco, USA.',
        openGraph: {
          title: 'Buddy - Available for Adoption',
          description: 'Meet Buddy, a Labrador Retriever looking for a forever home. A friendly dog looking for a loving home.',
          images: ['https://example.com/buddy.jpg'],
          type: 'article',
          siteName: 'Rescue Dog Aggregator'
        },
        twitter: {
          card: 'summary_large_image',
          title: 'Buddy - Available for Adoption',
          description: 'Meet Buddy, a Labrador Retriever looking for a forever home.',
          images: ['https://example.com/buddy.jpg']
        }
      });
    });

    test('should generate meta tags for dog without description', async () => {
      const mockDog = {
        id: 2,
        name: 'Luna',
        standardized_breed: 'Poodle',
        primary_image_url: 'https://example.com/luna.jpg',
        organization: {
          name: 'Pet Rescue Center'
        }
      };

      getAnimalById.mockResolvedValue(mockDog);

      const metadata = await generateDogMetadata({ params: { id: '2' } });

      expect(metadata.description).toContain('Meet Luna, a Poodle looking for a forever home');
      expect(metadata.description).toContain('Available for adoption now');
    });

    test('should handle API errors gracefully', async () => {
      getAnimalById.mockRejectedValue(new Error('Dog not found'));

      const metadata = await generateDogMetadata({ params: { id: '999' } });

      expect(metadata).toEqual({
        title: 'Dog Not Found | Rescue Dog Aggregator',
        description: 'The requested dog could not be found. Browse our available dogs for adoption.'
      });
    });
  });

  describe('Organization Detail Page Meta Tags', () => {
    test('should generate meta tags for organization detail page', async () => {
      const mockOrg = {
        id: 1,
        name: 'Happy Paws Rescue',
        description: 'Dedicated to rescuing and rehoming dogs in need.',
        city: 'San Francisco',
        country: 'USA',
        website_url: 'https://happypaws.org'
      };

      getOrganizationById.mockResolvedValue(mockOrg);

      const metadata = await generateOrgMetadata({ params: { id: '1' } });

      expect(metadata).toEqual({
        title: 'Happy Paws Rescue - Dog Rescue Organization | Rescue Dog Aggregator',
        description: 'Learn about Happy Paws Rescue and their available dogs for adoption. Dedicated to rescuing and rehoming dogs in need. Located in San Francisco, USA.',
        openGraph: {
          title: 'Happy Paws Rescue - Dog Rescue Organization',
          description: 'Learn about Happy Paws Rescue and their available dogs for adoption. Dedicated to rescuing and rehoming dogs in need.',
          type: 'organization',
          siteName: 'Rescue Dog Aggregator'
        },
        twitter: {
          card: 'summary',
          title: 'Happy Paws Rescue - Dog Rescue Organization',
          description: 'Learn about Happy Paws Rescue and their available dogs for adoption.'
        }
      });
    });
  });

  describe('Static Meta Tags', () => {
    test('should have default meta tags in root layout', async () => {
      // Import the layout metadata
      const { metadata } = await import('../../app/layout.js');
      
      expect(metadata.title).toBe('Rescue Dog Aggregator - Find Your Perfect Rescue Dog');
      expect(metadata.description).toContain('Find your perfect rescue dog from multiple organizations');
      expect(metadata.openGraph).toBeDefined();
      expect(metadata.twitter).toBeDefined();
      expect(metadata.keywords).toContain('rescue dogs');
    });

    test('should have proper meta tags for about page', async () => {
      const { metadata } = await import('../../app/about/page.jsx');
      
      expect(metadata.title).toBe('About Us - Rescue Dog Aggregator');
      expect(metadata.description).toContain('Learn about our mission');
      expect(metadata.openGraph.title).toBe('About Rescue Dog Aggregator');
    });
  });
});
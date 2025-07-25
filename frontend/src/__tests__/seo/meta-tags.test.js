/**
 * Tests for SEO meta tags implementation
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

describe('SEO Meta Tags', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Dog Detail Page Meta Tags', () => {
    test('should generate meta tags for dog detail page', async () => {
      const mockDog = {
        id: 1,
        slug: 'buddy-labrador-retriever-1',
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

      getAnimalBySlug.mockResolvedValue(mockDog);

      const metadata = await generateDogMetadata({ params: { slug: 'buddy-labrador-retriever-1' } });

      expect(metadata.title).toBe('Buddy - Labrador Retriever Available for Adoption | Rescue Dog Aggregator');
      expect(metadata.description).toBe('Meet Buddy, a Labrador Retriever looking for a forever home. A friendly dog looking for a loving home. Available for adoption from Happy Paws Rescue in San Francisco, USA.');
      
      // Check canonical URL
      expect(metadata.alternates.canonical).toBe('https://rescuedogs.me/dogs/buddy-labrador-retriever-1');
      
      // Check OpenGraph
      expect(metadata.openGraph.title).toBe('Buddy - Available for Adoption');
      expect(metadata.openGraph.description).toBe('Meet Buddy, a Labrador Retriever looking for a forever home. A friendly dog looking for a loving home.');
      expect(metadata.openGraph.images).toEqual(['https://example.com/buddy.jpg']);
      expect(metadata.openGraph.type).toBe('article');
      expect(metadata.openGraph.siteName).toBe('Rescue Dog Aggregator');
      expect(metadata.openGraph.url).toBe('https://rescuedogs.me/dogs/buddy-labrador-retriever-1');
      
      // Check Twitter
      expect(metadata.twitter.card).toBe('summary_large_image');
      expect(metadata.twitter.title).toBe('Buddy - Available for Adoption');
      expect(metadata.twitter.description).toBe('Meet Buddy, a Labrador Retriever looking for a forever home.');
      expect(metadata.twitter.images).toEqual(['https://example.com/buddy.jpg']);
      
      // Check structured data
      expect(metadata.other['script:ld+json']).toBeDefined();
      const structuredData = JSON.parse(metadata.other['script:ld+json']);
      expect(structuredData['@type']).toBe('Pet');
      expect(structuredData.name).toBe('Buddy');
    });

    test('should generate meta tags for dog without description', async () => {
      const mockDog = {
        id: 2,
        slug: 'luna-poodle-2',
        name: 'Luna',
        standardized_breed: 'Poodle',
        primary_image_url: 'https://example.com/luna.jpg',
        organization: {
          name: 'Pet Rescue Center'
        }
      };

      getAnimalBySlug.mockResolvedValue(mockDog);

      const metadata = await generateDogMetadata({ params: { slug: 'luna-poodle-2' } });

      expect(metadata.description).toContain('Meet Luna, a Poodle looking for a forever home');
      expect(metadata.description).toContain('Available for adoption now');
    });

    test('should handle API errors gracefully', async () => {
      getAnimalBySlug.mockRejectedValue(new Error('Dog not found'));

      const metadata = await generateDogMetadata({ params: { slug: 'unknown-dog-999' } });

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
        slug: 'happy-paws-rescue-1',
        name: 'Happy Paws Rescue',
        description: 'Dedicated to rescuing and rehoming dogs in need.',
        city: 'San Francisco',
        country: 'USA',
        website_url: 'https://happypaws.org'
      };

      getOrganizationBySlug.mockResolvedValue(mockOrg);

      const metadata = await generateOrgMetadata({ params: { slug: 'happy-paws-rescue-1' } });

      expect(metadata.title).toBe('Happy Paws Rescue - Dog Rescue Organization | Rescue Dog Aggregator');
      expect(metadata.description).toBe('Learn about Happy Paws Rescue and their available dogs for adoption. Dedicated to rescuing and rehoming dogs in need. Located in San Francisco, USA.');
      
      // Check canonical URL
      expect(metadata.alternates.canonical).toBe('https://rescuedogs.me/organizations/happy-paws-rescue-1');
      
      // Check OpenGraph
      expect(metadata.openGraph.title).toBe('Happy Paws Rescue - Dog Rescue Organization');
      expect(metadata.openGraph.description).toBe('Learn about Happy Paws Rescue and their available dogs for adoption. Dedicated to rescuing and rehoming dogs in need.');
      expect(metadata.openGraph.type).toBe('website');
      expect(metadata.openGraph.siteName).toBe('Rescue Dog Aggregator');
      expect(metadata.openGraph.url).toBe('https://rescuedogs.me/organizations/happy-paws-rescue-1');
      
      // Check Twitter
      expect(metadata.twitter.card).toBe('summary');
      expect(metadata.twitter.title).toBe('Happy Paws Rescue - Dog Rescue Organization');
      expect(metadata.twitter.description).toBe('Learn about Happy Paws Rescue and their available dogs for adoption.');
      
      // Check structured data
      expect(metadata.other['script:ld+json']).toBeDefined();
      const structuredData = JSON.parse(metadata.other['script:ld+json']);
      expect(structuredData['@type']).toEqual(['LocalBusiness', 'AnimalShelter']);
      expect(structuredData.name).toBe('Happy Paws Rescue');
    });

    test('should only allow valid OpenGraph types', async () => {
      const mockOrg = {
        id: 1,
        slug: 'test-org-1',
        name: 'Test Org',
        description: 'Test description'
      };

      getOrganizationBySlug.mockResolvedValue(mockOrg);

      const metadata = await generateOrgMetadata({ params: { slug: 'test-org-1' } });

      // Valid OpenGraph types according to specification
      const validTypes = ['website', 'article', 'profile', 'book', 'video.movie', 'video.episode', 'video.tv_show', 'video.other', 'music.song', 'music.album', 'music.playlist', 'music.radio_station'];
      
      expect(validTypes).toContain(metadata.openGraph.type);
      expect(metadata.openGraph.type).toBe('website');
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
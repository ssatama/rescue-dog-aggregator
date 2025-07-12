/**
 * Tests for structured data integration in pages
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

describe('Structured Data Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Dog Detail Page Structured Data', () => {
    const mockDog = {
      id: 1,
      name: 'Buddy',
      standardized_breed: 'Labrador Retriever',
      sex: 'male',
      age_text: 'Adult',
      primary_image_url: 'https://images.rescuedogs.me/buddy.jpg',
      description: 'Friendly dog looking for a loving home.',
      organization: {
        name: 'Happy Paws Rescue',
        city: 'San Francisco',
        country: 'USA'
      }
    };

    test('should include Pet schema in metadata', async () => {
      getAnimalById.mockResolvedValue(mockDog);

      const metadata = await generateDogMetadata({ params: { id: '1' } });

      expect(metadata.other).toBeDefined();
      expect(metadata.other['script:ld+json']).toBeDefined();

      // Parse the JSON-LD to verify it's valid
      const structuredData = JSON.parse(metadata.other['script:ld+json']);
      
      expect(structuredData).toEqual({
        '@context': 'https://schema.org',
        '@type': 'Pet',
        'name': 'Buddy',
        'animal': 'Dog',
        'breed': 'Labrador Retriever',
        'gender': 'Male',
        'age': 'Adult',
        'description': 'Friendly dog looking for a loving home.',
        'image': 'https://images.rescuedogs.me/buddy.jpg',
        'location': {
          '@type': 'Place',
          'name': 'Happy Paws Rescue',
          'address': {
            '@type': 'PostalAddress',
            'addressLocality': 'San Francisco',
            'addressCountry': 'USA'
          }
        },
        'offers': {
          '@type': 'Offer',
          'availability': 'https://schema.org/InStock',
          'price': '0',
          'priceCurrency': 'USD',
          'description': 'Pet adoption - no purchase price, adoption fees may apply'
        }
      });
    });

    test('should include canonical URL in metadata', async () => {
      getAnimalById.mockResolvedValue(mockDog);

      const metadata = await generateDogMetadata({ params: { id: '1' } });

      expect(metadata.alternates).toBeDefined();
      expect(metadata.alternates.canonical).toBe('https://rescuedogs.me/dogs/1');
    });

    test('should include canonical URL in OpenGraph metadata', async () => {
      getAnimalById.mockResolvedValue(mockDog);

      const metadata = await generateDogMetadata({ params: { id: '1' } });

      expect(metadata.openGraph.url).toBe('https://rescuedogs.me/dogs/1');
    });

    test('should not include structured data if dog is invalid', async () => {
      getAnimalById.mockResolvedValue(null);

      const metadata = await generateDogMetadata({ params: { id: '999' } });

      expect(metadata.title).toBe('Dog Not Found | Rescue Dog Aggregator');
      expect(metadata.other).toBeUndefined();
    });

    test('should handle API errors gracefully', async () => {
      getAnimalById.mockRejectedValue(new Error('Dog not found'));

      const metadata = await generateDogMetadata({ params: { id: '999' } });

      expect(metadata.title).toBe('Dog Not Found | Rescue Dog Aggregator');
      expect(metadata.other).toBeUndefined();
    });

    test('should handle missing optional dog fields in schema', async () => {
      const minimalDog = {
        id: 2,
        name: 'Luna',
        organization: {
          name: 'City Shelter'
        }
      };

      getAnimalById.mockResolvedValue(minimalDog);

      const metadata = await generateDogMetadata({ params: { id: '2' } });

      expect(metadata.other).toBeDefined();
      
      const structuredData = JSON.parse(metadata.other['script:ld+json']);
      expect(structuredData['@type']).toBe('Pet');
      expect(structuredData.name).toBe('Luna');
      expect(structuredData.breed).toBeUndefined();
      expect(structuredData.age).toBeUndefined();
    });
  });

  describe('Organization Detail Page Structured Data', () => {
    const mockOrganization = {
      id: 1,
      name: 'Happy Paws Rescue',
      description: 'Dedicated to rescuing and rehoming dogs in need.',
      website_url: 'https://happypaws.org',
      city: 'San Francisco',
      country: 'USA',
      logo_url: 'https://images.rescuedogs.me/logo.png',
      total_dogs: 25,
      established_year: 2010
    };

    test('should include Organization schema in metadata', async () => {
      getOrganizationById.mockResolvedValue(mockOrganization);

      const metadata = await generateOrgMetadata({ params: { id: '1' } });

      expect(metadata.other).toBeDefined();
      expect(metadata.other['script:ld+json']).toBeDefined();

      // Parse the JSON-LD to verify it's valid
      const structuredData = JSON.parse(metadata.other['script:ld+json']);
      
      expect(structuredData).toEqual({
        '@context': 'https://schema.org',
        '@type': ['LocalBusiness', 'AnimalShelter'],
        'name': 'Happy Paws Rescue',
        'description': 'Dedicated to rescuing and rehoming dogs in need.',
        'url': 'https://happypaws.org',
        'logo': 'https://images.rescuedogs.me/logo.png',
        'foundingDate': '2010',
        'address': {
          '@type': 'PostalAddress',
          'addressLocality': 'San Francisco',
          'addressCountry': 'USA'
        },
        'serviceArea': {
          '@type': 'Place',
          'name': 'San Francisco, USA'
        },
        'knowsAbout': 'Dog rescue and adoption services',
        'additionalProperty': {
          '@type': 'PropertyValue',
          'name': 'Available Dogs',
          'value': 25
        }
      });
    });

    test('should include canonical URL in organization metadata', async () => {
      getOrganizationById.mockResolvedValue(mockOrganization);

      const metadata = await generateOrgMetadata({ params: { id: '1' } });

      expect(metadata.alternates).toBeDefined();
      expect(metadata.alternates.canonical).toBe('https://rescuedogs.me/organizations/1');
    });

    test('should handle organization with minimal data', async () => {
      const minimalOrg = {
        id: 2,
        name: 'Small Rescue',
        website_url: 'https://smallrescue.org'
      };

      getOrganizationById.mockResolvedValue(minimalOrg);

      const metadata = await generateOrgMetadata({ params: { id: '2' } });

      expect(metadata.other).toBeDefined();
      
      const structuredData = JSON.parse(metadata.other['script:ld+json']);
      expect(structuredData['@type']).toEqual(['LocalBusiness', 'AnimalShelter']);
      expect(structuredData.name).toBe('Small Rescue');
      expect(structuredData.url).toBe('https://smallrescue.org');
      expect(structuredData.address).toBeUndefined();
      expect(structuredData.logo).toBeUndefined();
    });

    test('should not include structured data for invalid organization', async () => {
      getOrganizationById.mockRejectedValue(new Error('Organization not found'));

      const metadata = await generateOrgMetadata({ params: { id: '999' } });

      expect(metadata.title).toBe('Organization Not Found | Rescue Dog Aggregator');
      expect(metadata.other).toBeUndefined();
    });
  });
});
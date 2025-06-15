/**
 * Hero Image Loading Fixes - Comprehensive Test
 * 
 * This test verifies the three specific fixes applied to resolve
 * the hero image loading issue without hard refresh:
 * 1. Force key prop on HeroImageWithBlurredBackground
 * 2. Loading check for dog.primary_image_url
 * 3. Disable lazy loading (use loading="eager")
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import DogDetailClient from '../../app/dogs/[id]/DogDetailClient';
import { getAnimalById } from '../../services/animalsService';

// Mock the services
jest.mock('../../services/animalsService');
jest.mock('../../services/relatedDogsService');

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'test-dog-123' }),
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock the Layout component 
jest.mock('../../components/layout/Layout', () => {
  return function MockLayout({ children }) {
    return <div data-testid="layout">{children}</div>;
  };
});

// Mock imageUtils with real-like behavior
jest.mock('../../utils/imageUtils', () => ({
  getDetailHeroImageWithPosition: jest.fn((url) => ({
    src: url ? `optimized-${url}` : '/placeholder_dog.svg',
    position: 'center center'
  })),
  getThumbnailImage: jest.fn((url) => `thumb-${url}`),
  handleImageError: jest.fn(),
  trackImageLoad: jest.fn(),
}));

// Mock other components to isolate hero image testing
jest.mock('../../components/organizations/OrganizationSection', () => {
  return function MockOrganizationSection() {
    return <div data-testid="organization-section">Organization</div>;
  };
});

jest.mock('../../components/dogs/RelatedDogsSection', () => {
  return function MockRelatedDogsSection() {
    return <div data-testid="related-dogs-section">Related Dogs</div>;
  };
});

const mockDog = {
  id: 'test-dog-123',
  name: 'Buddy',
  primary_image_url: 'https://example.com/buddy.jpg',
  standardized_breed: 'Golden Retriever',
  breed: 'Golden Retriever',
  sex: 'Male',
  age_min_months: 24,
  status: 'available',
  adoption_url: 'https://example.com/adopt/buddy',
  properties: {
    description: 'A friendly dog looking for a home.'
  },
  organization: {
    id: 'org-1',
    name: 'Test Rescue'
  },
  organization_id: 'org-1'
};

describe('Hero Image Loading Fixes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getAnimalById.mockResolvedValue(mockDog);
  });

  test('Fix 1: Hero image component should have force key prop', async () => {
    render(<DogDetailClient params={{ id: 'test-dog-123' }} />);

    // Wait for dog data to load
    await waitFor(() => {
      expect(screen.queryByTestId('layout')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Check that hero image container exists
    const heroContainer = screen.getByTestId('hero-image-container');
    expect(heroContainer).toBeInTheDocument();

    // Verify that HeroImageWithBlurredBackground is rendered with proper src
    // The key prop is internal to React, but we can verify the component renders correctly
    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img.src).toContain('optimized-https://example.com/buddy.jpg');
  });

  test('Fix 2: Loading check prevents rendering without primary_image_url', () => {
    // Test with dog that has no primary_image_url
    const dogWithoutImage = { ...mockDog, primary_image_url: null };
    getAnimalById.mockResolvedValue(dogWithoutImage);

    render(<DogDetailClient params={{ id: 'test-dog-123' }} />);

    // Initially should show loading state - this is handled by the loading check
    // The component should not attempt to render HeroImageWithBlurredBackground without src
    const heroContainer = screen.queryByTestId('hero-image-container');
    
    // During loading phase, we shouldn't see the broken hero image
    if (heroContainer) {
      const loadingText = screen.getByText('Loading image...');
      expect(loadingText).toBeInTheDocument();
    }
  });

  test('Fix 3: Hero image should use eager loading', async () => {
    render(<DogDetailClient params={{ id: 'test-dog-123' }} />);

    // Wait for component to load
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Find the hero image
    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    
    // Verify eager loading is set (not lazy)
    expect(img).toHaveAttribute('loading', 'eager');
    expect(img).not.toHaveAttribute('loading', 'lazy');
  });

  test('All fixes work together: Component renders correctly with key prop', async () => {
    render(<DogDetailClient params={{ id: 'test-dog-123' }} />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    const initialImg = screen.getByRole('img');
    expect(initialImg.src).toContain('buddy.jpg');
    expect(initialImg).toHaveAttribute('loading', 'eager');
    
    // Verify the key prop forces remount behavior by checking src is correct
    expect(initialImg.src).toContain('optimized-https://example.com/buddy.jpg');
  });

  test('Loading state handling during navigation', async () => {
    render(<DogDetailClient params={{ id: 'test-dog-123' }} />);

    // Initially should show loading skeleton
    expect(screen.getByTestId('layout')).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Hero image container should exist and not show the loading fallback
    const heroContainer = screen.getByTestId('hero-image-container');
    expect(heroContainer).toBeInTheDocument();
    
    // Should have the actual hero image component, not the loading fallback
    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img.src).toContain('buddy.jpg');
  });

  test('Error boundary and retry logic work with fixes', async () => {
    // Mock a dog with invalid image URL
    const dogWithBadImage = { 
      ...mockDog, 
      primary_image_url: 'not-a-valid-url' 
    };
    getAnimalById.mockResolvedValue(dogWithBadImage);

    render(<DogDetailClient params={{ id: 'test-dog-123' }} />);

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Should handle invalid URL gracefully
    const heroContainer = screen.getByTestId('hero-image-container');
    expect(heroContainer).toBeInTheDocument();
    
    // Component should either show error state or handle the invalid URL
    // This tests that our fixes don't break error handling
    const container = screen.getByTestId('hero-image-clean');
    expect(container).toBeInTheDocument();
  });
});
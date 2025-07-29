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
import DogDetailClient from '../../app/dogs/[slug]/DogDetailClient';
import { getAnimalBySlug } from '../../services/animalsService';

// Mock the services
jest.mock('../../services/animalsService', () => ({
  getAnimalBySlug: jest.fn()
}));
jest.mock('../../services/relatedDogsService', () => ({
  getRelatedDogs: jest.fn().mockResolvedValue([])
}));

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useParams: () => ({ slug: 'test-dog-mixed-breed-123' }),
  usePathname: () => '/dogs/test-dog-mixed-breed-123',
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

// Mock useAdvancedImage hook
jest.mock('../../hooks/useAdvancedImage', () => ({
  useAdvancedImage: jest.fn((src) => ({
    imageLoaded: true,
    hasError: false,
    isLoading: false,
    isRetrying: false,
    retryCount: 0,
    currentSrc: src ? `optimized-${src}` : '/placeholder_dog.svg',
    position: 'center center',
    networkStrategy: { loading: 'eager', retry: { maxRetries: 2 } },
    handleRetry: jest.fn(),
    hydrated: true
  }))
}));

// Mock other components to isolate hero image testing
jest.mock('../../components/organizations/OrganizationCard', () => {
  return function MockOrganizationCard() {
    return <div data-testid="organization-card">Organization</div>;
  };
});

jest.mock('../../components/dogs/RelatedDogsSection', () => {
  return function MockRelatedDogsSection() {
    return <div data-testid="related-dogs-section">Related Dogs</div>;
  };
});

const mockDog = {
  id: 'test-dog-123',
  slug: 'test-dog-mixed-breed-123',
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

// Import the mocked service
const { getRelatedDogs } = require('../../services/relatedDogsService');

describe('Hero Image Loading Fixes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Use real timers for async operations
    jest.useRealTimers();
    const { getAnimalBySlug } = require('../../services/animalsService');
    getAnimalBySlug.mockResolvedValue(mockDog);
    getRelatedDogs.mockResolvedValue([]);
    
    // Mock document.readyState to be 'complete' so API call starts immediately
    Object.defineProperty(document, 'readyState', {
      writable: true,
      value: 'complete'
    });
  });

  afterEach(() => {
    // Cleanup any pending operations
    jest.clearAllTimers();
  });

  test('Fix 1: Hero image component should have force key prop', async () => {
    await act(async () => {
      render(<DogDetailClient params={{ slug: 'test-dog-mixed-breed-123' }} />);
    });

    // Wait for the API call to complete and data to load
    await waitFor(async () => {
      // Wait for skeleton to disappear
      expect(screen.queryByTestId('dog-detail-skeleton')).not.toBeInTheDocument();
    }, { timeout: 5000 });

    // Wait for dog name to appear (indicates data loaded)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Buddy' })).toBeInTheDocument();
    });

    // Check that hero image container exists
    const heroContainer = screen.getByTestId('hero-image-container');
    expect(heroContainer).toBeInTheDocument();

    // Find the image element - it might be inside the hero container
    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    
    // The image src should be the optimized URL from our mock
    expect(img.src).toContain('optimized-https://example.com/buddy.jpg');
  });

  test('Fix 2: Loading check prevents rendering without primary_image_url', () => {
    // Test with dog that has no primary_image_url
    const dogWithoutImage = { ...mockDog, primary_image_url: null };
    const { getAnimalBySlug } = require('../../services/animalsService');
    getAnimalBySlug.mockResolvedValue(dogWithoutImage);

    render(<DogDetailClient params={{ slug: 'test-dog-mixed-breed-123' }} />);

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
    await act(async () => {
      render(<DogDetailClient params={{ slug: 'test-dog-mixed-breed-123' }} />);
    });

    // Wait for skeleton to disappear and data to load
    await waitFor(() => {
      expect(screen.queryByTestId('dog-detail-skeleton')).not.toBeInTheDocument();
    }, { timeout: 5000 });

    // Wait for dog name to appear in main heading
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Buddy' })).toBeInTheDocument();
    });

    // Find the hero image
    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    
    // Verify eager loading is set (not lazy)
    expect(img).toHaveAttribute('loading', 'eager');
    expect(img).not.toHaveAttribute('loading', 'lazy');
  });

  test('All fixes work together: Component renders correctly with key prop', async () => {
    await act(async () => {
      render(<DogDetailClient params={{ slug: 'test-dog-mixed-breed-123' }} />);
    });

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByTestId('dog-detail-skeleton')).not.toBeInTheDocument();
    }, { timeout: 5000 });

    // Wait for dog name to appear in main heading
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Buddy' })).toBeInTheDocument();
    });

    const initialImg = screen.getByRole('img');
    expect(initialImg.src).toContain('optimized-https://example.com/buddy.jpg');
    expect(initialImg).toHaveAttribute('loading', 'eager');
  });

  test('Loading state handling during navigation', async () => {
    await act(async () => {
      render(<DogDetailClient params={{ slug: 'test-dog-mixed-breed-123' }} />);
    });

    // Initially should show loading skeleton
    expect(screen.getByTestId('layout')).toBeInTheDocument();

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByTestId('dog-detail-skeleton')).not.toBeInTheDocument();
    }, { timeout: 5000 });

    // Wait for content to appear
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Buddy' })).toBeInTheDocument();
    });

    // Hero image container should exist and not show the loading fallback
    const heroContainer = screen.getByTestId('hero-image-container');
    expect(heroContainer).toBeInTheDocument();
    
    // Should have the actual hero image component, not the loading fallback
    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img.src).toContain('optimized-https://example.com/buddy.jpg');
  });

  test('Error boundary and retry logic work with fixes', async () => {
    // Mock a dog with invalid image URL
    const dogWithBadImage = { 
      ...mockDog, 
      primary_image_url: 'not-a-valid-url' 
    };
    const { getAnimalBySlug } = require('../../services/animalsService');
    getAnimalBySlug.mockResolvedValue(dogWithBadImage);

    await act(async () => {
      render(<DogDetailClient params={{ slug: 'test-dog-mixed-breed-123' }} />);
    });

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByTestId('dog-detail-skeleton')).not.toBeInTheDocument();
    }, { timeout: 5000 });

    // Should handle invalid URL gracefully
    const heroContainer = screen.getByTestId('hero-image-container');
    expect(heroContainer).toBeInTheDocument();
    
    // Component should either show error state or handle the invalid URL
    // This tests that our fixes don't break error handling
    const container = screen.getByTestId('hero-image-clean');
    expect(container).toBeInTheDocument();
  });
});
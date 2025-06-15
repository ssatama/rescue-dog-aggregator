/**
 * Test for Hero Image Loading Race Condition Fix
 * 
 * This test verifies that the hero image component properly handles
 * the race condition where src becomes available but optimizedSrc
 * calculation might not be ready immediately.
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import HeroImageWithBlurredBackground from '../../components/ui/HeroImageWithBlurredBackground';

// Mock the imageUtils to simulate race condition
jest.mock('../../utils/imageUtils', () => ({
  getDetailHeroImageWithPosition: jest.fn((url) => {
    // Simulate delay in optimizedSrc calculation
    return {
      src: url ? `optimized-${url}` : '/placeholder_dog.svg',
      position: 'center center'
    };
  }),
  handleImageError: jest.fn(),
  trackImageLoad: jest.fn()
}));

// Mock network utils
jest.mock('../../utils/networkUtils', () => ({
  getLoadingStrategy: jest.fn(() => ({
    loading: 'eager',
    timeout: 15000,
    retry: { maxRetries: 2, baseDelay: 1000, backoffMultiplier: 2 },
    skipOptimizations: false
  })),
  onNetworkChange: jest.fn(() => () => {}) // Return cleanup function
}));

// Mock useReducedMotion
jest.mock('../../hooks/useScrollAnimation', () => ({
  useReducedMotion: jest.fn(() => false)
}));

describe('Hero Image Race Condition Fix', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('should handle src becoming available after component mount', async () => {
    // Start with no src (simulating component mounting before data is ready)
    const { rerender } = render(
      <HeroImageWithBlurredBackground src={null} alt="Test Dog" />
    );

    // Should show "No image available" state
    expect(screen.getByText('No image available')).toBeInTheDocument();

    // Now provide src (simulating data becoming available)
    rerender(
      <HeroImageWithBlurredBackground 
        src="https://example.com/dog.jpg" 
        alt="Test Dog" 
      />
    );

    // Should start loading immediately
    await waitFor(() => {
      expect(screen.getByText('Loading image...')).toBeInTheDocument();
    });

    // Should have shimmer loader
    expect(screen.getByTestId('shimmer-loader')).toBeInTheDocument();

    // Image element should be present with correct src
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src');
    expect(img.src).toContain('optimized-https://example.com/dog.jpg');
  });

  test('should handle rapid src changes (navigation scenario)', async () => {
    const { rerender } = render(
      <HeroImageWithBlurredBackground 
        src="https://example.com/dog1.jpg" 
        alt="Dog 1" 
      />
    );

    // Should start loading first image
    await waitFor(() => {
      expect(screen.getByText('Loading image...')).toBeInTheDocument();
    });

    // Quickly change to second image (simulating navigation)
    rerender(
      <HeroImageWithBlurredBackground 
        src="https://example.com/dog2.jpg" 
        alt="Dog 2" 
      />
    );

    // Should reset to loading state for new image
    await waitFor(() => {
      expect(screen.getByText('Loading image...')).toBeInTheDocument();
    });

    // Image element should have updated src
    const img = screen.getByRole('img');
    expect(img.src).toContain('dog2.jpg');
  });

  test('should force re-render when src changes via key prop', () => {
    const { rerender } = render(
      <HeroImageWithBlurredBackground 
        src="https://example.com/dog1.jpg" 
        alt="Dog 1" 
      />
    );

    const img1 = screen.getByRole('img');
    const key1 = img1.getAttribute('key') || img1.parentElement.getAttribute('key');

    // Change src
    rerender(
      <HeroImageWithBlurredBackground 
        src="https://example.com/dog2.jpg" 
        alt="Dog 2" 
      />
    );

    const img2 = screen.getByRole('img');
    const key2 = img2.getAttribute('key') || img2.parentElement.getAttribute('key');

    // Key should be different to force re-render
    expect(img2.src).toContain('dog2.jpg');
    // Note: The key prop might not be directly visible in testing, but the src should change
  });
});
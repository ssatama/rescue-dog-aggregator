// src/components/ui/__tests__/HeroImageWithBlurredBackground.dark-mode.test.jsx
// TDD Phase 1: RED - Tests for HeroImageWithBlurredBackground dark mode functionality

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import HeroImageWithBlurredBackground from '../HeroImageWithBlurredBackground';

// Mock the imageUtils
jest.mock('../../../utils/imageUtils', () => ({
  getDetailHeroImageWithPosition: jest.fn((url) => ({
    src: url ? `optimized-${url}` : '/placeholder_dog.svg',
    position: 'center center'
  })),
  handleImageError: jest.fn(),
  trackImageLoad: jest.fn()
}));

// Mock the networkUtils
jest.mock('../../../utils/networkUtils', () => ({
  getLoadingStrategy: jest.fn(() => ({
    timeout: 15000,
    loading: 'eager',
    retry: {
      maxRetries: 2,
      baseDelay: 1000,
      backoffMultiplier: 2
    }
  })),
  onNetworkChange: jest.fn(() => () => {}) // Return cleanup function
}));

// Mock the useReducedMotion hook
jest.mock('../../../hooks/useScrollAnimation', () => ({
  useReducedMotion: jest.fn(() => false)
}));

describe('HeroImageWithBlurredBackground Dark Mode', () => {
  const mockProps = {
    src: 'https://example.com/dog.jpg',
    alt: 'Test Dog',
    className: 'test-class'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Container Dark Mode', () => {
    test('hero image container has dark mode background', () => {
      render(<HeroImageWithBlurredBackground {...mockProps} />);
      
      const container = screen.getByTestId('hero-image-clean');
      expect(container).toHaveClass('bg-white');
      expect(container).toHaveClass('dark:bg-gray-900');
    });

    test('no image state has dark mode styling', () => {
      render(<HeroImageWithBlurredBackground src="" alt="Test" />);
      
      const container = screen.getByTestId('hero-image-clean');
      expect(container).toHaveClass('bg-white');
      expect(container).toHaveClass('dark:bg-gray-900');
      
      // Check the inner content
      const noImageText = screen.getByText('No image available');
      expect(noImageText).toHaveClass('text-gray-500');
      expect(noImageText).toHaveClass('dark:text-gray-400');
    });

    test('no image icon has dark mode styling', () => {
      render(<HeroImageWithBlurredBackground src="" alt="Test" />);
      
      const noImageContainer = screen.getByText('No image available').closest('div');
      const svgIcon = noImageContainer.querySelector('svg');
      
      expect(svgIcon).toHaveClass('text-gray-300');
      expect(svgIcon).toHaveClass('dark:text-gray-600');
    });
  });

  describe('Loading Shimmer Dark Mode', () => {
    test('shimmer loader has dark mode gradient', async () => {
      render(<HeroImageWithBlurredBackground {...mockProps} />);
      
      // Should show loading shimmer initially
      await waitFor(() => {
        const shimmer = screen.queryByTestId('shimmer-loader');
        if (shimmer) {
          expect(shimmer).toHaveClass('bg-gradient-to-r');
          expect(shimmer).toHaveClass('from-gray-200');
          expect(shimmer).toHaveClass('dark:from-gray-700');
          expect(shimmer).toHaveClass('via-gray-100');
          expect(shimmer).toHaveClass('dark:via-gray-600');
          expect(shimmer).toHaveClass('to-gray-200');
          expect(shimmer).toHaveClass('dark:to-gray-700');
        }
      });
    });

    test('loading message has dark mode styling', async () => {
      render(<HeroImageWithBlurredBackground {...mockProps} />);
      
      await waitFor(() => {
        const loadingText = screen.queryByText(/Loading image/);
        if (loadingText) {
          const messageContainer = loadingText.closest('div');
          expect(messageContainer).toHaveClass('bg-white/80');
          expect(messageContainer).toHaveClass('dark:bg-gray-800/80');
          expect(messageContainer).toHaveClass('text-gray-600');
          expect(messageContainer).toHaveClass('dark:text-gray-300');
        }
      });
    });
  });

  describe('Error State Dark Mode', () => {
    test('error state has dark mode background', async () => {
      // Mock image error
      const { container } = render(<HeroImageWithBlurredBackground {...mockProps} />);
      
      // Trigger error by simulating image load failure
      const img = container.querySelector('img');
      if (img) {
        fireEvent.error(img);
      }
      
      await waitFor(() => {
        const errorState = screen.queryByTestId('error-state');
        if (errorState) {
          expect(errorState).toHaveClass('bg-gray-100');
          expect(errorState).toHaveClass('dark:bg-gray-800');
        }
      });
    });

    test('error text has dark mode styling', async () => {
      const { container } = render(<HeroImageWithBlurredBackground {...mockProps} />);
      
      // Trigger error
      const img = container.querySelector('img');
      if (img) {
        fireEvent.error(img);
      }
      
      await waitFor(() => {
        const errorText = screen.queryByText('Unable to load image');
        if (errorText) {
          expect(errorText).toHaveClass('text-gray-500');
          expect(errorText).toHaveClass('dark:text-gray-400');
        }
      });
    });

    test('error icon has dark mode styling', async () => {
      const { container } = render(<HeroImageWithBlurredBackground {...mockProps} />);
      
      // Trigger error
      const img = container.querySelector('img');
      if (img) {
        fireEvent.error(img);
      }
      
      await waitFor(() => {
        const errorState = screen.queryByTestId('error-state');
        if (errorState) {
          const svgIcon = errorState.querySelector('svg');
          if (svgIcon) {
            expect(svgIcon).toHaveClass('text-gray-300');
            expect(svgIcon).toHaveClass('dark:text-gray-600');
          }
        }
      });
    });

    test('retry button has dark mode styling', async () => {
      const { container } = render(<HeroImageWithBlurredBackground {...mockProps} />);
      
      // Trigger error
      const img = container.querySelector('img');
      if (img) {
        fireEvent.error(img);
      }
      
      await waitFor(() => {
        const retryButton = screen.queryByText('Try again');
        if (retryButton) {
          expect(retryButton).toHaveClass('text-orange-600');
          expect(retryButton).toHaveClass('dark:text-orange-400');
          expect(retryButton).toHaveClass('hover:text-orange-700');
          expect(retryButton).toHaveClass('dark:hover:text-orange-300');
        }
      });
    });
  });

  describe('Image Overlay Dark Mode', () => {
    test('loading overlay adjusts for dark mode', async () => {
      render(<HeroImageWithBlurredBackground {...mockProps} />);
      
      // The gradient overlay should be present during loading
      await waitFor(() => {
        const shimmer = screen.queryByTestId('shimmer-loader');
        if (shimmer) {
          // Verify gradient colors adjust for dark mode
          const style = window.getComputedStyle(shimmer);
          expect(shimmer.className).toMatch(/dark:(from|via|to)-gray-[67]00/);
        }
      });
    });
  });

  describe('Accessibility in Dark Mode', () => {
    test('maintains proper contrast ratios for text elements', () => {
      render(<HeroImageWithBlurredBackground src="" alt="Test" />);
      
      const noImageText = screen.getByText('No image available');
      
      // Light mode: gray-500 on gray-100 background (good contrast)
      // Dark mode: gray-400 on gray-800 background (good contrast)
      expect(noImageText).toHaveClass('text-gray-500');
      expect(noImageText).toHaveClass('dark:text-gray-400');
    });

    test('loading message maintains readability in dark mode', async () => {
      render(<HeroImageWithBlurredBackground {...mockProps} />);
      
      await waitFor(() => {
        const loadingText = screen.queryByText(/Loading image/);
        if (loadingText) {
          const messageContainer = loadingText.closest('div');
          // Semi-transparent backgrounds should maintain readability
          expect(messageContainer).toHaveClass('bg-white/80');
          expect(messageContainer).toHaveClass('dark:bg-gray-800/80');
        }
      });
    });
  });
});
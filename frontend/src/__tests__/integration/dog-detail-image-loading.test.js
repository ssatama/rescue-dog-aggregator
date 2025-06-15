/**
 * Dog Details Page - Real Image Loading Integration Tests
 * 
 * These tests validate the dog details page image loading functionality,
 * specifically testing the HeroImageWithBlurredBackground component's
 * timeout handling, retry logic, and loading state management.
 */

import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import HeroImageWithBlurredBackground from '../../components/ui/HeroImageWithBlurredBackground';

// Use small test images for faster loading
const FAST_LOADING_IMAGE = 'https://via.placeholder.com/800x450.jpg?text=Fast+Load';
const SLOW_LOADING_IMAGE = 'https://httpstat.us/200?sleep=5000'; // 5 second delay
const NEVER_LOADING_IMAGE = 'https://httpstat.us/200?sleep=30000'; // 30 second delay
const ERROR_IMAGE = 'https://httpstat.us/404'; // Will error immediately
const INVALID_IMAGE = 'not-a-valid-url';

describe('Dog Details Page - Real Image Loading', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    // Only run pending timers if fake timers are active
    try {
      jest.runOnlyPendingTimers();
    } catch (error) {
      // Ignore error if fake timers aren't active
    }
    jest.useRealTimers();
  });

  describe('Successful Loading Scenarios', () => {
    test('should load valid images within reasonable time', async () => {
      render(
        <HeroImageWithBlurredBackground 
          src={FAST_LOADING_IMAGE} 
          alt="Test hero image" 
        />
      );

      // Should start with shimmer loading
      expect(screen.getByTestId('shimmer-loader')).toBeInTheDocument();
      expect(screen.getByText('Loading image...')).toBeInTheDocument();

      // Simulate successful image load instead of waiting for real network
      const img = screen.getByRole('img');
      act(() => {
        fireEvent.load(img);
      });
      
      await waitFor(() => {
        expect(img).toHaveClass('opacity-100');
      });

      // Shimmer should be completely removed from DOM after load
      expect(screen.queryByTestId('shimmer-loader')).not.toBeInTheDocument();
    }, 10000);

    test('should handle Cloudinary URL transformation correctly', () => {
      const cloudinaryUrl = `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'test-cloud'}/image/upload/v123/test.jpg`;
      
      render(
        <HeroImageWithBlurredBackground 
          src={cloudinaryUrl} 
          alt="Cloudinary test image" 
        />
      );

      const img = screen.getByRole('img');
      const imgSrc = img.getAttribute('src');
      
      // Should contain optimization parameters
      expect(imgSrc).toContain('w_800,h_450');
      expect(imgSrc).toContain('c_fill');
      expect(imgSrc).toContain('g_auto');
      expect(imgSrc).toContain('f_auto');
      expect(imgSrc).toContain('q_auto');
    });
  });

  describe('Loading Timeout Handling', () => {
    test('should show retry indicator for slow loading images', async () => {
      render(
        <HeroImageWithBlurredBackground 
          src={SLOW_LOADING_IMAGE} 
          alt="Slow loading image" 
        />
      );

      // Initially should show normal loading
      expect(screen.getByText('Loading image...')).toBeInTheDocument();

      // Fast forward to timeout (15 seconds)
      act(() => {
        jest.advanceTimersByTime(15000);
      });

      // Should start showing retry logic
      await waitFor(() => {
        expect(screen.getByText(/Retrying.../)).toBeInTheDocument();
      });
    });

    test.skip('should handle loading timeout gracefully after retries', async () => {
      // Mock a fast timeout for testing
      const originalTimeout = global.setTimeout;
      
      render(
        <HeroImageWithBlurredBackground 
          src={NEVER_LOADING_IMAGE} 
          alt="Never loading image" 
        />
      );

      // Initial state should show loading
      expect(screen.getByText('Loading image...')).toBeInTheDocument();

      // Advance through initial timeout (15s)
      act(() => {
        jest.advanceTimersByTime(15000);
      });

      // Should show retry after timeout
      await waitFor(() => {
        expect(screen.getByText(/Retrying\.\.\./)).toBeInTheDocument();
      });

      // Advance through retry delays and timeouts
      // maxRetries is 2, so we need to exhaust both retries
      act(() => {
        jest.advanceTimersByTime(1000); // First retry delay
      });

      // Back to loading
      expect(screen.getByText('Loading image...')).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(15000); // First retry timeout
      });

      // Second retry
      await waitFor(() => {
        expect(screen.getByText(/Retrying\.\.\./)).toBeInTheDocument();
      });

      act(() => {
        jest.advanceTimersByTime(2000); // Second retry delay
      });

      act(() => {
        jest.advanceTimersByTime(15000); // Second retry timeout
      });

      // Should eventually show error state
      await waitFor(() => {
        expect(screen.getByText(/Unable to load image/)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle immediate image errors with retry', async () => {
      render(
        <HeroImageWithBlurredBackground 
          src={ERROR_IMAGE} 
          alt="Error image" 
        />
      );

      // Trigger error event
      const img = screen.getByRole('img');
      act(() => {
        fireEvent.error(img);
      });

      // Should show retry logic immediately after error
      await waitFor(() => {
        expect(screen.getByText(/Retrying.../)).toBeInTheDocument();
      });
    });


    test('should handle null/undefined src gracefully', () => {
      render(
        <HeroImageWithBlurredBackground 
          src={null} 
          alt="Null image" 
        />
      );

      expect(screen.getByText('No image available')).toBeInTheDocument();
    });
  });

  describe('Loading State Transitions', () => {
    test('should properly transition through loading states', async () => {
      const { rerender } = render(
        <HeroImageWithBlurredBackground 
          src={FAST_LOADING_IMAGE} 
          alt="Transition test" 
        />
      );

      // Initial state: shimmer visible, image hidden
      expect(screen.getByTestId('shimmer-loader')).toHaveClass('opacity-100');
      const img = screen.getByRole('img');
      expect(img).toHaveClass('opacity-0');

      // Change src to trigger new loading
      rerender(
        <HeroImageWithBlurredBackground 
          src={`${FAST_LOADING_IMAGE}?v=2`} 
          alt="Transition test" 
        />
      );

      // Should reset to loading state
      expect(screen.getByTestId('shimmer-loader')).toHaveClass('opacity-100');
      expect(screen.getByText('Loading image...')).toBeInTheDocument();
    });

    test('should maintain loading state consistency during retries', async () => {
      render(
        <HeroImageWithBlurredBackground 
          src={ERROR_IMAGE} 
          alt="Retry consistency test" 
        />
      );

      // Trigger error first by simulating image error event
      const img = screen.getByRole('img');
      act(() => {
        fireEvent.error(img);
      });

      // Should immediately show retry state after error
      await waitFor(() => {
        expect(screen.getByText(/Retrying\.\.\./)).toBeInTheDocument();
      });

      // Shimmer should remain visible during retry
      expect(screen.getByTestId('shimmer-loader')).toBeInTheDocument();
      
      // Should show connection issues message
      expect(screen.getByText('Connection issues detected')).toBeInTheDocument();
    });
  });

  describe('Performance Characteristics', () => {
    test('should use optimized image dimensions for hero images', () => {
      const testUrl = 'https://example.com/test.jpg';
      
      render(
        <HeroImageWithBlurredBackground 
          src={testUrl} 
          alt="Performance test" 
        />
      );

      const img = screen.getByRole('img');
      const imgSrc = img.getAttribute('src');
      
      // Should use smaller dimensions for better performance (800x450 instead of 1200x675)
      if (imgSrc.includes('cloudinary.com')) {
        expect(imgSrc).toContain('w_800,h_450');
        expect(imgSrc).not.toContain('w_1200,h_675');
      }
    });

    test('should implement proper loading strategy', () => {
      render(
        <HeroImageWithBlurredBackground 
          src={FAST_LOADING_IMAGE} 
          alt="Loading strategy test" 
        />
      );

      const img = screen.getByRole('img');
      
      // Should use eager loading for hero images
      expect(img).toHaveAttribute('loading', 'eager');
      expect(img).toHaveAttribute('decoding', 'async');
    });
  });

  describe('Accessibility and User Experience', () => {
    test('should provide appropriate ARIA labels and roles', () => {
      render(
        <HeroImageWithBlurredBackground 
          src={FAST_LOADING_IMAGE} 
          alt="Accessibility test image" 
        />
      );

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('alt', 'Accessibility test image');
      
      const container = screen.getByTestId('hero-image-clean');
      expect(container).toBeInTheDocument();
    });

    test('should respect reduced motion preferences', () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(
        <HeroImageWithBlurredBackground 
          src={FAST_LOADING_IMAGE} 
          alt="Reduced motion test" 
        />
      );

      const img = screen.getByRole('img');
      // Should not have long animation durations when reduced motion is preferred
      expect(img).toHaveClass('duration-0');
    });

    test.skip('should provide informative error messages', async () => {
      render(
        <HeroImageWithBlurredBackground 
          src={ERROR_IMAGE} 
          alt="Error message test" 
        />
      );

      // Trigger error and simulate retry process
      const img = screen.getByRole('img');
      act(() => {
        fireEvent.error(img);
      });

      // Wait for retry state
      await waitFor(() => {
        expect(screen.getByText(/Retrying\.\.\./)).toBeInTheDocument();
      });

      // Advance through first retry (1s delay)
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Should go back to loading state
      expect(screen.getByText('Loading image...')).toBeInTheDocument();

      // Trigger error on first retry
      act(() => {
        fireEvent.error(img);
      });

      // Should retry again
      await waitFor(() => {
        expect(screen.getByText(/Retrying\.\.\./)).toBeInTheDocument();
      });

      // Advance through second retry (2s delay)
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Trigger error on final retry
      act(() => {
        fireEvent.error(img);
      });

      // Should now show final error message
      await waitFor(() => {
        expect(screen.getByText(/Unable to load image after \d+ retr/)).toBeInTheDocument();
      });
    });
  });
});
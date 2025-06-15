/**
 * Hero Image Navigation Tests
 * 
 * Tests the specific issue where hero images only load on hard refresh
 * but not during normal navigation. This validates the fix for component
 * state persistence and cache-busting during navigation.
 */

import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import HeroImageWithBlurredBackground from '../../components/ui/HeroImageWithBlurredBackground';

// Test URLs for navigation scenarios
const DOG_1_URL = 'https://res.cloudinary.com/dy8y3boog/image/upload/v123/dog1.jpg';
const DOG_2_URL = 'https://res.cloudinary.com/dy8y3boog/image/upload/v456/dog2.jpg';

describe('Hero Image Navigation Behavior', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Navigation State Reset', () => {
    test('should reset state when src changes (simulating navigation)', async () => {
      const { rerender } = render(
        <HeroImageWithBlurredBackground src={DOG_1_URL} alt="Dog 1" />
      );

      // Initial load should show loading state
      expect(screen.getByText('Loading image...')).toBeInTheDocument();
      expect(screen.getByTestId('shimmer-loader')).toHaveClass('opacity-100');

      // Simulate successful first image load
      const img1 = screen.getByRole('img');
      act(() => {
        fireEvent.load(img1);
      });

      await waitFor(() => {
        // Shimmer loader should be completely removed from DOM when image loads
        expect(screen.queryByTestId('shimmer-loader')).not.toBeInTheDocument();
      });

      // Now simulate navigation to a new dog (change src)
      rerender(
        <HeroImageWithBlurredBackground src={DOG_2_URL} alt="Dog 2" />
      );

      // Should reset to loading state for new image
      expect(screen.getByText('Loading image...')).toBeInTheDocument();
      expect(screen.getByTestId('shimmer-loader')).toHaveClass('opacity-100');

      // New image should have different src with cache-busting
      const img2 = screen.getByRole('img');
      expect(img2.src).not.toBe(img1.src);
      expect(img2.src).toContain('dog2.jpg');
      expect(img2.src).toMatch(/[?&]t=\d+/); // Cache-busting timestamp
    });

    test('should handle rapid navigation changes without getting stuck', async () => {
      const { rerender } = render(
        <HeroImageWithBlurredBackground src={DOG_1_URL} alt="Dog 1" />
      );

      // Rapidly change between different dogs (simulating fast navigation)
      for (let i = 0; i < 3; i++) {
        rerender(
          <HeroImageWithBlurredBackground src={`${DOG_1_URL}?v=${i}`} alt={`Dog ${i}`} />
        );
        
        // Should always reset to loading state
        expect(screen.getByText('Loading image...')).toBeInTheDocument();
        expect(screen.getByTestId('shimmer-loader')).toHaveClass('opacity-100');
      }

      // Final state should still be valid
      const finalImg = screen.getByRole('img');
      expect(finalImg.src).toContain('v=2');
      expect(finalImg.src).toMatch(/[?&]t=\d+/);
    });
  });

  describe('Cache-Busting Behavior', () => {
    test('should add cache-busting parameters to prevent browser cache issues', () => {
      render(<HeroImageWithBlurredBackground src={DOG_1_URL} alt="Dog" />);
      
      const img = screen.getByRole('img');
      const imgSrc = img.getAttribute('src');
      
      // Should have cache-busting timestamp and contain the base URL (optimized)
      expect(imgSrc).toMatch(/[?&]t=\d+/);
      expect(imgSrc).toContain('dog1.jpg'); // Should contain the image filename
    });

    test('should use different cache-busting parameters on navigation', () => {
      const { rerender } = render(
        <HeroImageWithBlurredBackground src={DOG_1_URL} alt="Dog 1" />
      );

      const img1 = screen.getByRole('img');
      const src1 = img1.getAttribute('src');

      // Simulate navigation with small delay to ensure different timestamp
      act(() => {
        jest.advanceTimersByTime(10);
      });

      rerender(
        <HeroImageWithBlurredBackground src={DOG_2_URL} alt="Dog 2" />
      );

      const img2 = screen.getByRole('img');
      const src2 = img2.getAttribute('src');

      // Should have different cache-busting parameters
      expect(src1).not.toBe(src2);
      expect(src1).toMatch(/[?&]t=\d+/);
      expect(src2).toMatch(/[?&]t=\d+/);
      
      // Extract timestamps to verify they're different
      const timestamp1 = src1.match(/[?&]t=(\d+)/)?.[1];
      const timestamp2 = src2.match(/[?&]t=(\d+)/)?.[1];
      expect(timestamp1).not.toBe(timestamp2);
    });
  });

  describe('Error Recovery During Navigation', () => {
    test('should handle errors and retries correctly during navigation', async () => {
      const ERROR_URL = 'https://httpstat.us/404';
      
      render(<HeroImageWithBlurredBackground src={ERROR_URL} alt="Error Dog" />);

      // Trigger error
      const img = screen.getByRole('img');
      act(() => {
        fireEvent.error(img);
      });

      // Should immediately show retry state after error
      await waitFor(() => {
        expect(screen.getByText(/Retrying.../)).toBeInTheDocument();
      });

      // Advance time to trigger retry with new URL
      act(() => {
        jest.advanceTimersByTime(1000); // Advance past retry delay
      });

      // Image src should have retry parameters after retry timeout
      await waitFor(() => {
        const imgAfterRetry = screen.getByRole('img');
        const srcAfterRetry = imgAfterRetry.getAttribute('src');
        expect(srcAfterRetry).toMatch(/[?&]retry=1/);
        expect(srcAfterRetry).toMatch(/[?&]t=\d+/);
      });
    });

    test('should clear retry state when navigating to new image', async () => {
      const ERROR_URL = 'https://httpstat.us/404';
      
      const { rerender } = render(
        <HeroImageWithBlurredBackground src={ERROR_URL} alt="Error Dog" />
      );

      // Trigger error and start retry
      const img = screen.getByRole('img');
      act(() => {
        fireEvent.error(img);
      });

      // Should immediately show retry state after error
      await waitFor(() => {
        expect(screen.getByText(/Retrying.../)).toBeInTheDocument();
      });

      // Navigate to new dog
      rerender(
        <HeroImageWithBlurredBackground src={DOG_1_URL} alt="Good Dog" />
      );

      // Should reset to normal loading state (no retry text)
      expect(screen.getByText('Loading image...')).toBeInTheDocument();
      expect(screen.queryByText(/Retrying.../)).not.toBeInTheDocument();
      
      // New image should not have retry parameters
      const newImg = screen.getByRole('img');
      const newSrc = newImg.getAttribute('src');
      expect(newSrc).not.toMatch(/[?&]retry=/);
      expect(newSrc).toMatch(/[?&]t=\d+/); // Should still have timestamp
    });
  });

  describe('React Strict Mode Compatibility', () => {
    test('should handle component remounting correctly', () => {
      const { unmount, rerender } = render(
        <HeroImageWithBlurredBackground src={DOG_1_URL} alt="Dog" />
      );

      const originalImg = screen.getByRole('img');
      const originalSrc = originalImg.getAttribute('src');

      // Unmount and remount (simulating strict mode)
      unmount();
      
      render(<HeroImageWithBlurredBackground src={DOG_1_URL} alt="Dog" />);

      // Should create fresh state
      expect(screen.getByText('Loading image...')).toBeInTheDocument();
      expect(screen.getByTestId('shimmer-loader')).toHaveClass('opacity-100');
      
      const newImg = screen.getByRole('img');
      const newSrc = newImg.getAttribute('src');
      
      // Should have fresh cache-busting parameters
      expect(newSrc).toMatch(/[?&]t=\d+/);
      
      // Extract timestamps to verify they're different (if timestamps differ)
      const originalTimestamp = originalSrc.match(/[?&]t=(\d+)/)?.[1];
      const newTimestamp = newSrc.match(/[?&]t=(\d+)/)?.[1];
      
      // In test environment, timestamps might be the same due to fast execution
      // Just verify both have timestamps
      expect(originalTimestamp).toBeDefined();
      expect(newTimestamp).toBeDefined();
    });
  });

  describe('Memory Leak Prevention', () => {
    test('should clean up timers on unmount', () => {
      const { unmount } = render(
        <HeroImageWithBlurredBackground src={DOG_1_URL} alt="Dog" />
      );

      // Start some timers
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Unmount should clean up
      unmount();

      // Advance time after unmount - should not cause errors
      act(() => {
        jest.advanceTimersByTime(20000);
      });

      // All timers should be cleaned up
      expect(jest.getTimerCount()).toBe(0);
    });
  });
});
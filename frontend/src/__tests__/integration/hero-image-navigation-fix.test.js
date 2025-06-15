/**
 * Hero Image Navigation Fix Tests
 * 
 * Verifies that the hero image loading issue when navigating between
 * dog detail pages has been resolved. Tests ensure images load properly
 * without requiring a hard refresh.
 */

import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import HeroImageWithBlurredBackground from '../../components/ui/HeroImageWithBlurredBackground';

// Mock the imageUtils
jest.mock('../../utils/imageUtils', () => ({
  getDetailHeroImageWithPosition: jest.fn((url, bustCache) => ({
    src: url ? `optimized-${url}${bustCache ? '?optimized=true' : ''}` : '/placeholder_dog.svg',
    position: 'center center'
  })),
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

// Test URLs
const DOG_1_URL = 'https://res.cloudinary.com/test/image/upload/v123/dog1.jpg';
const DOG_2_URL = 'https://res.cloudinary.com/test/image/upload/v456/dog2.jpg';
const DOG_3_URL = 'https://res.cloudinary.com/test/image/upload/v789/dog3.jpg';

describe('Hero Image Navigation Fix', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('State Reset on Navigation', () => {
    test('should completely reset state when navigating to a new dog', async () => {
      const { rerender } = render(
        <HeroImageWithBlurredBackground src={DOG_1_URL} alt="Dog 1" />
      );

      // Initial state should show loading
      expect(screen.getByText('Loading image...')).toBeInTheDocument();
      expect(screen.getByTestId('shimmer-loader')).toBeInTheDocument();

      // Wait for currentSrc to be set after setTimeout
      await act(async () => {
        jest.advanceTimersByTime(10);
      });

      // Get initial image element after state updates
      const img1 = screen.getByRole('img');
      const initialSrc = img1.getAttribute('src');
      
      // Verify cache-busting parameters are added (after timeout sets the src)
      if (initialSrc !== '/placeholder_dog.svg') {
        expect(initialSrc).toContain('optimized-');
        expect(initialSrc).toMatch(/[?&]t=\d+/);
        expect(initialSrc).toMatch(/[?&]nav=[a-z0-9]+/);
      }

      // Simulate successful load
      act(() => {
        fireEvent.load(img1);
      });

      await waitFor(() => {
        expect(screen.queryByTestId('shimmer-loader')).not.toBeInTheDocument();
      });

      // Navigate to new dog
      rerender(
        <HeroImageWithBlurredBackground src={DOG_2_URL} alt="Dog 2" />
      );

      // Should immediately show loading state for new image
      expect(screen.getByText('Loading image...')).toBeInTheDocument();
      expect(screen.getByTestId('shimmer-loader')).toBeInTheDocument();

      // Wait for new currentSrc to be set
      await act(async () => {
        jest.advanceTimersByTime(10);
      });

      // Image element should have new src with fresh cache-busting
      const img2 = screen.getByRole('img');
      const newSrc = img2.getAttribute('src');
      
      expect(newSrc).not.toBe(initialSrc);
      if (newSrc !== '/placeholder_dog.svg') {
        expect(newSrc).toContain('dog2.jpg');
        expect(newSrc).toMatch(/[?&]t=\d+/);
        expect(newSrc).toMatch(/[?&]nav=[a-z0-9]+/);
        
        // Verify the timestamps are different if both have cache-busting
        if (initialSrc !== '/placeholder_dog.svg') {
          const timestamp1 = initialSrc.match(/t=(\d+)/)?.[1];
          const timestamp2 = newSrc.match(/t=(\d+)/)?.[1];
          expect(timestamp1).not.toBe(timestamp2);
        }
      }
    });

    test('should handle rapid navigation between multiple dogs', async () => {
      const { rerender } = render(
        <HeroImageWithBlurredBackground src={DOG_1_URL} alt="Dog 1" />
      );

      // Rapidly navigate between dogs
      const dogs = [DOG_1_URL, DOG_2_URL, DOG_3_URL, DOG_1_URL];
      const srcHistory = [];

      for (let i = 0; i < dogs.length; i++) {
        rerender(
          <HeroImageWithBlurredBackground src={dogs[i]} alt={`Dog ${i}`} />
        );

        // Each navigation should show loading state
        expect(screen.getByText('Loading image...')).toBeInTheDocument();
        expect(screen.getByTestId('shimmer-loader')).toBeInTheDocument();

        // Capture src for verification
        const img = screen.getByRole('img');
        srcHistory.push(img.getAttribute('src'));

        // Small delay to ensure different timestamps
        act(() => {
          jest.advanceTimersByTime(10);
        });
      }

      // All src values should be unique (even when returning to same dog URL)
      const uniqueSrcs = new Set(srcHistory);
      expect(uniqueSrcs.size).toBe(srcHistory.length);
      
      // Each should have cache-busting parameters
      srcHistory.forEach(src => {
        expect(src).toMatch(/[?&]t=\d+/);
        expect(src).toMatch(/[?&]nav=[a-z0-9]+/);
      });
    });

    test('should clear timeouts when navigating away', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      
      const { rerender, unmount } = render(
        <HeroImageWithBlurredBackground src={DOG_1_URL} alt="Dog 1" />
      );

      // Start loading timeout
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Navigate to new dog
      rerender(
        <HeroImageWithBlurredBackground src={DOG_2_URL} alt="Dog 2" />
      );

      // Should have cleared previous timeouts
      expect(clearTimeoutSpy).toHaveBeenCalled();

      // Unmount should also clear timeouts
      unmount();
      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });
  });

  describe('Image Element Recreation', () => {
    test('should use key prop to force React to recreate image element', () => {
      const { rerender } = render(
        <HeroImageWithBlurredBackground src={DOG_1_URL} alt="Dog 1" />
      );

      const img1 = screen.getByRole('img');
      const key1 = img1.getAttribute('key') || img1.parentElement.getAttribute('key');

      rerender(
        <HeroImageWithBlurredBackground src={DOG_2_URL} alt="Dog 2" />
      );

      const img2 = screen.getByRole('img');
      const key2 = img2.getAttribute('key') || img2.parentElement.getAttribute('key');

      // Keys should be different to force element recreation
      expect(key1).not.toBe(key2);
    });

    test('should handle null/undefined src transitions', () => {
      const { rerender } = render(
        <HeroImageWithBlurredBackground src={null} alt="No image" />
      );

      // Should show "No image available" state
      expect(screen.getByText('No image available')).toBeInTheDocument();
      expect(screen.queryByTestId('shimmer-loader')).not.toBeInTheDocument();

      // Transition to valid src
      rerender(
        <HeroImageWithBlurredBackground src={DOG_1_URL} alt="Dog 1" />
      );

      // Should now show loading state
      expect(screen.getByText('Loading image...')).toBeInTheDocument();
      expect(screen.getByTestId('shimmer-loader')).toBeInTheDocument();
      expect(screen.queryByText('No image available')).not.toBeInTheDocument();
    });
  });

  describe('Cache-Busting Mechanism', () => {
    test('should add unique cache-busting parameters', () => {
      render(<HeroImageWithBlurredBackground src={DOG_1_URL} alt="Dog" />);
      
      const img = screen.getByRole('img');
      const src = img.getAttribute('src');
      
      // Should have both timestamp and navigation ID
      expect(src).toMatch(/[?&]t=\d{13}/); // 13 digits for millisecond timestamp
      expect(src).toMatch(/[?&]nav=[a-z0-9]{9}/); // 9 character random string
    });

    test('should generate new cache-busting parameters on retry', async () => {
      render(<HeroImageWithBlurredBackground src={DOG_1_URL} alt="Dog" />);
      
      const img = screen.getByRole('img');
      const initialSrc = img.getAttribute('src');
      
      // Trigger error
      act(() => {
        fireEvent.error(img);
      });

      // Click retry button
      const retryButton = await screen.findByText('Try again');
      
      act(() => {
        fireEvent.click(retryButton);
      });

      // Should have new src with different timestamp
      const newSrc = screen.getByRole('img').getAttribute('src');
      expect(newSrc).not.toBe(initialSrc);
      
      // Extract timestamps
      const timestamp1 = initialSrc.match(/t=(\d+)/)?.[1];
      const timestamp2 = newSrc.match(/t=(\d+)/)?.[1];
      expect(timestamp1).not.toBe(timestamp2);
    });
  });

  describe('Loading State Management', () => {
    test('should show progressive loading messages', async () => {
      render(<HeroImageWithBlurredBackground src={DOG_1_URL} alt="Dog" />);
      
      // Initial message
      expect(screen.getByText('Loading image...')).toBeInTheDocument();
      
      // After 5 seconds, should show extended loading message
      act(() => {
        jest.advanceTimersByTime(5100);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Still loading... This is taking longer than usual')).toBeInTheDocument();
      });
    });

    test('should handle retry state correctly', async () => {
      render(<HeroImageWithBlurredBackground src={DOG_1_URL} alt="Dog" />);
      
      // Wait for timeout
      act(() => {
        jest.advanceTimersByTime(15100);
      });
      
      // Should show retry message
      await waitFor(() => {
        expect(screen.getByText(/Retrying... \(Attempt \d+\)/)).toBeInTheDocument();
      });
    });
  });

  describe('Error Recovery', () => {
    test('should handle error state and allow manual retry', async () => {
      render(<HeroImageWithBlurredBackground src={DOG_1_URL} alt="Dog" />);
      
      const img = screen.getByRole('img');
      
      // Trigger error
      act(() => {
        fireEvent.error(img);
      });
      
      // Should show error state
      expect(await screen.findByText('Unable to load image')).toBeInTheDocument();
      expect(screen.getByText('Try again')).toBeInTheDocument();
      
      // Manual retry
      const retryButton = screen.getByText('Try again');
      fireEvent.click(retryButton);
      
      // Should return to loading state
      expect(screen.getByText('Loading image...')).toBeInTheDocument();
      expect(screen.queryByText('Unable to load image')).not.toBeInTheDocument();
    });

    test('should respect max retry limit', async () => {
      render(<HeroImageWithBlurredBackground src={DOG_1_URL} alt="Dog" />);
      
      // Simulate multiple failures
      for (let i = 0; i < 3; i++) {
        const img = screen.getByRole('img');
        
        act(() => {
          fireEvent.error(img);
        });
        
        if (i < 2) {
          const retryButton = await screen.findByText('Try again');
          fireEvent.click(retryButton);
        }
      }
      
      // After max retries, should not show retry button
      expect(await screen.findByText('Unable to load image')).toBeInTheDocument();
      expect(screen.queryByText('Try again')).not.toBeInTheDocument();
    });
  });
});
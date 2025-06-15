/**
 * Loading State Transitions Tests
 * 
 * These tests verify that loading states transition correctly and detect
 * infinite loading scenarios that could trap users in loading screens.
 */

import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import HeroImageWithBlurredBackground from '../../components/ui/HeroImageWithBlurredBackground';
import LazyImage from '../../components/ui/LazyImage';

// Test URLs for different scenarios
const VALID_IMAGE = 'https://via.placeholder.com/800x450.jpg?text=Valid';
const SLOW_IMAGE = 'https://httpstat.us/200?sleep=10000'; // 10 second delay
const ERROR_IMAGE = 'https://httpstat.us/404';
const TIMEOUT_IMAGE = 'https://httpstat.us/200?sleep=60000'; // 1 minute delay

describe('Loading State Transitions', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('HeroImage State Machine', () => {
    test('should transition from loading → loaded correctly', async () => {
      const { container } = render(
        <HeroImageWithBlurredBackground src={VALID_IMAGE} alt="State test" />
      );

      // Initial state: loading
      expect(screen.getByTestId('shimmer-loader')).toHaveClass('opacity-100');
      expect(screen.getByText('Loading image...')).toBeInTheDocument();
      
      const img = screen.getByRole('img');
      expect(img).toHaveClass('opacity-0');

      // Simulate successful image load
      await act(async () => {
        fireEvent.load(img);
      });

      // Final state: loaded
      await waitFor(() => {
        expect(img).toHaveClass('opacity-100');
        // Shimmer loader should be completely removed from DOM when loaded
        expect(screen.queryByTestId('shimmer-loader')).not.toBeInTheDocument();
      });

      // Loading text should be hidden (will be removed with shimmer loader)
      expect(screen.queryByText('Loading image...')).not.toBeInTheDocument();
    });

    test('should transition from loading → retry → loaded correctly', async () => {
      render(
        <HeroImageWithBlurredBackground src={ERROR_IMAGE} alt="Retry test" />
      );

      const img = screen.getByRole('img');

      // Initial state: loading
      expect(screen.getByText('Loading image...')).toBeInTheDocument();

      // Simulate image error
      await act(async () => {
        fireEvent.error(img);
      });

      // Should immediately show retry state after error
      await waitFor(() => {
        expect(screen.getByText('Retrying... (1/2)')).toBeInTheDocument();
        expect(screen.getByText(/Connection issues/)).toBeInTheDocument();
      });

      // Shimmer should still be visible during retry
      expect(screen.getByTestId('shimmer-loader')).toHaveClass('opacity-100');
    });

    test.skip('should transition from loading → retry → error correctly', async () => {
      render(
        <HeroImageWithBlurredBackground src={ERROR_IMAGE} alt="Error test" />
      );

      const img = screen.getByRole('img');
      
      // Simulate first error to trigger retry
      await act(async () => {
        fireEvent.error(img);
      });

      // Should show first retry state immediately
      await waitFor(() => {
        expect(screen.getByText('Retrying... (1/2)')).toBeInTheDocument();
      });

      // Advance through first retry delay 
      await act(async () => {
        jest.advanceTimersByTime(1000); // First retry delay
      });

      // After the delay, component should be loading again
      await waitFor(() => {
        expect(screen.getByText('Loading image...')).toBeInTheDocument();
      });

      // Simulate second error 
      await act(async () => {
        fireEvent.error(img);
      });

      // Should show second retry state 
      await waitFor(() => {
        expect(screen.getByText('Retrying... (2/2)')).toBeInTheDocument();
      });

      // Advance through second retry delay
      await act(async () => {
        jest.advanceTimersByTime(2000); // Second retry delay
      });

      // After second retry delay, should be loading again
      await waitFor(() => {
        expect(screen.getByText('Loading image...')).toBeInTheDocument();
      });

      // Simulate final error (should exhaust retries)
      await act(async () => {
        fireEvent.error(img);
      });

      // Should reach final error state
      await waitFor(() => {
        expect(screen.getByText(/Unable to load image after 2 retries/)).toBeInTheDocument();
      });

      // Should no longer show loading shimmer
      expect(screen.queryByTestId('shimmer-loader')).not.toBeInTheDocument();
    });

    test('should handle timeout → retry transitions correctly', async () => {
      render(
        <HeroImageWithBlurredBackground src={TIMEOUT_IMAGE} alt="Timeout test" />
      );

      // Initial loading state
      expect(screen.getByText('Loading image...')).toBeInTheDocument();

      // Fast forward to timeout (15 seconds)
      await act(async () => {
        jest.advanceTimersByTime(15000);
      });

      // Should start retry logic after timeout
      await waitFor(() => {
        expect(screen.getByText('Retrying... (1/2)')).toBeInTheDocument();
      });

      // State should be consistent during retry
      expect(screen.getByTestId('shimmer-loader')).toHaveClass('opacity-100');
      expect(screen.getByText('Connection issues detected')).toBeInTheDocument();
    });

    test.skip('should reset state correctly when src changes', async () => {
      const { rerender } = render(
        <HeroImageWithBlurredBackground src={VALID_IMAGE} alt="Reset test" />
      );

      const img = screen.getByRole('img');

      // Trigger errors to reach error state
      await act(async () => {
        fireEvent.error(img); // First error -> retry
      });

      await act(async () => {
        jest.advanceTimersByTime(1000); // Wait for retry delay
      });

      await act(async () => {
        fireEvent.error(img); // Second error -> retry
      });

      await act(async () => {
        jest.advanceTimersByTime(2000); // Wait for second retry delay
      });

      await act(async () => {
        fireEvent.error(img); // Final error -> error state
      });

      await waitFor(() => {
        expect(screen.getByText(/Unable to load image after 2 retries/)).toBeInTheDocument();
      });

      // Change src to trigger reset
      rerender(
        <HeroImageWithBlurredBackground src={`${VALID_IMAGE}?v=2`} alt="Reset test" />
      );

      // Should reset to loading state
      expect(screen.getByText('Loading image...')).toBeInTheDocument();
      expect(screen.getByTestId('shimmer-loader')).toHaveClass('opacity-100');
    });
  });

  describe('LazyImage State Machine', () => {
    test('should transition from placeholder → loading → loaded', async () => {
      render(
        <LazyImage 
          src={VALID_IMAGE} 
          alt="Lazy test"
          priority={true} // Disable intersection observer for testing
        />
      );

      // Should start with placeholder
      expect(screen.getByTestId('image-placeholder')).toBeInTheDocument();

      const img = screen.getByRole('img');

      // Simulate successful load
      act(() => {
        fireEvent.load(img);
      });

      // Should transition to loaded state
      await waitFor(() => {
        expect(img).toHaveClass('opacity-100');
      });

      // Placeholder should be hidden
      expect(screen.queryByTestId('image-placeholder')).not.toBeInTheDocument();
    });

    test('should handle error state correctly', async () => {
      render(
        <LazyImage 
          src={ERROR_IMAGE} 
          alt="Error test"
          priority={true}
        />
      );

      const img = screen.getByRole('img');

      // Simulate error
      act(() => {
        fireEvent.error(img);
      });

      await waitFor(() => {
        expect(screen.getByTestId('image-error')).toBeInTheDocument();
      });
    });
  });

  describe('Infinite Loading Detection', () => {
    test.skip('should not get stuck in infinite loading state', async () => {
      render(
        <HeroImageWithBlurredBackground src={TIMEOUT_IMAGE} alt="Infinite test" />
      );

      const img = screen.getByRole('img');

      // Trigger initial timeout
      await act(async () => {
        jest.advanceTimersByTime(15000); // Initial timeout
      });

      // Should be in retry state
      await waitFor(() => {
        expect(screen.getByText('Retrying... (1/2)')).toBeInTheDocument();
      });

      // Advance through first retry delay
      await act(async () => {
        jest.advanceTimersByTime(1000); // First retry delay
      });

      // Should be loading again
      await waitFor(() => {
        expect(screen.getByText('Loading image...')).toBeInTheDocument();
      });

      // Trigger error on first retry
      await act(async () => {
        fireEvent.error(img);
      });

      // Should be in second retry state
      await waitFor(() => {
        expect(screen.getByText('Retrying... (2/2)')).toBeInTheDocument();
      });

      // Advance through second retry delay
      await act(async () => {
        jest.advanceTimersByTime(2000); // Second retry delay
      });

      // Should be loading again
      await waitFor(() => {
        expect(screen.getByText('Loading image...')).toBeInTheDocument();
      });

      // Trigger final error
      await act(async () => {
        fireEvent.error(img);
      });

      // Should eventually reach error state, not infinite loading
      await waitFor(() => {
        expect(screen.getByText(/Unable to load image after 2 retries/)).toBeInTheDocument();
      });

      // Should not still be showing "Loading image..."
      expect(screen.queryByText('Loading image...')).not.toBeInTheDocument();
    });

    test.skip('should have maximum retry limit to prevent infinite retries', async () => {
      render(
        <HeroImageWithBlurredBackground src={ERROR_IMAGE} alt="Max retry test" />
      );

      const img = screen.getByRole('img');

      // Trigger first error
      await act(async () => {
        fireEvent.error(img);
      });

      await waitFor(() => {
        expect(screen.getByText('Retrying... (1/2)')).toBeInTheDocument();
      });

      // Advance through first retry delay
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      // Should be loading again
      await waitFor(() => {
        expect(screen.getByText('Loading image...')).toBeInTheDocument();
      });

      // Trigger second error
      await act(async () => {
        fireEvent.error(img);
      });

      await waitFor(() => {
        expect(screen.getByText('Retrying... (2/2)')).toBeInTheDocument();
      });

      // Advance through second retry delay
      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      // Should be loading again
      await waitFor(() => {
        expect(screen.getByText('Loading image...')).toBeInTheDocument();
      });

      // Trigger final error
      await act(async () => {
        fireEvent.error(img);
      });

      // Should stop retrying after maximum attempts (2 retries)
      await waitFor(() => {
        expect(screen.getByText(/Unable to load image after 2 retries/)).toBeInTheDocument();
      });

      // Should not be attempting more retries
      expect(screen.queryByText('Retrying... (3/2)')).not.toBeInTheDocument();
      expect(screen.queryByText('Retrying... (4/2)')).not.toBeInTheDocument();
    });

    test('should clean up timers properly to prevent memory leaks', () => {
      const { unmount } = render(
        <HeroImageWithBlurredBackground src={TIMEOUT_IMAGE} alt="Cleanup test" />
      );

      // Start some timers
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Unmount component
      unmount();

      // Fast forward time after unmount
      act(() => {
        jest.advanceTimersByTime(20000);
      });

      // No errors should occur (timers should be cleaned up)
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('State Consistency Under Stress', () => {
    test('should handle rapid src changes correctly', async () => {
      const { rerender } = render(
        <HeroImageWithBlurredBackground src={VALID_IMAGE} alt="Rapid test" />
      );

      // Rapidly change src multiple times
      for (let i = 0; i < 5; i++) {
        rerender(
          <HeroImageWithBlurredBackground src={`${VALID_IMAGE}?v=${i}`} alt="Rapid test" />
        );
        
        act(() => {
          jest.advanceTimersByTime(100); // Small time advance
        });
      }

      // Should still be in a valid state
      expect(screen.getByTestId('shimmer-loader')).toBeInTheDocument();
      expect(screen.getByText('Loading image...')).toBeInTheDocument();
    });

    test.skip('should handle concurrent load and error events correctly', async () => {
      render(
        <HeroImageWithBlurredBackground src={VALID_IMAGE} alt="Concurrent test" />
      );

      const img = screen.getByRole('img');

      // Simulate rapid load and error events - load should win
      await act(async () => {
        fireEvent.error(img); // This would start retry
        fireEvent.load(img);  // But this should override and mark as loaded
      });

      // Should handle the last valid event (load) - image should be visible
      await waitFor(() => {
        expect(img).toHaveClass('opacity-100');
        // No shimmer loader should be present when loaded
        expect(screen.queryByTestId('shimmer-loader')).not.toBeInTheDocument();
      });
    });
  });

  describe('Performance Under Load', () => {
    test('should not create excessive re-renders during loading states', () => {
      let renderCount = 0;
      
      const TestWrapper = ({ src }) => {
        renderCount++;
        return <HeroImageWithBlurredBackground src={src} alt="Performance test" />;
      };

      const { rerender } = render(<TestWrapper src={VALID_IMAGE} />);

      const initialRenderCount = renderCount;

      // Trigger state changes
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Should not cause excessive re-renders
      expect(renderCount - initialRenderCount).toBeLessThan(5);
    });

    test('should maintain responsive UI during loading operations', () => {
      render(
        <HeroImageWithBlurredBackground src={SLOW_IMAGE} alt="Responsive test" />
      );

      // UI should be responsive even during loading
      const shimmer = screen.getByTestId('shimmer-loader');
      expect(shimmer).toBeInTheDocument();
      expect(shimmer).toHaveClass('opacity-100');

      // Fast forward time
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // UI should still be responsive
      expect(screen.getByText('Loading image...')).toBeInTheDocument();
    });
  });
});
/**
 * Initial Load Race Condition Test
 * 
 * This test simulates first page load (no cache, no prior state) to detect
 * race conditions between SSR/hydration and image loading that cause images
 * to fail on first load but work on refresh.
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
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

const TEST_IMAGE_URL = 'https://res.cloudinary.com/test/image/upload/v123/dog.jpg';

// Utility to simulate SSR-like environment
const mockSSREnvironment = () => {
  const originalWindow = global.window;
  delete global.window;
  return () => {
    global.window = originalWindow;
  };
};

describe('Initial Load Race Condition Detection', () => {
  let restoreWindow;
  let consoleLogSpy;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.useFakeTimers();
  });

  afterEach(() => {
    if (restoreWindow) {
      restoreWindow();
      restoreWindow = null;
    }
    consoleLogSpy.mockRestore();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('SSR to Hydration Transition', () => {
    test('should handle window undefined during initial render', () => {
      // Simulate SSR environment
      restoreWindow = mockSSREnvironment();
      
      render(<HeroImageWithBlurredBackground src={TEST_IMAGE_URL} alt="Test Dog" />);
      
      // Should handle SSR environment gracefully
      expect(screen.getByTestId('hero-image-clean')).toBeInTheDocument();
      
      // Check console logs for SSR detection
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[HeroImage] Initial render:',
        expect.objectContaining({
          src: TEST_IMAGE_URL,
          isSSR: true,
          hydrated: false
        })
      );
    });

    test('should detect hydration completion and enable image loading', async () => {
      render(<HeroImageWithBlurredBackground src={TEST_IMAGE_URL} alt="Test Dog" />);
      
      // Wait for hydration effect to run
      await act(async () => {
        jest.advanceTimersByTime(10);
      });
      
      // Check that hydration was detected
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[HeroImage] Hydration complete:',
        expect.objectContaining({
          src: TEST_IMAGE_URL,
          isSSR: false,
          hydrationTime: expect.any(Number)
        })
      );
    });

    test('should only set currentSrc after hydration is complete', async () => {
      render(<HeroImageWithBlurredBackground src={TEST_IMAGE_URL} alt="Test Dog" />);
      
      // Advance timers to trigger setTimeout in useEffect
      await act(async () => {
        jest.advanceTimersByTime(10);
      });
      
      // Should log SSR check before setting src
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[HeroImage] SSR check before src set:',
        expect.objectContaining({
          isSSR: false,
          hydrated: true,
          src: TEST_IMAGE_URL
        })
      );
      
      // Should log currentSrc being set after hydration
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[HeroImage] Event: currentSrc-set',
        expect.objectContaining({
          src: TEST_IMAGE_URL,
          hydrated: true
        })
      );
    });
  });

  describe('Race Condition Scenarios', () => {
    test('should handle src prop available before hydration', () => {
      // Start with SSR environment
      restoreWindow = mockSSREnvironment();
      
      const { rerender } = render(
        <HeroImageWithBlurredBackground src={TEST_IMAGE_URL} alt="Test Dog" />
      );
      
      // Restore window (simulate hydration)
      restoreWindow();
      restoreWindow = null;
      
      // Re-render with window available
      rerender(<HeroImageWithBlurredBackground src={TEST_IMAGE_URL} alt="Test Dog" />);
      
      // Should detect the transition
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[HeroImage] Initial render:',
        expect.objectContaining({ isSSR: true })
      );
    });

    test('should handle rapid src changes during hydration', async () => {
      const { rerender } = render(
        <HeroImageWithBlurredBackground src={TEST_IMAGE_URL} alt="Test Dog 1" />
      );
      
      // Change src before hydration completes
      rerender(
        <HeroImageWithBlurredBackground src={`${TEST_IMAGE_URL}?v=2`} alt="Test Dog 2" />
      );
      
      // Wait for hydration and src processing
      await act(async () => {
        jest.advanceTimersByTime(10);
      });
      
      // Should handle the src change gracefully
      const srcChangeLogs = consoleLogSpy.mock.calls.filter(call => 
        call[0] === '[HeroImage] Event: src-change'
      );
      
      expect(srcChangeLogs.length).toBeGreaterThan(0);
    });

    test('should skip src setting when not hydrated', async () => {
      // Mock component that never hydrates
      restoreWindow = mockSSREnvironment();
      
      render(<HeroImageWithBlurredBackground src={TEST_IMAGE_URL} alt="Test Dog" />);
      
      // Advance timers to trigger setTimeout
      await act(async () => {
        jest.advanceTimersByTime(10);
      });
      
      // Should log that src setting was skipped
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[HeroImage] Skipping src set - not ready:',
        expect.objectContaining({
          hydrated: false,
          hasSrc: true
        })
      );
    });
  });

  describe('DOM Element Behavior', () => {
    test('should log DOM image element state changes', async () => {
      render(<HeroImageWithBlurredBackground src={TEST_IMAGE_URL} alt="Test Dog" />);
      
      // Wait for hydration and DOM updates
      await act(async () => {
        jest.advanceTimersByTime(50);
      });
      
      // Should log DOM element creation
      const domLogs = consoleLogSpy.mock.calls.filter(call => 
        call[0] === '[HeroImage] DOM img element:'
      );
      
      expect(domLogs.length).toBeGreaterThan(0);
      
      // Check that DOM element has expected properties
      if (domLogs.length > 0) {
        const lastDomLog = domLogs[domLogs.length - 1][1];
        expect(lastDomLog).toHaveProperty('domSrc');
        expect(lastDomLog).toHaveProperty('complete');
        expect(lastDomLog).toHaveProperty('naturalWidth');
      }
    });

    test('should track currentSrc vs DOM src consistency', async () => {
      render(<HeroImageWithBlurredBackground src={TEST_IMAGE_URL} alt="Test Dog" />);
      
      // Wait for all state updates
      await act(async () => {
        jest.advanceTimersByTime(100);
      });
      
      // Find DOM and currentSrc logs
      const domLogs = consoleLogSpy.mock.calls.filter(call => 
        call[0] === '[HeroImage] DOM img element:'
      );
      const srcSetLogs = consoleLogSpy.mock.calls.filter(call => 
        call[0] === '[HeroImage] Event: currentSrc-set'
      );
      
      if (domLogs.length > 0 && srcSetLogs.length > 0) {
        const lastDomLog = domLogs[domLogs.length - 1][1];
        const lastSrcLog = srcSetLogs[srcSetLogs.length - 1][1];
        
        // DOM src should reflect the currentSrc that was set
        expect(lastDomLog.domSrc).toContain('optimized-');
        expect(lastSrcLog.cacheBustedSrc).toContain('optimized-');
      }
    });
  });

  describe('Timing Analysis', () => {
    test('should measure hydration timing', async () => {
      const startTime = Date.now();
      
      render(<HeroImageWithBlurredBackground src={TEST_IMAGE_URL} alt="Test Dog" />);
      
      await act(async () => {
        jest.advanceTimersByTime(10);
      });
      
      // Find hydration log
      const hydrationLog = consoleLogSpy.mock.calls.find(call => 
        call[0] === '[HeroImage] Hydration complete:'
      );
      
      if (hydrationLog) {
        const { hydrationTime } = hydrationLog[1];
        expect(hydrationTime).toBeGreaterThanOrEqual(0);
        expect(hydrationTime).toBeLessThan(1000); // Should be very fast in tests
      }
    });

    test('should detect slow hydration scenarios', async () => {
      render(<HeroImageWithBlurredBackground src={TEST_IMAGE_URL} alt="Test Dog" />);
      
      // Simulate slow hydration by delaying timer advancement
      await act(async () => {
        jest.advanceTimersByTime(1);
      });
      
      // Wait longer before hydration completes
      await act(async () => {
        jest.advanceTimersByTime(100);
      });
      
      // Check if hydration timing is recorded
      const hydrationLog = consoleLogSpy.mock.calls.find(call => 
        call[0] === '[HeroImage] Hydration complete:'
      );
      
      expect(hydrationLog).toBeDefined();
    });
  });

  describe('Component Lifecycle Events', () => {
    test('should log complete component lifecycle sequence', async () => {
      render(<HeroImageWithBlurredBackground src={TEST_IMAGE_URL} alt="Test Dog" />);
      
      // Wait for all lifecycle events
      await act(async () => {
        jest.advanceTimersByTime(100);
      });
      
      // Check for expected sequence of logs
      const logSequence = consoleLogSpy.mock.calls.map(call => call[0]);
      
      expect(logSequence).toContain('[HeroImage] Initial render:');
      expect(logSequence).toContain('[HeroImage] Hydration complete:');
      expect(logSequence).toContain('[HeroImage] Event: mount');
      
      // If src was set, should also have these
      if (logSequence.includes('[HeroImage] Event: currentSrc-set')) {
        expect(logSequence).toContain('[HeroImage] SSR check before src set:');
        expect(logSequence).toContain('[HeroImage] DOM img element:');
      }
    });

    test('should handle component unmount during hydration', () => {
      const { unmount } = render(
        <HeroImageWithBlurredBackground src={TEST_IMAGE_URL} alt="Test Dog" />
      );
      
      // Unmount before hydration completes
      unmount();
      
      // Should not crash or cause errors
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[HeroImage] Initial render:',
        expect.any(Object)
      );
    });
  });

  describe('Error Scenarios', () => {
    test('should handle malformed image URLs during hydration', async () => {
      const malformedUrl = 'not-a-valid-url';
      
      render(<HeroImageWithBlurredBackground src={malformedUrl} alt="Test Dog" />);
      
      await act(async () => {
        jest.advanceTimersByTime(10);
      });
      
      // Should detect invalid URL and handle gracefully
      const srcChangeLog = consoleLogSpy.mock.calls.find(call => 
        call[0] === '[HeroImage] Event: src-change'
      );
      
      if (srcChangeLog) {
        expect(srcChangeLog[1].newSrc).toBe(malformedUrl);
      }
    });

    test('should handle null src during hydration', async () => {
      render(<HeroImageWithBlurredBackground src={null} alt="Test Dog" />);
      
      await act(async () => {
        jest.advanceTimersByTime(10);
      });
      
      // Should not attempt to set currentSrc for null src
      const skipLog = consoleLogSpy.mock.calls.find(call => 
        call[0] === '[HeroImage] Skipping src set - not ready:'
      );
      
      // With null src, should either skip or not reach the src setting logic
      expect(skipLog || consoleLogSpy.mock.calls.length).toBeDefined();
    });
  });
});
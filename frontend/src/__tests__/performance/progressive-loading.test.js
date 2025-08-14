/**
 * TDD Test Suite for Progressive Loading Implementation
 * Tests lazy loading and intersection observer for dog cards
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProgressiveDogCard from '../../components/dogs/ProgressiveDogCard';
import useProgressiveLoading from '../../hooks/useProgressiveLoading';
import { renderHook } from '@testing-library/react';

// Mock IntersectionObserver
const mockObserve = jest.fn();
const mockUnobserve = jest.fn();
const mockDisconnect = jest.fn();

global.IntersectionObserver = jest.fn().mockImplementation((callback, options) => ({
  observe: mockObserve,
  unobserve: mockUnobserve,
  disconnect: mockDisconnect,
  root: null,
  rootMargin: options?.rootMargin || '0px',
  thresholds: options?.threshold || [0],
  takeRecords: () => [],
}));

// Mock requestIdleCallback
global.requestIdleCallback = jest.fn((cb) => setTimeout(cb, 0));
global.cancelIdleCallback = jest.fn((id) => clearTimeout(id));

describe('Progressive Loading for Dog Cards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockObserve.mockClear();
    mockUnobserve.mockClear();
    mockDisconnect.mockClear();
  });

  describe('Phase 4: Progressive Loading Implementation', () => {
    describe('useProgressiveLoading Hook', () => {
      test('FAILING TEST: should initialize with loading state', () => {
        const { result } = renderHook(() => useProgressiveLoading());
        
        expect(result.current.isVisible).toBe(false);
        expect(result.current.isLoaded).toBe(false);
        expect(result.current.ref).toBeDefined();
      });

      test('FAILING TEST: should observe element when ref is set', () => {
        const { result } = renderHook(() => useProgressiveLoading());
        
        // Simulate setting ref
        const element = document.createElement('div');
        act(() => {
          result.current.ref.current = element;
        });

        // Should observe the element
        expect(mockObserve).toHaveBeenCalledWith(element);
      });

      test('FAILING TEST: should set isVisible when element intersects', async () => {
        const { result } = renderHook(() => useProgressiveLoading());
        
        // Get the callback passed to IntersectionObserver
        const observerCallback = global.IntersectionObserver.mock.calls[0][0];
        
        // Simulate intersection
        act(() => {
          observerCallback([{ isIntersecting: true, target: document.createElement('div') }]);
        });

        expect(result.current.isVisible).toBe(true);
      });

      test('FAILING TEST: should load content after becoming visible', async () => {
        const { result } = renderHook(() => useProgressiveLoading({ 
          loadDelay: 0 
        }));
        
        const observerCallback = global.IntersectionObserver.mock.calls[0][0];
        
        // Simulate intersection
        act(() => {
          observerCallback([{ isIntersecting: true }]);
        });

        // Wait for loading to complete
        await waitFor(() => {
          expect(result.current.isLoaded).toBe(true);
        });
      });

      test('FAILING TEST: should use custom root margin for early loading', () => {
        renderHook(() => useProgressiveLoading({ 
          rootMargin: '100px' 
        }));
        
        const options = global.IntersectionObserver.mock.calls[0][1];
        expect(options.rootMargin).toBe('100px');
      });

      test('FAILING TEST: should cleanup observer on unmount', () => {
        const { unmount } = renderHook(() => useProgressiveLoading());
        
        unmount();
        
        expect(mockDisconnect).toHaveBeenCalled();
      });
    });

    describe('ProgressiveDogCard Component', () => {
      const mockDog = {
        id: 1,
        name: 'Max',
        standardized_breed: 'Labrador',
        age_text: '2 years',
        sex: 'Male',
        standardized_size: 'Large',
        images: [{ url: 'https://example.com/dog.jpg' }],
        organization: { name: 'Test Rescue' }
      };

      test('FAILING TEST: should show skeleton while loading', () => {
        render(<ProgressiveDogCard dog={mockDog} />);
        
        // Should show skeleton initially
        expect(screen.getByTestId('dog-card-skeleton')).toBeInTheDocument();
        expect(screen.queryByText('Max')).not.toBeInTheDocument();
      });

      test('FAILING TEST: should load content when visible', async () => {
        render(<ProgressiveDogCard dog={mockDog} />);
        
        // Get the observer callback
        const observerCallback = global.IntersectionObserver.mock.calls[0][0];
        
        // Simulate card becoming visible
        act(() => {
          observerCallback([{ isIntersecting: true }]);
        });

        // Wait for content to load
        await waitFor(() => {
          expect(screen.queryByTestId('dog-card-skeleton')).not.toBeInTheDocument();
          expect(screen.getByText('Max')).toBeInTheDocument();
        });
      });

      test('FAILING TEST: should lazy load images', async () => {
        render(<ProgressiveDogCard dog={mockDog} />);
        
        const observerCallback = global.IntersectionObserver.mock.calls[0][0];
        
        // Initially, image should not be loaded
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
        
        // Simulate visibility
        act(() => {
          observerCallback([{ isIntersecting: true }]);
        });

        // Wait for image to load
        await waitFor(() => {
          const img = screen.getByRole('img');
          expect(img).toHaveAttribute('loading', 'lazy');
          expect(img).toHaveAttribute('src', mockDog.images[0].url);
        });
      });

      test('FAILING TEST: should use placeholder for images', async () => {
        render(<ProgressiveDogCard dog={mockDog} />);
        
        const observerCallback = global.IntersectionObserver.mock.calls[0][0];
        
        act(() => {
          observerCallback([{ isIntersecting: true }]);
        });

        await waitFor(() => {
          const img = screen.getByRole('img');
          // Should have low-quality placeholder
          expect(img).toHaveAttribute('data-placeholder', 'true');
        });
      });

      test('FAILING TEST: should stagger loading for multiple cards', async () => {
        const dogs = [
          { ...mockDog, id: 1, name: 'Dog 1' },
          { ...mockDog, id: 2, name: 'Dog 2' },
          { ...mockDog, id: 3, name: 'Dog 3' },
        ];

        const { container } = render(
          <div>
            {dogs.map((dog, index) => (
              <ProgressiveDogCard key={dog.id} dog={dog} index={index} />
            ))}
          </div>
        );

        // All should start with skeletons
        const skeletons = screen.getAllByTestId('dog-card-skeleton');
        expect(skeletons).toHaveLength(3);

        // Get all observer callbacks
        const callbacks = global.IntersectionObserver.mock.calls.map(call => call[0]);
        
        // Simulate all becoming visible
        callbacks.forEach(callback => {
          act(() => {
            callback([{ isIntersecting: true }]);
          });
        });

        // Cards should load with staggered delays
        await waitFor(() => {
          expect(screen.getByText('Dog 1')).toBeInTheDocument();
        });

        await waitFor(() => {
          expect(screen.getByText('Dog 2')).toBeInTheDocument();
        });

        await waitFor(() => {
          expect(screen.getByText('Dog 3')).toBeInTheDocument();
        });
      });

      test('FAILING TEST: should prioritize above-the-fold cards', () => {
        // Mock viewport
        Object.defineProperty(window, 'innerHeight', {
          value: 768,
          writable: true,
        });

        render(<ProgressiveDogCard dog={mockDog} priority={true} />);
        
        // Priority cards should load immediately without intersection observer
        expect(screen.queryByTestId('dog-card-skeleton')).not.toBeInTheDocument();
        expect(screen.getByText('Max')).toBeInTheDocument();
      });

      test('FAILING TEST: should handle loading errors gracefully', async () => {
        const dogWithBadImage = {
          ...mockDog,
          images: [{ url: 'https://example.com/404.jpg' }]
        };

        render(<ProgressiveDogCard dog={dogWithBadImage} />);
        
        const observerCallback = global.IntersectionObserver.mock.calls[0][0];
        
        act(() => {
          observerCallback([{ isIntersecting: true }]);
        });

        await waitFor(() => {
          // Should still show card content even if image fails
          expect(screen.getByText('Max')).toBeInTheDocument();
          // Should show fallback image
          const img = screen.getByRole('img');
          expect(img).toHaveAttribute('data-fallback', 'true');
        });
      });

      test('FAILING TEST: should preserve scroll position during lazy loading', async () => {
        const scrollY = 500;
        window.scrollY = scrollY;

        render(<ProgressiveDogCard dog={mockDog} />);
        
        const observerCallback = global.IntersectionObserver.mock.calls[0][0];
        
        act(() => {
          observerCallback([{ isIntersecting: true }]);
        });

        await waitFor(() => {
          expect(screen.getByText('Max')).toBeInTheDocument();
        });

        // Scroll position should be preserved
        expect(window.scrollY).toBe(scrollY);
      });

      test('FAILING TEST: should support reduced motion preference', () => {
        // Mock reduced motion preference
        window.matchMedia = jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        }));

        render(<ProgressiveDogCard dog={mockDog} />);
        
        const observerCallback = global.IntersectionObserver.mock.calls[0][0];
        
        act(() => {
          observerCallback([{ isIntersecting: true }]);
        });

        // Should load immediately without animations for reduced motion
        expect(screen.getByText('Max')).toBeInTheDocument();
        expect(screen.queryByTestId('dog-card-skeleton')).not.toBeInTheDocument();
      });
    });
  });
});
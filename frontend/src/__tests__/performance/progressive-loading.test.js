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
let observerCallback = null;
let observerOptions = null;

global.IntersectionObserver = jest.fn().mockImplementation((callback, options) => {
  observerCallback = callback;
  observerOptions = options;
  return {
    observe: mockObserve,
    unobserve: mockUnobserve,
    disconnect: mockDisconnect,
    root: null,
    rootMargin: options?.rootMargin || '0px',
    thresholds: options?.threshold || [0],
    takeRecords: () => [],
  };
});

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
        const element = document.createElement('div');
        
        const { result, rerender } = renderHook(() => useProgressiveLoading());
        
        // Simulate setting ref by attaching to element
        act(() => {
          result.current.ref.current = element;
        });
        
        // Trigger effect by rerendering
        rerender();

        // Should create observer and observe the element
        expect(global.IntersectionObserver).toHaveBeenCalled();
        expect(mockObserve).toHaveBeenCalledWith(element);
      });

      test('FAILING TEST: should set isVisible when element intersects', async () => {
        const element = document.createElement('div');
        const { result, rerender } = renderHook(() => useProgressiveLoading());
        
        // Set ref and trigger effect
        act(() => {
          result.current.ref.current = element;
        });
        rerender();
        
        // Simulate intersection using the captured callback
        act(() => {
          if (observerCallback) {
            observerCallback([{ isIntersecting: true, target: element }]);
          }
        });

        expect(result.current.isVisible).toBe(true);
      });

      test('FAILING TEST: should load content after becoming visible', async () => {
        const element = document.createElement('div');
        const { result, rerender } = renderHook(() => useProgressiveLoading({ 
          loadDelay: 0 
        }));
        
        // Set ref and trigger effect
        act(() => {
          result.current.ref.current = element;
        });
        rerender();
        
        // Simulate intersection
        act(() => {
          if (observerCallback) {
            observerCallback([{ isIntersecting: true, target: element }]);
          }
        });

        // Wait for loading to complete
        await waitFor(() => {
          expect(result.current.isLoaded).toBe(true);
        });
      });

      test('FAILING TEST: should use custom root margin for early loading', () => {
        const element = document.createElement('div');
        const { result, rerender } = renderHook(() => useProgressiveLoading({ 
          rootMargin: '100px' 
        }));
        
        // Set ref to trigger observer creation
        act(() => {
          result.current.ref.current = element;
        });
        rerender();
        
        expect(observerOptions?.rootMargin).toBe('100px');
      });

      test('FAILING TEST: should cleanup observer on unmount', () => {
        const element = document.createElement('div');
        const { result, rerender, unmount } = renderHook(() => useProgressiveLoading());
        
        // Set ref to create observer
        act(() => {
          result.current.ref.current = element;
        });
        rerender();
        
        // Now unmount
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
        
        // Simulate card becoming visible using global callback
        act(() => {
          if (observerCallback) {
            observerCallback([{ isIntersecting: true, target: document.createElement('div') }]);
          }
        });

        // Wait for content to load
        await waitFor(() => {
          expect(screen.queryByTestId('dog-card-skeleton')).not.toBeInTheDocument();
          expect(screen.getByText('Max')).toBeInTheDocument();
        });
      });

      test('FAILING TEST: should lazy load images', async () => {
        render(<ProgressiveDogCard dog={mockDog} />);
        
        // Initially, image should not be loaded
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
        
        // Simulate visibility using global callback
        act(() => {
          if (observerCallback) {
            observerCallback([{ isIntersecting: true, target: document.createElement('div') }]);
          }
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
        
        act(() => {
          if (observerCallback) {
            observerCallback([{ isIntersecting: true, target: document.createElement('div') }]);
          }
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

        // Simulate all becoming visible using global callback
        act(() => {
          if (observerCallback) {
            // Simulate each card becoming visible
            for (let i = 0; i < 3; i++) {
              observerCallback([{ isIntersecting: true, target: document.createElement('div') }]);
            }
          }
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
        
        act(() => {
          if (observerCallback) {
            observerCallback([{ isIntersecting: true, target: document.createElement('div') }]);
          }
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
        
        act(() => {
          if (observerCallback) {
            observerCallback([{ isIntersecting: true, target: document.createElement('div') }]);
          }
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
        
        // With reduced motion, content should load immediately without observer
        // Should load immediately without animations for reduced motion
        expect(screen.getByText('Max')).toBeInTheDocument();
        expect(screen.queryByTestId('dog-card-skeleton')).not.toBeInTheDocument();
      });
    });
  });
});
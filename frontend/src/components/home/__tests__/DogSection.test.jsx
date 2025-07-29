import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import DogSection from '../DogSection';

// Mock all services first
jest.mock('../../../services/animalsService');

// Import after mocking
const { getAnimalsByCuration } = require('../../../services/animalsService');

// Mock other dependencies
jest.mock('../../../utils/logger', () => ({
  reportError: jest.fn(),
}));

jest.mock('../../../utils/imageUtils', () => ({
  preloadImages: jest.fn(),
}));

// Mock next/link
jest.mock('next/link', () => {
  return function MockLink({ children, href, className, ...otherProps }) {
    return (
      <a href={href} className={className} {...otherProps}>
        {children}
      </a>
    );
  };
});

// Mock DogCard component
jest.mock('../../dogs/DogCard', () => {
  return function MockDogCard({ dog, priority }) {
    return (
      <div data-testid={`dog-card-${dog.id}`} data-priority={priority}>
        <h3>{dog.name}</h3>
        <p>{dog.breed}</p>
      </div>
    );
  };
});

// Mock DogCardErrorBoundary
jest.mock('../../error/DogCardErrorBoundary', () => {
  return function MockDogCardErrorBoundary({ children }) {
    return <div data-testid="error-boundary">{children}</div>;
  };
});

// Mock LoadingSkeleton components
jest.mock('../../ui/LoadingSkeleton', () => ({
  DogCardSkeleton: function MockDogCardSkeleton() {
    return <div data-testid="dog-card-skeleton">Loading dog...</div>;
  },
}));


const mockDogs = [
  {
    id: '1',
    name: 'Luna',
    breed: 'Mixed',
    primary_image_url: 'https://example.com/luna.jpg',
    organization: { name: 'Pets in Turkey', city: 'Izmir', country: 'Turkey' },
    created_at: '2025-06-15T10:00:00Z' // Recent dog
  },
  {
    id: '2', 
    name: 'Max',
    breed: 'German Shepherd',
    primary_image_url: 'https://example.com/max.jpg',
    organization: { name: 'Berlin Rescue', city: 'Berlin', country: 'Germany' },
    created_at: '2025-06-10T10:00:00Z'
  },
  {
    id: '3',
    name: 'Bella',
    breed: 'Golden Retriever', 
    primary_image_url: 'https://example.com/bella.jpg',
    organization: { name: 'Happy Tails', city: 'Munich', country: 'Germany' },
    created_at: '2025-06-12T10:00:00Z'
  },
  {
    id: '4',
    name: 'Rocky',
    breed: 'Beagle',
    primary_image_url: 'https://example.com/rocky.jpg',
    organization: { name: 'Tierschutz EU', city: 'Vienna', country: 'Austria' },
    created_at: '2025-06-14T10:00:00Z'
  }
];

describe('DogSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup default successful mock using imported function
    getAnimalsByCuration.mockImplementation(() => {
      console.log('Mock getAnimalsByCuration called!');
      return Promise.resolve(mockDogs);
    });
  });

  describe('Component Structure', () => {
    test('renders section with title and subtitle', () => {
      render(
        <DogSection
          title="Just Added"
          subtitle="New dogs looking for homes"
          curationType="recent"
          viewAllHref="/dogs?curation=recent"
        />
      );

      expect(screen.getByText('Just Added')).toBeInTheDocument();
      expect(screen.getByText('New dogs looking for homes')).toBeInTheDocument();
    });

    test('renders View all link with correct href', () => {
      render(
        <DogSection
          title="From Different Rescues"
          subtitle="Dogs from each organization"
          curationType="diverse"
          viewAllHref="/dogs?curation=diverse"
        />
      );

      const viewAllLink = screen.getByText('View all');
      expect(viewAllLink).toBeInTheDocument();
      expect(viewAllLink.closest('a')).toHaveAttribute('href', '/dogs?curation=diverse');
    });

    test.skip('renders error state when API fails', async () => {
      // Mock the function to reject
      getAnimalsByCuration.mockRejectedValue(new Error('API Error'));
      
      render(
        <DogSection
          title="Test Section"
          subtitle="Test subtitle"
          curationType="recent"
          viewAllHref="/dogs"
        />
      );

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText('Could not load dogs. Please try again later.')).toBeInTheDocument();
      });
      
      // Should show retry button
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  describe('API Integration', () => {
    test.skip('attempts to call getAnimalsByCuration on mount', async () => {
      render(
        <DogSection
          title="Just Added"
          subtitle="New dogs"
          curationType="recent"
          viewAllHref="/dogs"
        />
      );

      // Wait for component to settle
      await waitFor(() => {
        expect(screen.getByRole('region')).toBeInTheDocument();
      });
      
      // The function should have been called even if it fails
      expect(getAnimalsByCuration).toHaveBeenCalled();
    });

    test.skip('rerenders when curationType changes', async () => {
      const { rerender } = render(
        <DogSection
          title="Test"
          subtitle="Test"
          curationType="diverse"
          viewAllHref="/dogs"
        />
      );

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByRole('region')).toBeInTheDocument();
      });
      
      const callCount = getAnimalsByCuration.mock.calls.length;

      rerender(
        <DogSection
          title="Test"
          subtitle="Test"
          curationType="recent"
          viewAllHref="/dogs"
        />
      );

      // Should be called again on rerender with different curationType
      await waitFor(() => {
        expect(getAnimalsByCuration).toHaveBeenCalledTimes(callCount + 1);
      });
    });
  });

  describe('Loading States', () => {
    test('shows loading state while fetching data', () => {
      getAnimalsByCuration.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(
        <DogSection
          title="Test"
          subtitle="Test"
          curationType="recent"
          viewAllHref="/dogs"
        />
      );

      expect(screen.getByTestId('skeleton-grid')).toBeInTheDocument();
    });

    test('hides loading state after data loads', async () => {
      getAnimalsByCuration.mockResolvedValue(mockDogs);

      render(
        <DogSection
          title="Test"
          subtitle="Test"
          curationType="recent"
          viewAllHref="/dogs"
        />
      );

      await waitFor(() => {
        expect(screen.queryByTestId('skeleton-grid')).not.toBeInTheDocument();
      });
    });
  });

  describe('Enhanced Loading States (Skeleton)', () => {
    test('should show skeleton grid on desktop during loading', () => {
      // Mock loading state
      getAnimalsByCuration.mockImplementation(() => new Promise(() => {}));
      
      render(
        <DogSection 
          title="Test Section" 
          subtitle="Test subtitle"
          curationType="recent" 
          viewAllHref="/dogs"
        />
      );
      
      // Should show 4 skeletons in grid
      const skeletons = screen.getAllByTestId('dog-card-skeleton');
      expect(skeletons).toHaveLength(4);
      
      // Grid container should have proper classes
      const container = screen.getByTestId('skeleton-grid');
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('grid');
    });

    test('should show mobile carousel skeletons during loading', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 });
      getAnimalsByCuration.mockImplementation(() => new Promise(() => {}));
      
      render(
        <DogSection 
          title="Test Section" 
          subtitle="Test subtitle"
          curationType="recent" 
          viewAllHref="/dogs"
        />
      );
      
      // Should show skeletons (mobile carousel will be handled by component)
      const skeletons = screen.getAllByTestId('dog-card-skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    test.skip('should show different content when loading completes', async () => {
      // Test the basic transition from loading to loaded state
      getAnimalsByCuration.mockResolvedValue(mockDogs);
      
      render(
        <DogSection 
          title="Test Section" 
          subtitle="Test subtitle"
          curationType="recent" 
          viewAllHref="/dogs"
        />
      );
      
      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByTestId('dog-section')).toBeInTheDocument();
      });
      
      // Should have dog grid content
      expect(screen.getByTestId('dog-grid')).toBeInTheDocument();
    });

    test('should maintain exact layout dimensions to prevent shifts', () => {
      render(
        <DogSection 
          title="Test Section" 
          subtitle="Test subtitle"
          curationType="recent" 
          viewAllHref="/dogs"
        />
      );
      
      const container = screen.getByTestId('dog-section-container-recent');
      
      // Should have minimum height to prevent layout shifts
      expect(container).toHaveClass('min-h-[400px]');
    });

    test('should have smooth transition classes for loading states', () => {
      render(
        <DogSection 
          title="Test Section" 
          subtitle="Test subtitle"
          curationType="recent" 
          viewAllHref="/dogs"
        />
      );
      
      // Check for transition classes
      const skeletonContainer = screen.getByTestId('skeleton-grid').parentElement;
      expect(skeletonContainer).toHaveClass('transition-opacity', 'duration-300');
    });
  });

  describe('Error Handling', () => {
    test.skip('shows error message when API call fails', async () => {
      // Mock async rejection
      getAnimalsByCuration.mockRejectedValue(new Error('API Error'));

      render(
        <DogSection
          title="Test"
          subtitle="Test"
          curationType="recent"
          viewAllHref="/dogs"
        />
      );

      // Debug: check if loading state is showing first
      expect(screen.getByTestId('dog-section-container-recent')).toBeInTheDocument();

      // Wait for the error state to be set
      await waitFor(() => {
        expect(screen.getByText(/Could not load dogs/)).toBeInTheDocument();
      }, { timeout: 10000 });
    });

    test.skip('shows retry button on error', async () => {
      // Mock async rejection
      getAnimalsByCuration.mockRejectedValue(new Error('API Error'));

      render(
        <DogSection
          title="Test"
          subtitle="Test"
          curationType="recent"
          viewAllHref="/dogs"
        />
      );

      // Wait for the error state to be set
      await waitFor(() => {
        expect(screen.getByText('Could not load dogs. Please try again later.')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Then check for the Retry button
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    test.skip('retry button refetches data', async () => {
      getAnimalsByCuration
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce(mockDogs);

      await act(async () => {
        render(
          <DogSection
            title="Test"
            subtitle="Test"
            curationType="recent"
            viewAllHref="/dogs"
          />
        );
      });

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Retry'));
      });

      await waitFor(() => {
        expect(getAnimalsByCuration).toHaveBeenCalledTimes(2);
        expect(screen.getByTestId('dog-card-1')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    test.skip('shows empty message when no dogs returned', async () => {
      // Override default mock for this test
      getAnimalsByCuration.mockResolvedValue([]);

      await act(async () => {
        render(
          <DogSection
            title="Test"
            subtitle="Test"
            curationType="recent"
            viewAllHref="/dogs"
          />
        );
      });

      await waitFor(() => {
        expect(screen.getByText(/No dogs available/)).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    test.skip('applies correct CSS classes for responsive grid', async () => {
      await act(async () => {
        render(
          <DogSection
            title="Test"
            subtitle="Test"
            curationType="recent"
            viewAllHref="/dogs"
          />
        );
      });

      await waitFor(() => {
        const gridContainer = screen.getByTestId('dog-grid');
        expect(gridContainer).toHaveClass('grid');
        expect(gridContainer).toHaveClass('grid-cols-1');
        expect(gridContainer).toHaveClass('md:grid-cols-2');
        expect(gridContainer).toHaveClass('lg:grid-cols-4');
      });
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels', async () => {
      render(
        <DogSection
          title="Just Added"
          subtitle="New dogs"
          curationType="recent"
          viewAllHref="/dogs"
        />
      );

      await waitFor(() => {
        const section = screen.getByRole('region');
        expect(section).toHaveAttribute('aria-labelledby');
      });
    });

    test('View all link has proper accessibility attributes', async () => {
      render(
        <DogSection
          title="Just Added"
          subtitle="New dogs"
          curationType="recent"
          viewAllHref="/dogs"
        />
      );

      const viewAllLink = screen.getByText('View all').closest('a');
      expect(viewAllLink).toHaveAttribute('aria-label', 'View all just added');
      expect(viewAllLink).toHaveAttribute('href', '/dogs');
    });
  });
});
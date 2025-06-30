/**
 * Tests for DogFilters component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DogFilters from '../DogFilters';

// Mock the Next.js router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

describe('DogFilters Component', () => {
  const defaultProps = {
    filters: {
      age: 'All',
      breed: '',
      shipsTo: 'All',
      sort: 'newest'
    },
    onFiltersChange: jest.fn(),
    availableBreeds: ['Golden Retriever', 'Labrador Retriever', 'German Shepherd'],
    availableShipsTo: ['DE', 'NL', 'BE', 'US', 'CA', 'MX'],
    totalCount: 25,
    hasActiveFilters: false,
    showShipsToFilter: true
  };

  const orgPageProps = {
    ...defaultProps,
    showShipsToFilter: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    test('renders filter bar with correct structure', () => {
      render(<DogFilters {...defaultProps} />);

      expect(screen.getByTestId('dog-filters')).toBeInTheDocument();
      expect(screen.getByText('Filter by:')).toBeInTheDocument();
      expect(screen.getByTestId('age-filter')).toBeInTheDocument();
      expect(screen.getByTestId('breed-filter')).toBeInTheDocument();
      expect(screen.getByTestId('ships-to-filter')).toBeInTheDocument();
      expect(screen.getByTestId('sort-filter')).toBeInTheDocument();
    });

    test('renders without ships-to filter when showShipsToFilter is false', () => {
      render(<DogFilters {...orgPageProps} />);

      expect(screen.getByTestId('dog-filters')).toBeInTheDocument();
      expect(screen.getByText('Filter by:')).toBeInTheDocument();
      expect(screen.getByTestId('age-filter')).toBeInTheDocument();
      expect(screen.getByTestId('breed-filter')).toBeInTheDocument();
      expect(screen.queryByTestId('ships-to-filter')).not.toBeInTheDocument();
      expect(screen.getByTestId('sort-filter')).toBeInTheDocument();
    });

    test('displays current filter values correctly', () => {
      const propsWithFilters = {
        ...defaultProps,
        filters: {
          age: 'Puppy',
          breed: 'golden',
          shipsTo: 'DE',
          sort: 'name-asc'
        }
      };

      render(<DogFilters {...propsWithFilters} />);

      // For Radix Select components, the value is shown via SelectValue span
      expect(screen.getByText('Puppy')).toBeInTheDocument();
      expect(screen.getByDisplayValue('golden')).toBeInTheDocument(); // Text input
      expect(screen.getByText('Germany (DE)')).toBeInTheDocument();
      expect(screen.getByText('Name A-Z')).toBeInTheDocument();
    });

    test('shows results count correctly', () => {
      render(<DogFilters {...defaultProps} totalCount={42} />);
      expect(screen.getByText('42 dogs')).toBeInTheDocument();
    });

    test('applies correct styling classes', () => {
      render(<DogFilters {...defaultProps} />);
      
      const filterBar = screen.getByTestId('dog-filters');
      expect(filterBar).toHaveClass('bg-white');
      expect(filterBar).toHaveClass('shadow-sm');
      expect(filterBar).toHaveClass('border-b');
      expect(filterBar).toHaveClass('md:sticky');
      expect(filterBar).toHaveClass('top-0');
      expect(filterBar).toHaveClass('z-20');
    });

    test('applies dark mode compatible styling classes', () => {
      render(<DogFilters {...defaultProps} />);
      
      const filterBar = screen.getByTestId('dog-filters');
      expect(filterBar).toHaveClass('bg-white');
      expect(filterBar).toHaveClass('dark:bg-gray-900');
    });
  });

  describe('Age Filter', () => {
    test('displays all age options', async () => {
      const user = userEvent.setup();
      render(<DogFilters {...defaultProps} />);

      const ageSelect = screen.getByTestId('age-filter');
      await user.click(ageSelect);

      // Use getAllByText for options that might appear multiple times
      expect(screen.getAllByText('All Ages')).toHaveLength(2); // One in trigger, one in options
      expect(screen.getByRole('option', { name: 'Puppy' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Young (1-3 years)' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Adult (3-8 years)' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Senior (8+ years)' })).toBeInTheDocument();
    });

    test('calls onFiltersChange when age filter changes', async () => {
      const user = userEvent.setup();
      const onFiltersChange = jest.fn();
      render(<DogFilters {...defaultProps} onFiltersChange={onFiltersChange} />);

      const ageSelect = screen.getByTestId('age-filter');
      await user.click(ageSelect);
      await user.click(screen.getByText('Puppy'));

      expect(onFiltersChange).toHaveBeenCalledWith({
        ...defaultProps.filters,
        age: 'Puppy'
      });
    });
  });

  describe('Breed Filter', () => {
    test('displays breed search input', () => {
      render(<DogFilters {...defaultProps} />);
      
      const breedInput = screen.getByTestId('breed-filter');
      expect(breedInput).toHaveAttribute('placeholder', 'Search breeds...');
    });

    test('calls onFiltersChange when breed filter changes', async () => {
      const user = userEvent.setup();
      const onFiltersChange = jest.fn();
      render(<DogFilters {...defaultProps} onFiltersChange={onFiltersChange} />);

      const breedInput = screen.getByTestId('breed-filter');
      await user.type(breedInput, 'golden');

      await waitFor(() => {
        expect(onFiltersChange).toHaveBeenCalledWith({
          ...defaultProps.filters,
          breed: 'golden'
        });
      });
    });

    test('debounces breed input changes', async () => {
      const user = userEvent.setup();
      const onFiltersChange = jest.fn();
      render(<DogFilters {...defaultProps} onFiltersChange={onFiltersChange} />);

      const breedInput = screen.getByTestId('breed-filter');
      await user.type(breedInput, 'gol');

      // Should not call onChange for each character immediately
      expect(onFiltersChange).not.toHaveBeenCalled();

      // Wait for debounce
      await waitFor(() => {
        expect(onFiltersChange).toHaveBeenCalledWith({
          ...defaultProps.filters,
          breed: 'gol'
        });
      }, { timeout: 1000 });
    });
  });


  describe('Ships To Filter', () => {
    test('displays ships to options from availableShipsTo', async () => {
      const user = userEvent.setup();
      render(<DogFilters {...defaultProps} />);

      const shipsToSelect = screen.getByTestId('ships-to-filter');
      await user.click(shipsToSelect);

      expect(screen.getAllByRole('option', { name: 'All Countries' })).toHaveLength(1);
      expect(screen.getByRole('option', { name: 'Germany (DE)' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Netherlands (NL)' })).toBeInTheDocument();
    });

    test('calls onFiltersChange when ships to filter changes', async () => {
      const user = userEvent.setup();
      const onFiltersChange = jest.fn();
      render(<DogFilters {...defaultProps} onFiltersChange={onFiltersChange} />);

      const shipsToSelect = screen.getByTestId('ships-to-filter');
      await user.click(shipsToSelect);
      await user.click(screen.getByText('Germany (DE)'));

      expect(onFiltersChange).toHaveBeenCalledWith({
        ...defaultProps.filters,
        shipsTo: 'DE'
      });
    });
  });

  describe('Sort Filter', () => {
    test('displays all sort options', async () => {
      const user = userEvent.setup();
      render(<DogFilters {...defaultProps} />);

      const sortSelect = screen.getByTestId('sort-filter');
      await user.click(sortSelect);

      expect(screen.getByRole('option', { name: 'Newest First' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Name A-Z' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Name Z-A' })).toBeInTheDocument();
    });

    test('calls onFiltersChange when sort changes', async () => {
      const user = userEvent.setup();
      const onFiltersChange = jest.fn();
      render(<DogFilters {...defaultProps} onFiltersChange={onFiltersChange} />);

      const sortSelect = screen.getByTestId('sort-filter');
      await user.click(sortSelect);
      await user.click(screen.getByText('Name A-Z'));

      expect(onFiltersChange).toHaveBeenCalledWith({
        ...defaultProps.filters,
        sort: 'name-asc'
      });
    });
  });

  describe('Active Filters and Clear Functionality', () => {
    test('shows active filter count when filters are active', () => {
      const propsWithActiveFilters = {
        ...defaultProps,
        hasActiveFilters: true,
        filters: {
          age: 'Puppy',
          breed: 'golden',
          shipsTo: 'DE',
          sort: 'newest'
        }
      };

      render(<DogFilters {...propsWithActiveFilters} />);
      expect(screen.getByTestId('active-filters-badge')).toBeInTheDocument();
    });

    test('shows clear all button when filters are active', () => {
      const propsWithActiveFilters = {
        ...defaultProps,
        hasActiveFilters: true
      };

      render(<DogFilters {...propsWithActiveFilters} />);
      expect(screen.getByTestId('clear-filters-button')).toBeInTheDocument();
      expect(screen.getByText('Clear all')).toBeInTheDocument();
    });

    test('hides clear all button when no filters are active', () => {
      render(<DogFilters {...defaultProps} hasActiveFilters={false} />);
      expect(screen.queryByTestId('clear-filters-button')).not.toBeInTheDocument();
    });

    test('calls onFiltersChange with default values when clear all clicked', async () => {
      const user = userEvent.setup();
      const onFiltersChange = jest.fn();
      const propsWithActiveFilters = {
        ...defaultProps,
        hasActiveFilters: true,
        onFiltersChange
      };

      render(<DogFilters {...propsWithActiveFilters} />);
      
      const clearButton = screen.getByTestId('clear-filters-button');
      await user.click(clearButton);

      expect(onFiltersChange).toHaveBeenCalledWith({
        age: 'All',
        breed: '',
        shipsTo: 'All',
        sort: 'newest'
      });
    });

    test('active filter count excludes ships-to when filter is disabled', () => {
      const propsWithActiveFilters = {
        ...orgPageProps,
        hasActiveFilters: true,
        filters: {
          age: 'Puppy',
          breed: 'golden',
          shipsTo: 'DE', // This should be ignored
          sort: 'newest'
        }
      };

      render(<DogFilters {...propsWithActiveFilters} />);
      expect(screen.getByTestId('active-filters-badge')).toBeInTheDocument();
      // Should only count age and breed (2 active filters), not ships-to
      expect(screen.getByText('2 active')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    test('applies mobile-specific classes on small screens', () => {
      // Mock window.matchMedia for mobile
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(max-width: 768px)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(<DogFilters {...defaultProps} />);
      
      const filterBar = screen.getByTestId('dog-filters');
      expect(filterBar).toHaveClass('md:sticky');
      expect(filterBar).not.toHaveClass('sticky');
    });

    test('shows horizontal scroll on mobile', () => {
      render(<DogFilters {...defaultProps} />);
      
      const filtersContainer = screen.getByTestId('filters-container');
      expect(filtersContainer).toHaveClass('overflow-x-auto');
      expect(filtersContainer).toHaveClass('md:overflow-x-visible');
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels', () => {
      render(<DogFilters {...defaultProps} />);

      expect(screen.getByLabelText('Filter by age')).toBeInTheDocument();
      expect(screen.getByLabelText('Search breeds')).toBeInTheDocument();
      expect(screen.getByLabelText('Filter by ships to')).toBeInTheDocument();
      expect(screen.getByLabelText('Sort dogs')).toBeInTheDocument();
    });

    test('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<DogFilters {...defaultProps} />);

      // First tab focuses mobile filter button (on mobile view)
      await user.tab();
      expect(screen.getByTestId('mobile-filter-button')).toHaveFocus();

      // Second tab focuses age filter (desktop view - hidden md:flex)
      await user.tab();
      expect(screen.getByTestId('age-filter')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('breed-filter')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('ships-to-filter')).toHaveFocus();
    });

    test('keyboard navigation skips ships-to filter when disabled', async () => {
      const user = userEvent.setup();
      render(<DogFilters {...orgPageProps} />);

      // First tab focuses mobile filter button (on mobile view)
      await user.tab();
      expect(screen.getByTestId('mobile-filter-button')).toHaveFocus();

      // Second tab focuses age filter (desktop view - hidden md:flex)
      await user.tab();
      expect(screen.getByTestId('age-filter')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('breed-filter')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('sort-filter')).toHaveFocus();
    });

    test('clear button has proper accessibility attributes', () => {
      const propsWithActiveFilters = {
        ...defaultProps,
        hasActiveFilters: true
      };

      render(<DogFilters {...propsWithActiveFilters} />);
      
      const clearButton = screen.getByTestId('clear-filters-button');
      expect(clearButton).toHaveAttribute('aria-label', 'Clear all filters');
    });
  });

  describe('Performance', () => {
    test('does not cause unnecessary re-renders', () => {
      const onFiltersChange = jest.fn();
      const { rerender } = render(
        <DogFilters {...defaultProps} onFiltersChange={onFiltersChange} />
      );

      // Re-render with same props
      rerender(<DogFilters {...defaultProps} onFiltersChange={onFiltersChange} />);

      // Component should handle this gracefully without errors
      expect(screen.getByTestId('dog-filters')).toBeInTheDocument();
    });

    test('handles large lists of available options efficiently', () => {
      const largeOptionsList = Array.from({ length: 1000 }, (_, i) => `Breed ${i}`);
      const propsWithLargeList = {
        ...defaultProps,
        availableBreeds: largeOptionsList
      };

      const start = performance.now();
      render(<DogFilters {...propsWithLargeList} />);
      const end = performance.now();

      expect(end - start).toBeLessThan(100); // Should render in under 100ms
      expect(screen.getByTestId('dog-filters')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    test('handles empty available options arrays', () => {
      const propsWithEmptyOptions = {
        ...defaultProps,
        availableBreeds: [],
        availableShipsTo: []
      };

      render(<DogFilters {...propsWithEmptyOptions} />);
      expect(screen.getByTestId('dog-filters')).toBeInTheDocument();
    });

    test('handles undefined filter values', () => {
      const propsWithUndefinedFilters = {
        ...defaultProps,
        filters: {
          age: undefined,
          breed: undefined,
          shipsTo: undefined,
          sort: undefined
        }
      };

      expect(() => {
        render(<DogFilters {...propsWithUndefinedFilters} />);
      }).not.toThrow();
    });

    test('handles missing onFiltersChange callback gracefully', () => {
      const propsWithoutCallback = {
        ...defaultProps,
        onFiltersChange: undefined
      };

      expect(() => {
        render(<DogFilters {...propsWithoutCallback} />);
      }).not.toThrow();
    });
  });

  describe('Integration with URL State', () => {
    test('updates URL when filters change', async () => {
      const user = userEvent.setup();
      render(<DogFilters {...defaultProps} />);

      const ageSelect = screen.getByTestId('age-filter');
      await user.click(ageSelect);
      await user.click(screen.getByText('Puppy'));

      // Should update URL with new filter parameters
      expect(mockPush).toHaveBeenCalled();
    });
  });
});
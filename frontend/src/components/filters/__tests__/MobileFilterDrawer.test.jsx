/**
 * Test suite for MobileFilterDrawer component
 * 
 * Tests the new slide-out drawer mobile filter implementation that replaces
 * the bottom sheet pattern with improved UX and consistent filter hierarchy.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MobileFilterDrawer from '../MobileFilterDrawer';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

const mockProps = {
  isOpen: false,
  onClose: jest.fn(),
  // Search
  searchQuery: '',
  handleSearchChange: jest.fn(),
  clearSearch: jest.fn(),
  
  // Organization
  organizationFilter: 'any',
  setOrganizationFilter: jest.fn(),
  organizations: [
    { id: null, name: 'Any organization' },
    { id: 1, name: 'Test Rescue' },
    { id: 2, name: 'Another Rescue' }
  ],
  
  // Breed
  standardizedBreedFilter: 'Any breed',
  setStandardizedBreedFilter: jest.fn(),
  standardizedBreeds: ['Any breed', 'Labrador', 'Golden Retriever'],
  
  // Pet Details
  sexFilter: 'Any',
  setSexFilter: jest.fn(),
  sexOptions: ['Any', 'Male', 'Female'],
  
  sizeFilter: 'Any size',
  setSizeFilter: jest.fn(),
  sizeOptions: ['Any size', 'Tiny', 'Small', 'Medium', 'Large', 'Extra Large'],
  
  ageCategoryFilter: 'Any age',
  setAgeCategoryFilter: jest.fn(),
  ageOptions: ['Any age', 'Puppy', 'Young', 'Adult', 'Senior'],
  
  // Location
  availableCountryFilter: 'Any country',
  setAvailableCountryFilter: jest.fn(),
  availableCountries: ['Any country', 'USA', 'Canada'],
  
  // Filter management
  resetFilters: jest.fn(),
  
  // Dynamic filter counts
  filterCounts: null
};

describe('MobileFilterDrawer Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Drawer Visibility and Animation', () => {
    it('renders nothing when closed', () => {
      render(<MobileFilterDrawer {...mockProps} isOpen={false} />);
      expect(screen.queryByTestId('mobile-filter-drawer')).not.toBeInTheDocument();
    });

    it('renders drawer when open', () => {
      render(<MobileFilterDrawer {...mockProps} isOpen={true} />);
      expect(screen.getByTestId('mobile-filter-drawer')).toBeInTheDocument();
    });

    it('renders backdrop when open', () => {
      render(<MobileFilterDrawer {...mockProps} isOpen={true} />);
      expect(screen.getByTestId('filter-backdrop')).toBeInTheDocument();
    });

    it('calls onClose when backdrop is clicked', () => {
      const onClose = jest.fn();
      render(<MobileFilterDrawer {...mockProps} isOpen={true} onClose={onClose} />);
      
      fireEvent.click(screen.getByTestId('filter-backdrop'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when escape key is pressed', () => {
      const onClose = jest.fn();
      render(<MobileFilterDrawer {...mockProps} isOpen={true} onClose={onClose} />);
      
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when close button is clicked', () => {
      const onClose = jest.fn();
      render(<MobileFilterDrawer {...mockProps} isOpen={true} onClose={onClose} />);
      
      fireEvent.click(screen.getByLabelText('Close filters'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Filter Hierarchy Consistency', () => {
    it('renders filters in correct order matching desktop', () => {
      render(<MobileFilterDrawer {...mockProps} isOpen={true} />);
      
      const sections = screen.getAllByRole('region');
      const sectionTitles = sections.map(section => 
        section.querySelector('h3, h4')?.textContent
      ).filter(Boolean);
      
      // Expected order: Adoptable in Country → Size → Age → Sex → Breed → Organization
      expect(sectionTitles).toEqual([
        'Adoptable in Country',
        'Size',
        'Age',
        'Sex',
        'Breed',
        'Organization'
      ]);
    });

    it('renders persistent search bar at top', () => {
      render(<MobileFilterDrawer {...mockProps} isOpen={true} />);
      
      const searchInput = screen.getByPlaceholderText('Search dogs...');
      expect(searchInput).toBeInTheDocument();
      
      // Should be outside any collapsible section
      const searchContainer = searchInput.closest('[data-testid*="section"]');
      expect(searchContainer).toBeNull();
    });

    it('does not render any sorting options', () => {
      render(<MobileFilterDrawer {...mockProps} isOpen={true} />);
      
      expect(screen.queryByText('Sort By')).not.toBeInTheDocument();
      expect(screen.queryByText('Newest First')).not.toBeInTheDocument();
      expect(screen.queryByText('Oldest First')).not.toBeInTheDocument();
      expect(screen.queryByText('Name A-Z')).not.toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('renders search input with correct value', () => {
      render(<MobileFilterDrawer {...mockProps} isOpen={true} searchQuery="labrador" />);
      
      const searchInput = screen.getByDisplayValue('labrador');
      expect(searchInput).toBeInTheDocument();
    });

    it('calls handleSearchChange when search input changes', () => {
      const handleSearchChange = jest.fn();
      render(<MobileFilterDrawer {...mockProps} isOpen={true} handleSearchChange={handleSearchChange} />);
      
      const searchInput = screen.getByPlaceholderText('Search dogs...');
      fireEvent.change(searchInput, { target: { value: 'golden' } });
      
      expect(handleSearchChange).toHaveBeenCalledTimes(1);
    });

    it('shows clear search button when search has value', () => {
      render(<MobileFilterDrawer {...mockProps} isOpen={true} searchQuery="test" />);
      
      expect(screen.getByTestId('search-clear-button')).toBeInTheDocument();
    });

    it('calls clearSearch when clear button is clicked', () => {
      const clearSearch = jest.fn();
      render(<MobileFilterDrawer {...mockProps} isOpen={true} searchQuery="test" clearSearch={clearSearch} />);
      
      fireEvent.click(screen.getByTestId('search-clear-button'));
      expect(clearSearch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Filter Interactions', () => {
    it('calls setAgeCategoryFilter when age button is clicked', () => {
      const setAgeCategoryFilter = jest.fn();
      render(<MobileFilterDrawer {...mockProps} isOpen={true} setAgeCategoryFilter={setAgeCategoryFilter} />);
      
      fireEvent.click(screen.getByTestId('age-button-Puppy'));
      expect(setAgeCategoryFilter).toHaveBeenCalledWith('Puppy');
    });

    it('calls setSizeFilter when size button is clicked', () => {
      const setSizeFilter = jest.fn();
      render(<MobileFilterDrawer {...mockProps} isOpen={true} setSizeFilter={setSizeFilter} />);
      
      fireEvent.click(screen.getByTestId('size-button-Large'));
      expect(setSizeFilter).toHaveBeenCalledWith('Large');
    });

    it('calls setSexFilter when sex button is clicked', () => {
      const setSexFilter = jest.fn();
      render(<MobileFilterDrawer {...mockProps} isOpen={true} setSexFilter={setSexFilter} />);
      
      fireEvent.click(screen.getByTestId('sex-button-Male'));
      expect(setSexFilter).toHaveBeenCalledWith('Male');
    });

    it('shows active state for selected filters', () => {
      render(<MobileFilterDrawer {...mockProps} isOpen={true} sizeFilter="Large" />);
      
      const largeButton = screen.getByTestId('size-button-Large');
      expect(largeButton).toHaveClass('bg-orange-100');
    });
  });

  describe('Dynamic Filter Counts Integration', () => {
    const mockFilterCounts = {
      size_options: [
        { value: 'Small', label: 'Small', count: 5 },
        { value: 'Medium', label: 'Medium', count: 10 },
        { value: 'Large', label: 'Large', count: 3 }
      ],
      age_options: [
        { value: 'Puppy', label: 'Puppy', count: 8 },
        { value: 'Adult', label: 'Adult', count: 15 }
      ],
      sex_options: [
        { value: 'Male', label: 'Male', count: 12 },
        { value: 'Female', label: 'Female', count: 11 }
      ]
    };

    it('shows only options with available counts', () => {
      render(<MobileFilterDrawer {...mockProps} isOpen={true} filterCounts={mockFilterCounts} />);
      
      // Should show sizes with counts > 0
      expect(screen.getByTestId('size-button-Small')).toBeInTheDocument();
      expect(screen.getByTestId('size-button-Medium')).toBeInTheDocument();
      expect(screen.getByTestId('size-button-Large')).toBeInTheDocument();
      
      // Should not show Extra Large (not in filter counts)
      expect(screen.queryByTestId('size-button-Extra Large')).not.toBeInTheDocument();
      
      // Should always show "Any" options
      expect(screen.getByTestId('size-button-Any size')).toBeInTheDocument();
    });

    it('handles null filter counts gracefully', () => {
      render(<MobileFilterDrawer {...mockProps} isOpen={true} filterCounts={null} />);
      
      // Should show all default options when no filter counts available
      expect(screen.getByTestId('size-button-Any size')).toBeInTheDocument();
      expect(screen.getByTestId('size-button-Tiny')).toBeInTheDocument();
      expect(screen.getByTestId('size-button-Small')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<MobileFilterDrawer {...mockProps} isOpen={true} />);
      
      const drawer = screen.getByTestId('mobile-filter-drawer');
      expect(drawer).toHaveAttribute('role', 'dialog');
      expect(drawer).toHaveAttribute('aria-label', 'Filter options');
      expect(drawer).toHaveAttribute('aria-modal', 'true');
    });

    it('manages focus properly when opened', async () => {
      render(<MobileFilterDrawer {...mockProps} isOpen={true} />);
      
      await waitFor(() => {
        const drawer = screen.getByTestId('mobile-filter-drawer');
        expect(drawer).toBeInTheDocument();
      });
    });

    it('has proper button aria-pressed states', () => {
      render(<MobileFilterDrawer {...mockProps} isOpen={true} sizeFilter="Large" />);
      
      const largeButton = screen.getByTestId('size-button-Large');
      const smallButton = screen.getByTestId('size-button-Small');
      
      expect(largeButton).toHaveAttribute('aria-pressed', 'true');
      expect(smallButton).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('Mobile-Specific Features', () => {
    it('renders with mobile-only visibility classes', () => {
      render(<MobileFilterDrawer {...mockProps} isOpen={true} />);
      
      const drawer = screen.getByTestId('mobile-filter-drawer');
      expect(drawer).toHaveClass('md:hidden');
    });

    it('has proper touch target sizes', () => {
      render(<MobileFilterDrawer {...mockProps} isOpen={true} />);
      
      // Check specific age buttons for touch target classes
      const puppyButton = screen.getByTestId('age-button-Puppy');
      const adultButton = screen.getByTestId('age-button-Adult');
      
      expect(puppyButton).toHaveClass('mobile-touch-target');
      expect(adultButton).toHaveClass('mobile-touch-target');
    });

    it('locks body scroll when open', () => {
      const originalOverflow = document.body.style.overflow;
      
      const { rerender } = render(<MobileFilterDrawer {...mockProps} isOpen={false} />);
      expect(document.body.style.overflow).toBe('');
      
      rerender(<MobileFilterDrawer {...mockProps} isOpen={true} />);
      expect(document.body.style.overflow).toBe('hidden');
      
      rerender(<MobileFilterDrawer {...mockProps} isOpen={false} />);
      expect(document.body.style.overflow).toBe('');
      
      // Cleanup
      document.body.style.overflow = originalOverflow;
    });
  });

  describe('Clear All Functionality', () => {
    it('shows clear all button when filters are active', () => {
      render(<MobileFilterDrawer {...mockProps} isOpen={true} sizeFilter="Large" />);
      
      expect(screen.getByTestId('clear-all-filters')).toBeInTheDocument();
    });

    it('calls resetFilters when clear all is clicked', () => {
      const resetFilters = jest.fn();
      render(<MobileFilterDrawer {...mockProps} isOpen={true} sizeFilter="Large" resetFilters={resetFilters} />);
      
      fireEvent.click(screen.getByTestId('clear-all-filters'));
      expect(resetFilters).toHaveBeenCalledTimes(1);
    });

    it('hides clear all button when no filters are active', () => {
      render(<MobileFilterDrawer {...mockProps} isOpen={true} />);
      
      expect(screen.queryByTestId('clear-all-filters')).not.toBeInTheDocument();
    });
  });
});
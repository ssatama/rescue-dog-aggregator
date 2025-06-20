import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import DesktopFilters from '../DesktopFilters';

// Mock data for testing
const mockProps = {
  // Search
  searchQuery: '',
  handleSearchChange: jest.fn(),
  clearSearch: jest.fn(),
  
  // Organization
  organizationFilter: 'any',
  setOrganizationFilter: jest.fn(),
  organizations: [
    { id: 1, name: 'Rescue Organization 1' },
    { id: 2, name: 'Rescue Organization 2' }
  ],
  
  // Breed
  standardizedBreedFilter: 'Any breed',
  setStandardizedBreedFilter: jest.fn(),
  standardizedBreeds: ['Labrador', 'Golden Retriever', 'German Shepherd'],
  
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
  locationCountryFilter: 'Any country',
  setLocationCountryFilter: jest.fn(),
  locationCountries: ['Turkey', 'USA'],
  
  availableCountryFilter: 'Any country',
  setAvailableCountryFilter: jest.fn(),
  availableCountries: ['Germany', 'Netherlands', 'Belgium'],
  
  availableRegionFilter: 'Any region',
  setAvailableRegionFilter: jest.fn(),
  availableRegions: ['Europe', 'North America'],
  
  // Filter management
  resetFilters: jest.fn()
};

describe('DesktopFilters Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Session 4: Floating Panel Structure', () => {
    test('renders floating panel with proper backdrop blur and transparency', () => {
      render(<DesktopFilters {...mockProps} />);
      
      const panel = screen.getByTestId('desktop-filters-panel');
      
      // Should have floating panel styling
      expect(panel).toHaveClass('bg-white/95');
      expect(panel).toHaveClass('backdrop-blur');
      expect(panel).toHaveClass('rounded-xl');
      expect(panel).toHaveClass('shadow-lg');
      expect(panel).toHaveClass('border');
      expect(panel).toHaveClass('border-white/50');
    });

    test('has correct width and positioning classes', () => {
      render(<DesktopFilters {...mockProps} />);
      
      const container = screen.getByTestId('desktop-filters-container');
      const panel = screen.getByTestId('desktop-filters-panel');
      
      // Container should have proper width and responsive hiding
      expect(container).toHaveClass('hidden');
      expect(container).toHaveClass('md:block');
      expect(container).toHaveClass('w-72');
      expect(container).toHaveClass('shrink-0');
      
      // Panel should have sticky positioning
      expect(panel).toHaveClass('sticky');
      expect(panel).toHaveClass('top-24');
    });

    test('displays filter count badge when filters are active', () => {
      const propsWithActiveFilters = {
        ...mockProps,
        searchQuery: 'test search',
        sexFilter: 'Male',
        sizeFilter: 'Large'
      };
      
      render(<DesktopFilters {...propsWithActiveFilters} />);
      
      const badge = screen.getByTestId('active-filters-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('3 active');
      expect(badge).toHaveClass('bg-orange-100');
      expect(badge).toHaveClass('text-orange-700');
      expect(badge).toHaveClass('px-2');
      expect(badge).toHaveClass('py-1');
      expect(badge).toHaveClass('rounded-full');
      expect(badge).toHaveClass('text-sm');
    });

    test('does not display filter count badge when no filters are active', () => {
      render(<DesktopFilters {...mockProps} />);
      
      const badge = screen.queryByTestId('active-filters-badge');
      expect(badge).not.toBeInTheDocument();
    });

    test('calculates active filter count correctly', () => {
      const propsWithVariousFilters = {
        ...mockProps,
        searchQuery: 'labrador',
        organizationFilter: '1',
        sexFilter: 'Female',
        ageCategoryFilter: 'Puppy',
        locationCountryFilter: 'Turkey'
      };
      
      render(<DesktopFilters {...propsWithVariousFilters} />);
      
      const badge = screen.getByTestId('active-filters-badge');
      expect(badge).toHaveTextContent('5 active');
    });

    test('has proper header structure with title', () => {
      render(<DesktopFilters {...mockProps} />);
      
      const header = screen.getByTestId('filters-header');
      expect(header).toHaveClass('flex');
      expect(header).toHaveClass('items-center');
      expect(header).toHaveClass('justify-between');
      expect(header).toHaveClass('mb-6');
      
      const title = screen.getByTestId('filters-title');
      expect(title).toHaveTextContent('Filters');
      expect(title).toHaveClass('font-semibold');
      expect(title).toHaveClass('text-lg');
    });

    test('has proper z-index for layering above content', () => {
      render(<DesktopFilters {...mockProps} />);
      
      const panel = screen.getByTestId('desktop-filters-panel');
      
      // Should have proper z-index for floating panel
      expect(panel).toHaveClass('z-10');
    });

    test('has proper spacing and layout structure', () => {
      render(<DesktopFilters {...mockProps} />);
      
      const panel = screen.getByTestId('desktop-filters-panel');
      const filtersContainer = screen.getByTestId('filters-container');
      
      // Panel should have proper padding
      expect(panel).toHaveClass('p-6');
      
      // Filters container should have proper spacing
      expect(filtersContainer).toHaveClass('space-y-4');
    });

    test('is hidden on mobile and visible on desktop', () => {
      render(<DesktopFilters {...mockProps} />);
      
      const container = screen.getByTestId('desktop-filters-container');
      
      // Should be hidden on mobile and visible on medium+ screens
      expect(container).toHaveClass('hidden');
      expect(container).toHaveClass('md:block');
    });

    test('maintains proper accessibility attributes', () => {
      render(<DesktopFilters {...mockProps} />);
      
      const panel = screen.getByTestId('desktop-filters-panel');
      
      // Should have proper ARIA role
      expect(panel).toHaveAttribute('role', 'complementary');
      expect(panel).toHaveAttribute('aria-label', 'Filter options');
    });

    test('provides clear all filters functionality', () => {
      const propsWithActiveFilters = {
        ...mockProps,
        searchQuery: 'test',
        sexFilter: 'Male'
      };
      
      render(<DesktopFilters {...propsWithActiveFilters} />);
      
      const clearButton = screen.getByTestId('clear-all-filters');
      expect(clearButton).toBeInTheDocument();
      expect(clearButton).toHaveTextContent('Clear All Filters');
      
      fireEvent.click(clearButton);
      expect(mockProps.resetFilters).toHaveBeenCalledTimes(1);
    });
  });

  describe('Session 4: Collapsible Filter Sections', () => {
    test('renders all filter sections with proper structure', () => {
      render(<DesktopFilters {...mockProps} />);
      
      // === DROPDOWN FILTERS SECTION ===
      
      // Search & Basic section
      const searchSection = screen.getByTestId('filter-section-search');
      expect(searchSection).toBeInTheDocument();
      expect(searchSection.tagName).toBe('DETAILS');
      
      // Breed section
      const breedSection = screen.getByTestId('filter-section-breed');
      expect(breedSection).toBeInTheDocument();
      expect(breedSection.tagName).toBe('DETAILS');
      
      // Ships to Country section (replaces location)
      const shipsToCountrySection = screen.getByTestId('filter-section-ships-to-country');
      expect(shipsToCountrySection).toBeInTheDocument();
      expect(shipsToCountrySection.tagName).toBe('DETAILS');
      
      // === BUTTON/LOLLIPOP FILTERS SECTION ===
      
      // Age filter (non-collapsible)
      const ageGrid = screen.getByTestId('age-button-grid');
      expect(ageGrid).toBeInTheDocument();
      expect(ageGrid.tagName).toBe('DIV');
      
      // Size filter (non-collapsible)
      const sizeGrid = screen.getByTestId('size-button-grid');
      expect(sizeGrid).toBeInTheDocument();
      expect(sizeGrid.tagName).toBe('DIV');
      
      // Sex filter (non-collapsible button grid)
      const sexGrid = screen.getByTestId('sex-button-grid');
      expect(sexGrid).toBeInTheDocument();
      expect(sexGrid.tagName).toBe('DIV');
    });

    test('filter sections have proper summary headers with chevron icons', () => {
      render(<DesktopFilters {...mockProps} />);
      
      const searchSummary = screen.getByTestId('filter-summary-search');
      expect(searchSummary.tagName).toBe('SUMMARY');
      expect(searchSummary).toHaveClass('flex');
      expect(searchSummary).toHaveClass('items-center');
      expect(searchSummary).toHaveClass('justify-between');
      expect(searchSummary).toHaveClass('cursor-pointer');
      expect(searchSummary).toHaveClass('py-2');
      
      // Should have chevron icon
      const chevron = within(searchSummary).getByTestId('chevron-icon-search');
      expect(chevron).toBeInTheDocument();
      expect(chevron).toHaveClass('transition-transform');
      expect(chevron).toHaveClass('group-open:rotate-180');
    });

    test('sections are expandable and collapsible', () => {
      render(<DesktopFilters {...mockProps} />);
      
      const searchSection = screen.getByTestId('filter-section-search');
      const searchSummary = screen.getByTestId('filter-summary-search');
      
      // Section should start open (default)
      expect(searchSection).toHaveAttribute('open');
      
      // Click to collapse
      fireEvent.click(searchSummary);
      expect(searchSection).not.toHaveAttribute('open');
      
      // Click to expand again
      fireEvent.click(searchSummary);
      expect(searchSection).toHaveAttribute('open');
    });

    test('chevron icon rotates when section is expanded/collapsed', () => {
      render(<DesktopFilters {...mockProps} />);
      
      const searchSection = screen.getByTestId('filter-section-search');
      const searchSummary = screen.getByTestId('filter-summary-search');
      const chevron = within(searchSummary).getByTestId('chevron-icon-search');
      
      // Should have group class for CSS targeting
      expect(searchSection).toHaveClass('group');
      
      // Chevron should have rotation classes
      expect(chevron).toHaveClass('transition-transform');
      expect(chevron).toHaveClass('group-open:rotate-180');
    });

    test('section headers have proper hover states', () => {
      render(<DesktopFilters {...mockProps} />);
      
      const searchSummary = screen.getByTestId('filter-summary-search');
      
      // Should have hover styling
      expect(searchSummary).toHaveClass('hover:bg-gray-50');
      expect(searchSummary).toHaveClass('rounded-md');
      expect(searchSummary).toHaveClass('px-2');
    });

    test('filter section content containers have proper styling', () => {
      render(<DesktopFilters {...mockProps} />);
      
      const searchContent = screen.getByTestId('filter-content-search');
      expect(searchContent).toHaveClass('mt-3');
      expect(searchContent).toHaveClass('space-y-3');
      
      const breedContent = screen.getByTestId('filter-content-breed');
      expect(breedContent).toHaveClass('mt-3');
      expect(breedContent).toHaveClass('space-y-3');
      
      const shipsToCountryContent = screen.getByTestId('filter-content-ships-to-country');
      expect(shipsToCountryContent).toHaveClass('mt-3');
      expect(shipsToCountryContent).toHaveClass('space-y-3');
    });

    test('sections start with appropriate default open/closed states', () => {
      render(<DesktopFilters {...mockProps} />);
      
      // Search & Basic should be open by default
      const searchSection = screen.getByTestId('filter-section-search');
      expect(searchSection).toHaveAttribute('open');
      
      // Breed section should be closed by default
      const breedSection = screen.getByTestId('filter-section-breed');
      expect(breedSection).not.toHaveAttribute('open');
      
      // Ships to Country section should be closed by default
      const shipsToCountrySection = screen.getByTestId('filter-section-ships-to-country');
      expect(shipsToCountrySection).not.toHaveAttribute('open');
    });

    test('sections have proper accessibility attributes', () => {
      render(<DesktopFilters {...mockProps} />);
      
      const searchSection = screen.getByTestId('filter-section-search');
      const searchSummary = screen.getByTestId('filter-summary-search');
      
      // Summary should have proper ARIA attributes
      expect(searchSummary).toHaveAttribute('aria-expanded');
      expect(searchSummary).toHaveAttribute('role', 'button');
      
      // Section should be properly labeled
      expect(searchSection).toHaveAttribute('aria-label');
    });

    test('filter sections maintain proper spacing between each other', () => {
      render(<DesktopFilters {...mockProps} />);
      
      const filtersContainer = screen.getByTestId('filters-container');
      expect(filtersContainer).toHaveClass('space-y-4');
    });
  });

  describe('Session 4: Enhanced Filter Controls', () => {
    describe('Search Input', () => {
      test('renders search input with proper styling and functionality', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const searchInput = screen.getByTestId('search-input');
        expect(searchInput).toBeInTheDocument();
        expect(searchInput).toHaveAttribute('type', 'text');
        expect(searchInput).toHaveAttribute('placeholder', 'Search dogs...');
        expect(searchInput).toHaveClass('w-full');
        
        // Test search functionality
        fireEvent.change(searchInput, { target: { value: 'labrador' } });
        expect(mockProps.handleSearchChange).toHaveBeenCalledTimes(1);
        expect(mockProps.handleSearchChange).toHaveBeenCalledWith(expect.objectContaining({
          type: 'change'
        }));
      });

      test('search input has clear button when there is text', () => {
        const propsWithSearch = { ...mockProps, searchQuery: 'test search' };
        render(<DesktopFilters {...propsWithSearch} />);
        
        const clearButton = screen.getByTestId('search-clear-button');
        expect(clearButton).toBeInTheDocument();
        
        fireEvent.click(clearButton);
        expect(mockProps.clearSearch).toHaveBeenCalledTimes(1);
      });

      test('search input does not show clear button when empty', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const clearButton = screen.queryByTestId('search-clear-button');
        expect(clearButton).not.toBeInTheDocument();
      });
    });

    describe('Organization Select', () => {
      test('renders organization select with proper options', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const orgSelect = screen.getByTestId('organization-select');
        expect(orgSelect).toBeInTheDocument();
        
        // Should show current selection
        expect(orgSelect).toHaveTextContent('Any Organization');
      });
    });

    describe('Age Button Grid', () => {
      test('renders age filters as button grid instead of dropdown', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const ageGrid = screen.getByTestId('age-button-grid');
        expect(ageGrid).toBeInTheDocument();
        expect(ageGrid).toHaveClass('grid');
        expect(ageGrid).toHaveClass('grid-cols-2');
        expect(ageGrid).toHaveClass('gap-2');
        
        // Should have age option buttons
        const anyAgeButton = screen.getByTestId('age-button-Any age');
        expect(anyAgeButton).toBeInTheDocument();
        expect(anyAgeButton).toHaveClass('justify-start');
        
        const puppyButton = screen.getByTestId('age-button-Puppy');
        expect(puppyButton).toBeInTheDocument();
      });

      test('age buttons have proper active state styling', () => {
        const propsWithActiveAge = { ...mockProps, ageCategoryFilter: 'Puppy' };
        render(<DesktopFilters {...propsWithActiveAge} />);
        
        const activeButton = screen.getByTestId('age-button-Puppy');
        expect(activeButton).toHaveClass('bg-orange-100');
        expect(activeButton).toHaveClass('text-orange-700');
        expect(activeButton).toHaveClass('border-orange-200');
        
        const inactiveButton = screen.getByTestId('age-button-Any age');
        expect(inactiveButton).not.toHaveClass('bg-orange-100');
        expect(inactiveButton).toHaveClass('bg-white');
      });

      test('clicking age button calls proper handler', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const puppyButton = screen.getByTestId('age-button-Puppy');
        fireEvent.click(puppyButton);
        
        expect(mockProps.setAgeCategoryFilter).toHaveBeenCalledWith('Puppy');
      });
    });

    describe('Size Button Grid', () => {
      test('renders size filters as button grid', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const sizeGrid = screen.getByTestId('size-button-grid');
        expect(sizeGrid).toBeInTheDocument();
        expect(sizeGrid).toHaveClass('grid');
        expect(sizeGrid).toHaveClass('grid-cols-2');
        expect(sizeGrid).toHaveClass('gap-2');
      });

      test('size buttons have proper active state styling', () => {
        const propsWithActiveSize = { ...mockProps, sizeFilter: 'Large' };
        render(<DesktopFilters {...propsWithActiveSize} />);
        
        const activeButton = screen.getByTestId('size-button-Large');
        expect(activeButton).toHaveClass('bg-orange-100');
        expect(activeButton).toHaveClass('text-orange-700');
      });

      test('clicking size button calls proper handler', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const largeButton = screen.getByTestId('size-button-Large');
        fireEvent.click(largeButton);
        
        expect(mockProps.setSizeFilter).toHaveBeenCalledWith('Large');
      });
    });

    describe('Sex Button Grid', () => {
      test('renders sex filters as button grid (lollipop style)', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const sexGrid = screen.getByTestId('sex-button-grid');
        expect(sexGrid).toBeInTheDocument();
        expect(sexGrid).toHaveClass('grid');
        expect(sexGrid).toHaveClass('grid-cols-3');
        expect(sexGrid).toHaveClass('gap-2');
        
        // Should have sex option buttons
        const anyButton = screen.getByTestId('sex-button-Any');
        expect(anyButton).toBeInTheDocument();
        expect(anyButton).toHaveClass('justify-center');
        
        const maleButton = screen.getByTestId('sex-button-Male');
        expect(maleButton).toBeInTheDocument();
      });

      test('sex buttons have proper active state styling', () => {
        const propsWithActiveSex = { ...mockProps, sexFilter: 'Female' };
        render(<DesktopFilters {...propsWithActiveSex} />);
        
        const activeButton = screen.getByTestId('sex-button-Female');
        expect(activeButton).toHaveClass('bg-orange-100');
        expect(activeButton).toHaveClass('text-orange-700');
        expect(activeButton).toHaveClass('border-orange-200');
      });

      test('clicking sex button calls proper handler', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const femaleButton = screen.getByTestId('sex-button-Female');
        fireEvent.click(femaleButton);
        
        expect(mockProps.setSexFilter).toHaveBeenCalledWith('Female');
      });
    });

    describe('Breed Search Input', () => {
      test('renders breed search input instead of dropdown', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const breedInput = screen.getByTestId('breed-search-input');
        expect(breedInput).toBeInTheDocument();
        expect(breedInput).toHaveAttribute('type', 'text');
        expect(breedInput).toHaveAttribute('placeholder', 'Search breeds...');
        
        // Test breed search functionality
        fireEvent.change(breedInput, { target: { value: 'lab' } });
        expect(mockProps.setStandardizedBreedFilter).toHaveBeenCalledWith('lab');
      });

      test('breed input shows filtered suggestions', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const breedInput = screen.getByTestId('breed-search-input');
        fireEvent.change(breedInput, { target: { value: 'lab' } });
        
        // Should show suggestions container
        const suggestions = screen.getByTestId('breed-suggestions');
        expect(suggestions).toBeInTheDocument();
      });

      test('breed input has clear functionality', () => {
        const propsWithBreed = { ...mockProps, standardizedBreedFilter: 'Labrador' };
        render(<DesktopFilters {...propsWithBreed} />);
        
        const clearButton = screen.getByTestId('breed-clear-button');
        expect(clearButton).toBeInTheDocument();
        
        fireEvent.click(clearButton);
        expect(mockProps.setStandardizedBreedFilter).toHaveBeenCalledWith('Any breed');
      });
    });

    describe('Ships to Country Filters', () => {
      test('renders country search input', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const countrySearchInput = screen.getByTestId('country-search-input');
        expect(countrySearchInput).toBeInTheDocument();
        expect(countrySearchInput).toHaveAttribute('type', 'text');
        expect(countrySearchInput).toHaveAttribute('placeholder', 'Search countries...');
      });

      test('renders ships to country select', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const shipsToSelect = screen.getByTestId('ships-to-country-select');
        expect(shipsToSelect).toBeInTheDocument();
      });
    });

    describe('Filter Interactions', () => {
      test('button grids have proper touch targets (48px minimum)', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const ageButton = screen.getByTestId('age-button-Puppy');
        expect(ageButton).toHaveStyle('min-height: 48px');
        
        const sizeButton = screen.getByTestId('size-button-Large');
        expect(sizeButton).toHaveStyle('min-height: 48px');
        
        const sexButton = screen.getByTestId('sex-button-Male');
        expect(sexButton).toHaveStyle('min-height: 48px');
      });

      test('buttons have proper hover states', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const ageButton = screen.getByTestId('age-button-Puppy');
        expect(ageButton).toHaveClass('hover:bg-gray-50');
        expect(ageButton).toHaveClass('transition-all');
        
        const sizeButton = screen.getByTestId('size-button-Large');
        expect(sizeButton).toHaveClass('hover:bg-gray-50');
        expect(sizeButton).toHaveClass('transition-all');
        
        const sexButton = screen.getByTestId('sex-button-Male');
        expect(sexButton).toHaveClass('hover:bg-gray-50');
        expect(sexButton).toHaveClass('transition-all');
      });
    });
  });

  describe('Responsive Behavior', () => {
    test('maintains proper responsive positioning', () => {
      render(<DesktopFilters {...mockProps} />);
      
      const container = screen.getByTestId('desktop-filters-container');
      
      // Should maintain responsive visibility
      expect(container).toHaveClass('hidden');
      expect(container).toHaveClass('md:block');
      
      // Should not interfere with mobile layout
      expect(container).not.toHaveClass('md:col-span-1');
      expect(container).not.toHaveClass('grid');
    });
  });
});
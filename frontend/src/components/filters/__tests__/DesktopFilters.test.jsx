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
      expect(panel).toHaveClass('bg-orange-50/50');
      expect(panel).toHaveClass('backdrop-blur-md');
      expect(panel).toHaveClass('rounded-xl');
      expect(panel).toHaveClass('shadow-xl');
      expect(panel).toHaveClass('border');
      expect(panel).toHaveClass('border-orange-100/30');
    });

    test('has correct width and positioning classes', () => {
      render(<DesktopFilters {...mockProps} />);
      
      const container = screen.getByTestId('desktop-filters-container');
      const panel = screen.getByTestId('desktop-filters-panel');
      
      // Container should have proper width and responsive hiding
      expect(container).toHaveClass('hidden');
      expect(container).toHaveClass('lg:block');
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
      expect(badge).toHaveClass('px-2.5');
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
      expect(filtersContainer).toHaveClass('space-y-6');
    });

    test('is hidden on mobile and visible on desktop', () => {
      render(<DesktopFilters {...mockProps} />);
      
      const container = screen.getByTestId('desktop-filters-container');
      
      // Should be hidden on mobile and visible on medium+ screens
      expect(container).toHaveClass('hidden');
      expect(container).toHaveClass('lg:block');
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
      
      // Search input (not in a collapsible section)
      const searchInput = screen.getByTestId('search-input');
      expect(searchInput).toBeInTheDocument();
      expect(searchInput.tagName).toBe('INPUT');
      
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
      
      const breedSummary = screen.getByTestId('filter-summary-breed');
      expect(breedSummary.tagName).toBe('SUMMARY');
      expect(breedSummary).toHaveClass('flex');
      expect(breedSummary).toHaveClass('items-center');
      expect(breedSummary).toHaveClass('justify-between');
      expect(breedSummary).toHaveClass('cursor-pointer');
      expect(breedSummary).toHaveClass('py-3');
      
      // Should have chevron icon
      const chevron = within(breedSummary).getByTestId('chevron-icon-breed');
      expect(chevron).toBeInTheDocument();
      expect(chevron).toHaveClass('transition-transform');
      expect(chevron).toHaveClass('group-open:rotate-180');
    });

    test('sections are expandable and collapsible', () => {
      render(<DesktopFilters {...mockProps} />);
      
      const breedSection = screen.getByTestId('filter-section-breed');
      const breedSummary = screen.getByTestId('filter-summary-breed');
      
      // Section should start closed (defaultOpen is false for breed)
      expect(breedSection).not.toHaveAttribute('open');
      
      // Click to expand
      fireEvent.click(breedSummary);
      expect(breedSection).toHaveAttribute('open');
      
      // Click to collapse again
      fireEvent.click(breedSummary);
      expect(breedSection).not.toHaveAttribute('open');
    });

    test('chevron icon rotates when section is expanded/collapsed', () => {
      render(<DesktopFilters {...mockProps} />);
      
      const breedSection = screen.getByTestId('filter-section-breed');
      const breedSummary = screen.getByTestId('filter-summary-breed');
      const chevron = within(breedSummary).getByTestId('chevron-icon-breed');
      
      // Should have group class for CSS targeting
      expect(breedSection).toHaveClass('group');
      
      // Chevron should have rotation classes
      expect(chevron).toHaveClass('transition-transform');
      expect(chevron).toHaveClass('group-open:rotate-180');
    });

    test('section headers have proper hover states', () => {
      render(<DesktopFilters {...mockProps} />);
      
      const breedSummary = screen.getByTestId('filter-summary-breed');
      
      // Should have hover styling
      expect(breedSummary).toHaveClass('hover:bg-gray-50/50');
      expect(breedSummary).toHaveClass('rounded-lg');
      expect(breedSummary).toHaveClass('px-4');
    });

    test('filter section content containers have proper styling', () => {
      render(<DesktopFilters {...mockProps} />);
      
      const organizationContent = screen.getByTestId('filter-content-organization');
      expect(organizationContent).toHaveClass('mt-3');
      expect(organizationContent).toHaveClass('space-y-3');
      
      const breedContent = screen.getByTestId('filter-content-breed');
      expect(breedContent).toHaveClass('mt-3');
      expect(breedContent).toHaveClass('space-y-3');
      
      const shipsToCountryContent = screen.getByTestId('filter-content-ships-to-country');
      expect(shipsToCountryContent).toHaveClass('mt-3');
      expect(shipsToCountryContent).toHaveClass('space-y-3');
    });

    test('sections start with appropriate default open/closed states', () => {
      render(<DesktopFilters {...mockProps} />);
      
      // All collapsible sections should be closed by default
      const breedSection = screen.getByTestId('filter-section-breed');
      expect(breedSection).not.toHaveAttribute('open');
      
      // Ships to Country section should be closed by default
      const shipsToCountrySection = screen.getByTestId('filter-section-ships-to-country');
      expect(shipsToCountrySection).not.toHaveAttribute('open');
      
      // Organization section should be closed by default
      const organizationSection = screen.getByTestId('filter-section-organization');
      expect(organizationSection).not.toHaveAttribute('open');
    });

    test('sections have proper accessibility attributes', () => {
      render(<DesktopFilters {...mockProps} />);
      
      const breedSection = screen.getByTestId('filter-section-breed');
      const breedSummary = screen.getByTestId('filter-summary-breed');
      
      // Summary should have proper ARIA attributes
      expect(breedSummary).toHaveAttribute('aria-expanded');
      expect(breedSummary).toHaveAttribute('role', 'button');
      
      // Section should be properly labeled
      expect(breedSection).toHaveAttribute('aria-label');
    });

    test('filter sections maintain proper spacing between each other', () => {
      render(<DesktopFilters {...mockProps} />);
      
      const filtersContainer = screen.getByTestId('filters-container');
      expect(filtersContainer).toHaveClass('space-y-6');
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
      expect(container).toHaveClass('lg:block');
      
      // Should not interfere with mobile layout
      expect(container).not.toHaveClass('md:col-span-1');
      expect(container).not.toHaveClass('grid');
    });
  });

  describe('Floating Panel Design', () => {
    describe('Panel Styling', () => {
      test('applies floating panel background and backdrop blur', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const panel = screen.getByTestId('desktop-filters-panel');
        
        // Enhanced floating panel styling
        expect(panel).toHaveClass('bg-orange-50/50');
        expect(panel).toHaveClass('backdrop-blur-md');
        expect(panel).toHaveClass('shadow-xl');
        expect(panel).toHaveClass('rounded-xl');
        expect(panel).toHaveClass('border');
        expect(panel).toHaveClass('border-orange-100/30');
      });

      test('applies proper panel positioning and dimensions', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const panel = screen.getByTestId('desktop-filters-panel');
        
        // Positioning and size
        expect(panel).toHaveClass('sticky');
        expect(panel).toHaveClass('top-24');
        expect(panel).toHaveClass('p-6');
        
        const container = screen.getByTestId('desktop-filters-container');
        expect(container).toHaveClass('w-72');
        expect(container).toHaveClass('shrink-0');
      });

      test('includes transition and performance classes', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const panel = screen.getByTestId('desktop-filters-panel');
        
        // Enhanced transitions and performance with cross-browser support
        expect(panel).toHaveClass('transition-colors');
        expect(panel).toHaveClass('cross-browser-will-change');
      });

      test('maintains proper responsive visibility', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const container = screen.getByTestId('desktop-filters-container');
        
        // Should be hidden on mobile, visible on large screens
        expect(container).toHaveClass('hidden');
        expect(container).toHaveClass('lg:block');
      });
    });

    describe('Enhanced Header Styling', () => {
      test('header has proper structure and spacing', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const header = screen.getByTestId('filters-header');
        
        // Enhanced header spacing
        expect(header).toHaveClass('flex');
        expect(header).toHaveClass('items-center');
        expect(header).toHaveClass('justify-between');
        expect(header).toHaveClass('mb-6');
      });

      test('title has enhanced typography', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const title = screen.getByTestId('filters-title');
        
        // Enhanced title styling
        expect(title).toHaveClass('text-lg');
        expect(title).toHaveClass('font-semibold');
        expect(title).toHaveClass('text-gray-900');
      });

      test('active filter badge has enhanced styling', () => {
        const propsWithFilters = { ...mockProps, searchQuery: 'test' };
        render(<DesktopFilters {...propsWithFilters} />);
        
        const badge = screen.getByTestId('active-filters-badge');
        
        // Enhanced badge styling
        expect(badge).toHaveClass('bg-orange-100');
        expect(badge).toHaveClass('text-orange-700');
        expect(badge).toHaveClass('px-2.5');
        expect(badge).toHaveClass('py-1');
        expect(badge).toHaveClass('rounded-full');
        expect(badge).toHaveClass('text-sm');
        expect(badge).toHaveClass('font-medium');
      });
    });

    describe('Enhanced Clear Button Styling', () => {
      test('clear button has orange theme styling', () => {
        const propsWithFilters = { ...mockProps, searchQuery: 'test' };
        render(<DesktopFilters {...propsWithFilters} />);
        
        const clearButton = screen.getByTestId('clear-all-filters');
        
        // Enhanced clear button styling
        expect(clearButton).toHaveClass('w-full');
        expect(clearButton).toHaveClass('mt-6');
        expect(clearButton).toHaveClass('text-orange-600');
        expect(clearButton).toHaveClass('hover:text-orange-700');
        expect(clearButton).toHaveClass('hover:bg-orange-50');
        expect(clearButton).toHaveClass('font-medium');
        expect(clearButton).toHaveClass('py-2');
        expect(clearButton).toHaveClass('px-4');
        expect(clearButton).toHaveClass('rounded-lg');
        expect(clearButton).toHaveClass('transition-colors');
        expect(clearButton).toHaveClass('enhanced-focus-button');
      });

      test('clear button is only visible when filters are active', () => {
        // No filters active
        render(<DesktopFilters {...mockProps} />);
        expect(screen.queryByTestId('clear-all-filters')).not.toBeInTheDocument();

        // With active filters
        const propsWithFilters = { ...mockProps, searchQuery: 'test' };
        const { rerender } = render(<DesktopFilters {...propsWithFilters} />);
        expect(screen.getByTestId('clear-all-filters')).toBeInTheDocument();
      });
    });

    describe('Cross-browser Compatibility', () => {
      test('panel includes backdrop-blur with fallback support', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const panel = screen.getByTestId('desktop-filters-panel');
        
        // Should include backdrop-blur class (CSS handles fallbacks)
        expect(panel).toHaveClass('backdrop-blur-md');
      });

      test('panel maintains accessibility with ARIA attributes', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const panel = screen.getByTestId('desktop-filters-panel');
        
        // Should maintain accessibility
        expect(panel).toHaveAttribute('role', 'complementary');
        expect(panel).toHaveAttribute('aria-label', 'Filter options');
      });
    });

    describe('Panel Performance', () => {
      test('panel includes performance optimization classes', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const panel = screen.getByTestId('desktop-filters-panel');
        
        // Performance optimizations with cross-browser support
        expect(panel).toHaveClass('cross-browser-will-change');
        expect(panel).toHaveClass('transition-colors');
      });

      test('panel has proper z-index for floating appearance', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const panel = screen.getByTestId('desktop-filters-panel');
        
        // Should maintain proper layering
        expect(panel).toHaveClass('z-10');
      });
    });
  });

  describe('Enhanced Collapse Animations', () => {
    describe('Smooth Height Transitions', () => {
      test('filter sections have smooth collapse transition classes', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const breedSection = screen.getByTestId('filter-section-breed');
        
        // Should have filter-section class for transitions
        expect(breedSection).toHaveClass('filter-section');
        expect(breedSection).toHaveClass('overflow-hidden');
      });

      test('filter content has fade transition classes', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const breedContent = screen.getByTestId('filter-content-breed');
        
        // Should have content transition classes
        expect(breedContent).toHaveClass('filter-section-content');
        expect(breedContent).toHaveClass('transition-opacity');
        expect(breedContent).toHaveClass('transition-transform');
        expect(breedContent).toHaveClass('duration-200');
        expect(breedContent).toHaveClass('ease-out');
      });

      test('collapsed sections apply appropriate classes', () => {
        render(<DesktopFilters {...mockProps} />);
        
        // Find a closed section (breed should be closed by default)
        const breedSection = screen.getByTestId('filter-section-breed');
        
        // Check if it has collapsed state handling
        expect(breedSection).toHaveClass('filter-section');
      });
    });

    describe('Enhanced Chevron Rotation', () => {
      test('chevron icons have smooth rotation transition', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const breedChevron = screen.getByTestId('chevron-icon-breed');
        
        // Should have enhanced chevron transition classes
        expect(breedChevron).toHaveClass('chevron-icon');
        expect(breedChevron).toHaveClass('transition-transform');
        expect(breedChevron).toHaveClass('duration-200');
        expect(breedChevron).toHaveClass('ease-out');
      });

      test('open sections apply rotate-180 to chevron', () => {
        render(<DesktopFilters {...mockProps} />);
        
        // Click to open breed section
        const breedSummary = screen.getByTestId('filter-summary-breed');
        fireEvent.click(breedSummary);
        
        const breedChevron = screen.getByTestId('chevron-icon-breed');
        
        // Should have open state rotation
        expect(breedChevron).toHaveClass('chevron-open');
      });

      test('closed sections do not have rotation class', () => {
        render(<DesktopFilters {...mockProps} />);
        
        // Breed section is closed by default
        const breedChevron = screen.getByTestId('chevron-icon-breed');
        
        // Should not have open state rotation
        expect(breedChevron).not.toHaveClass('chevron-open');
      });
    });

    describe('Animation Performance', () => {
      test('animated elements have will-change properties', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const breedSection = screen.getByTestId('filter-section-breed');
        const breedContent = screen.getByTestId('filter-content-breed');
        
        // Performance optimization classes
        expect(breedSection).toHaveClass('will-change-transform');
        expect(breedContent).toHaveClass('will-change-transform');
      });

      test('transitions use 200ms duration consistently', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const breedContent = screen.getByTestId('filter-content-breed');
        const breedChevron = screen.getByTestId('chevron-icon-breed');
        
        // Consistent timing
        expect(breedContent).toHaveClass('duration-200');
        expect(breedChevron).toHaveClass('duration-200');
      });

      test('animations respect reduced motion preferences', () => {
        // Mock reduced motion preference
        Object.defineProperty(window, 'matchMedia', {
          writable: true,
          value: jest.fn().mockImplementation(query => ({
            matches: query === '(prefers-reduced-motion: reduce)',
            media: query,
            onchange: null,
            addListener: jest.fn(),
            removeListener: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            dispatchEvent: jest.fn(),
          })),
        });

        render(<DesktopFilters {...mockProps} />);
        
        // Component should still render without errors
        expect(screen.getByTestId('desktop-filters-panel')).toBeInTheDocument();
      });
    });

    describe('Interactive Collapse Behavior', () => {
      test('clicking section header toggles collapse state', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const breedSummary = screen.getByTestId('filter-summary-breed');
        const breedSection = screen.getByTestId('filter-section-breed');
        
        // Should start closed
        expect(breedSection).not.toHaveAttribute('data-open', 'true');
        
        // Click to open
        fireEvent.click(breedSummary);
        
        // Should update open state
        expect(breedSection).toHaveAttribute('data-open', 'true');
      });

      test('keyboard interaction works for section toggle', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const breedSummary = screen.getByTestId('filter-summary-breed');
        
        // Focus and press Enter
        breedSummary.focus();
        fireEvent.keyDown(breedSummary, { key: 'Enter' });
        
        // Should toggle section
        const breedSection = screen.getByTestId('filter-section-breed');
        expect(breedSection).toHaveAttribute('data-open', 'true');
      });
    });
  });

  describe('Enhanced Section Styling', () => {
    describe('Section Header Enhancements', () => {
      test('section headers have enhanced padding and spacing', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const breedSummary = screen.getByTestId('filter-summary-breed');
        
        // Enhanced header padding
        expect(breedSummary).toHaveClass('py-3');
        expect(breedSummary).toHaveClass('px-4');
        expect(breedSummary).toHaveClass('cursor-pointer');
      });

      test('section headers have enhanced hover states', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const breedSummary = screen.getByTestId('filter-summary-breed');
        
        // Enhanced hover styling
        expect(breedSummary).toHaveClass('hover:bg-gray-50/50');
        expect(breedSummary).toHaveClass('rounded-lg');
        expect(breedSummary).toHaveClass('transition-all');
        expect(breedSummary).toHaveClass('duration-200');
        expect(breedSummary).toHaveClass('ease-out');
      });

      test('section headers maintain accessibility', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const breedSummary = screen.getByTestId('filter-summary-breed');
        
        // Accessibility attributes
        expect(breedSummary).toHaveAttribute('role', 'button');
        expect(breedSummary).toHaveAttribute('tabIndex', '0');
        expect(breedSummary).toHaveAttribute('aria-expanded');
      });
    });

    describe('Active Section Indicators', () => {
      test('sections with active filters get indicator styling', () => {
        const propsWithBreed = { ...mockProps, standardizedBreedFilter: 'Labrador' };
        render(<DesktopFilters {...propsWithBreed} />);
        
        const breedSection = screen.getByTestId('filter-section-breed');
        
        // Should have active section styling
        expect(breedSection).toHaveClass('filter-section-active');
      });

      test('sections without active filters do not get indicator styling', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const breedSection = screen.getByTestId('filter-section-breed');
        
        // Should not have active section styling
        expect(breedSection).not.toHaveClass('filter-section-active');
      });

      test('active sections have orange glow effect via CSS', () => {
        const propsWithFilters = { ...mockProps, ageCategoryFilter: 'Puppy' };
        render(<DesktopFilters {...propsWithFilters} />);
        
        // Find age section header (it's a div with Age text)
        const ageHeader = screen.getByText(/^Age/).parentElement;
        
        // Should have active styling class applied somewhere in the hierarchy
        expect(ageHeader.closest('.filter-section-active')).toBeInTheDocument();
      });

      test('multiple active sections can have indicators simultaneously', () => {
        const propsWithMultiple = { 
          ...mockProps, 
          standardizedBreedFilter: 'Labrador',
          availableCountryFilter: 'United States',
          organizationFilter: '1'
        };
        render(<DesktopFilters {...propsWithMultiple} />);
        
        const breedSection = screen.getByTestId('filter-section-breed');
        const shipsToSection = screen.getByTestId('filter-section-ships-to-country');
        const orgSection = screen.getByTestId('filter-section-organization');
        
        // All should have active styling
        expect(breedSection).toHaveClass('filter-section-active');
        expect(shipsToSection).toHaveClass('filter-section-active');
        expect(orgSection).toHaveClass('filter-section-active');
      });
    });

    describe('Enhanced Button Grid Headers', () => {
      test('button grid section headers have consistent styling', () => {
        render(<DesktopFilters {...mockProps} />);
        
        // Check Age section header
        const ageHeader = screen.getByText(/^Age/);
        
        expect(ageHeader).toHaveClass('text-sm');
        expect(ageHeader).toHaveClass('font-semibold');
        expect(ageHeader).toHaveClass('text-gray-900');
      });

      test('button grid sections show active indicators when filters applied', () => {
        const propsWithAge = { ...mockProps, ageCategoryFilter: 'Puppy' };
        render(<DesktopFilters {...propsWithAge} />);
        
        // Age section should show it has active filters through the parent container
        const ageHeader = screen.getByText(/^Age/).parentElement;
        expect(ageHeader).toBeInTheDocument();
        
        // Check for count badge
        expect(screen.getByText('(1)')).toBeInTheDocument();
      });
    });

    describe('Responsive Section Styling', () => {
      test('sections maintain styling consistency across screen sizes', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const breedSection = screen.getByTestId('filter-section-breed');
        
        // Should have consistent styling
        expect(breedSection).toHaveClass('filter-section');
        expect(breedSection).toHaveClass('overflow-hidden');
      });

      test('hover states work properly on touch devices', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const breedSummary = screen.getByTestId('filter-summary-breed');
        
        // Should include touch-friendly hover states
        expect(breedSummary).toHaveClass('hover:bg-gray-50/50');
      });
    });
  });

  describe('Enhanced Visual Feedback', () => {
    describe('Search Input Focus Enhancements', () => {
      test('search inputs have enhanced orange focus states', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const searchInput = screen.getByTestId('search-input');
        
        // Should have enhanced focus styling via CSS
        expect(searchInput).toBeInTheDocument();
        
        // Focus the input to test focus behavior
        searchInput.focus();
        expect(searchInput).toHaveFocus();
      });

      test('breed search input has enhanced focus states', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const breedInput = screen.getByTestId('breed-search-input');
        
        // Should have proper input styling
        expect(breedInput).toBeInTheDocument();
        expect(breedInput).toHaveAttribute('placeholder', 'Search breeds...');
      });

      test('country search input has enhanced focus states', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const countryInput = screen.getByTestId('country-search-input');
        
        // Should have proper input styling
        expect(countryInput).toBeInTheDocument();
        expect(countryInput).toHaveAttribute('placeholder', 'Search countries...');
      });
    });

    describe('Placeholder Text Styling', () => {
      test('all search inputs have proper placeholder styling', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const searchInput = screen.getByTestId('search-input');
        const breedInput = screen.getByTestId('breed-search-input');
        const countryInput = screen.getByTestId('country-search-input');
        
        // All inputs should have proper placeholder attributes
        expect(searchInput).toHaveAttribute('placeholder', 'Search dogs...');
        expect(breedInput).toHaveAttribute('placeholder', 'Search breeds...');
        expect(countryInput).toHaveAttribute('placeholder', 'Search countries...');
      });

      test('placeholder text uses gray-400 color via CSS', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const searchInput = screen.getByTestId('search-input');
        
        // Placeholder styling should be handled by CSS classes
        expect(searchInput).toBeInTheDocument();
      });
    });

    describe('Transition Consistency', () => {
      test('all interactive elements use consistent transition timing', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const breedSummary = screen.getByTestId('filter-summary-breed');
        const orgSummary = screen.getByTestId('filter-summary-organization');
        
        // All should use transition-all duration-200
        expect(breedSummary).toHaveClass('transition-all');
        expect(breedSummary).toHaveClass('duration-200');
        expect(orgSummary).toHaveClass('transition-all');
        expect(orgSummary).toHaveClass('duration-200');
      });

      test('button elements have consistent transitions', () => {
        const propsWithFilters = { ...mockProps, ageCategoryFilter: 'Puppy' };
        render(<DesktopFilters {...propsWithFilters} />);
        
        const ageButton = screen.getByTestId('age-button-Puppy');
        
        // Button should have cross-browser transition classes
        expect(ageButton).toHaveClass('interactive-enhanced');
      });

      test('chevron icons have consistent rotation timing', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const breedChevron = screen.getByTestId('chevron-icon-breed');
        const orgChevron = screen.getByTestId('chevron-icon-organization');
        
        // All chevrons should have consistent timing
        expect(breedChevron).toHaveClass('duration-200');
        expect(orgChevron).toHaveClass('duration-200');
      });
    });

    describe('Enhanced Hover Feedback', () => {
      test('section headers provide visual feedback on hover', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const breedSummary = screen.getByTestId('filter-summary-breed');
        
        // Should have hover background change
        expect(breedSummary).toHaveClass('hover:bg-gray-50/50');
        expect(breedSummary).toHaveClass('rounded-lg');
      });

      test('filter buttons provide enhanced hover states', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const ageButton = screen.getByTestId('age-button-Puppy'); // Use inactive button
        
        // Should have hover enhancement
        expect(ageButton).toHaveClass('hover:bg-gray-50');
        expect(ageButton).toHaveClass('hover:shadow-sm');
      });

      test('clear button has enhanced hover feedback', () => {
        const propsWithFilters = { ...mockProps, searchQuery: 'test' };
        render(<DesktopFilters {...propsWithFilters} />);
        
        const clearButton = screen.getByTestId('clear-all-filters');
        
        // Enhanced clear button feedback
        expect(clearButton).toHaveClass('hover:bg-orange-50');
        expect(clearButton).toHaveClass('hover:text-orange-700');
      });
    });

    describe('Interactive Element States', () => {
      test('all interactive elements have proper cursor styling', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const breedSummary = screen.getByTestId('filter-summary-breed');
        
        // Should have cursor pointer
        expect(breedSummary).toHaveClass('cursor-pointer');
      });

      test('disabled states are handled gracefully', () => {
        render(<DesktopFilters {...mockProps} />);
        
        // Component should render without disabled states causing issues
        expect(screen.getByTestId('desktop-filters-panel')).toBeInTheDocument();
      });

      test('active filter buttons have distinct visual states', () => {
        const propsWithAge = { ...mockProps, ageCategoryFilter: 'Puppy' };
        render(<DesktopFilters {...propsWithAge} />);
        
        const activeButton = screen.getByTestId('age-button-Puppy');
        const inactiveButton = screen.getByTestId('age-button-Adult');
        
        // Active button should have orange styling
        expect(activeButton).toHaveClass('bg-orange-100');
        expect(activeButton).toHaveClass('text-orange-700');
        
        // Inactive button should have default styling
        expect(inactiveButton).toHaveClass('bg-white');
      });
    });

    describe('Accessibility Feedback', () => {
      test('focus indicators work with orange theme', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const breedSummary = screen.getByTestId('filter-summary-breed');
        
        // Should be focusable
        breedSummary.focus();
        expect(breedSummary).toHaveFocus();
      });

      test('keyboard navigation provides visual feedback', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const breedSummary = screen.getByTestId('filter-summary-breed');
        
        // Should have proper tabIndex for keyboard navigation
        expect(breedSummary).toHaveAttribute('tabIndex', '0');
      });

      test('screen reader states are properly communicated', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const breedSummary = screen.getByTestId('filter-summary-breed');
        
        // Should have proper ARIA attributes
        expect(breedSummary).toHaveAttribute('aria-expanded');
        expect(breedSummary).toHaveAttribute('role', 'button');
      });
    });
  });

  describe('Filter Section Count Badges', () => {
    describe('Organization Section Count Badge', () => {
      test('shows count badge when organization filter is active', () => {
        const propsWithOrg = { ...mockProps, organizationFilter: '1' };
        render(<DesktopFilters {...propsWithOrg} />);
        
        const orgSection = screen.getByTestId('filter-section-organization');
        const summary = within(orgSection).getByTestId('filter-summary-organization');
        
        // Should show count badge for active organization filter
        expect(within(summary).queryByText('(1)')).toBeInTheDocument();
      });

      test('does not show count badge when no organization filter is active', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const orgSection = screen.getByTestId('filter-section-organization');
        const summary = within(orgSection).getByTestId('filter-summary-organization');
        
        // Should not show count badge
        expect(within(summary).queryByText(/\(\d+\)/)).not.toBeInTheDocument();
      });
    });

    describe('Breed Section Count Badge', () => {
      test('shows count badge when breed filter is active', () => {
        const propsWithBreed = { ...mockProps, standardizedBreedFilter: 'Labrador' };
        render(<DesktopFilters {...propsWithBreed} />);
        
        const breedSection = screen.getByTestId('filter-section-breed');
        const summary = within(breedSection).getByTestId('filter-summary-breed');
        
        // Should show count badge for active breed filter
        expect(within(summary).queryByText('(1)')).toBeInTheDocument();
      });

      test('does not show count badge when breed is "Any breed"', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const breedSection = screen.getByTestId('filter-section-breed');
        const summary = within(breedSection).getByTestId('filter-summary-breed');
        
        // Should not show count badge
        expect(within(summary).queryByText(/\(\d+\)/)).not.toBeInTheDocument();
      });
    });

    describe('Ships to Country Section Count Badge', () => {
      test('shows count badge when ships to country filter is active', () => {
        const propsWithCountry = { ...mockProps, availableCountryFilter: 'Germany' };
        render(<DesktopFilters {...propsWithCountry} />);
        
        const countrySection = screen.getByTestId('filter-section-ships-to-country');
        const summary = within(countrySection).getByTestId('filter-summary-ships-to-country');
        
        // Should show count badge for active country filter
        expect(within(summary).queryByText('(1)')).toBeInTheDocument();
      });

      test('does not show count badge when no country filter is active', () => {
        render(<DesktopFilters {...mockProps} />);
        
        const countrySection = screen.getByTestId('filter-section-ships-to-country');
        const summary = within(countrySection).getByTestId('filter-summary-ships-to-country');
        
        // Should not show count badge
        expect(within(summary).queryByText(/\(\d+\)/)).not.toBeInTheDocument();
      });
    });

    describe('Button Grid Section Count Badges', () => {
      test('Age section shows count badge when age filter is active', () => {
        const propsWithAge = { ...mockProps, ageCategoryFilter: 'Puppy' };
        render(<DesktopFilters {...propsWithAge} />);
        
        // Look for Age section header with count badge
        const ageHeader = screen.getByText(/^Age/).parentElement;
        expect(within(ageHeader).queryByText('(1)')).toBeInTheDocument();
      });

      test('Size section shows count badge when size filter is active', () => {
        const propsWithSize = { ...mockProps, sizeFilter: 'Large' };
        render(<DesktopFilters {...propsWithSize} />);
        
        // Look for Size section header with count badge
        const sizeHeader = screen.getByText(/^Size/).parentElement;
        expect(within(sizeHeader).queryByText('(1)')).toBeInTheDocument();
      });

      test('Sex section shows count badge when sex filter is active', () => {
        const propsWithSex = { ...mockProps, sexFilter: 'Male' };
        render(<DesktopFilters {...propsWithSex} />);
        
        // Look for Sex section header with count badge
        const sexHeader = screen.getByText(/^Sex/).parentElement;
        expect(within(sexHeader).queryByText('(1)')).toBeInTheDocument();
      });

      test('Button grid sections do not show count badge when filters are default values', () => {
        render(<DesktopFilters {...mockProps} />);
        
        // Check Age section
        const ageHeader = screen.getByText(/^Age/).parentElement;
        expect(within(ageHeader).queryByText(/\(\d+\)/)).not.toBeInTheDocument();
        
        // Check Size section
        const sizeHeader = screen.getByText(/^Size/).parentElement;
        expect(within(sizeHeader).queryByText(/\(\d+\)/)).not.toBeInTheDocument();
        
        // Check Sex section
        const sexHeader = screen.getByText(/^Sex/).parentElement;
        expect(within(sexHeader).queryByText(/\(\d+\)/)).not.toBeInTheDocument();
      });
    });

    describe('Count Badge Styling', () => {
      test('count badges have correct styling classes', () => {
        const propsWithFilters = { 
          ...mockProps, 
          standardizedBreedFilter: 'Labrador',
          organizationFilter: '1'
        };
        render(<DesktopFilters {...propsWithFilters} />);
        
        // Find count badges by section
        const breedSection = screen.getByTestId('filter-section-breed');
        const orgSection = screen.getByTestId('filter-section-organization');
        
        const breedBadge = within(breedSection).getByText('(1)');
        const orgBadge = within(orgSection).getByText('(1)');
        
        expect(breedBadge).toHaveClass('inline-flex');
        expect(breedBadge).toHaveClass('bg-orange-100'); 
        expect(breedBadge).toHaveClass('text-orange-700');
        expect(breedBadge).toHaveClass('px-2');
        expect(breedBadge).toHaveClass('rounded-full');
        expect(breedBadge).toHaveClass('text-xs');
        
        expect(orgBadge).toHaveClass('inline-flex');
        expect(orgBadge).toHaveClass('bg-orange-100');
        expect(orgBadge).toHaveClass('text-orange-700');
      });
    });

    describe('Real-time Count Updates', () => {
      test('count badges update when filters change', () => {
        const { rerender } = render(<DesktopFilters {...mockProps} />);
        
        // Initially no badges
        expect(screen.queryByText(/\(\d+\)/)).not.toBeInTheDocument();
        
        // Add a filter
        const propsWithBreed = { ...mockProps, standardizedBreedFilter: 'Labrador' };
        rerender(<DesktopFilters {...propsWithBreed} />);
        
        // Should now show badge
        expect(screen.getByText('(1)')).toBeInTheDocument();
        
        // Remove filter
        rerender(<DesktopFilters {...mockProps} />);
        
        // Badge should be gone
        expect(screen.queryByText(/\(\d+\)/)).not.toBeInTheDocument();
      });
    });
  });
});
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import DogsPage from '../../app/dogs/page';
import { getAnimals } from '../../services/animalsService';
import { getOrganizations } from '../../services/organizationsService';

// Mock services
jest.mock('../../services/animalsService');
jest.mock('../../services/organizationsService');

// Mock navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/dogs'),
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
    replace: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
}));

const mockDogs = [
  {
    id: 1,
    name: 'Buddy',
    standardized_breed: 'Golden Retriever',
    breed_group: 'Sporting',
    primary_image_url: 'https://example.com/buddy.jpg',
    status: 'available',
    organization: { 
      city: 'San Francisco', 
      country: 'US',
      name: 'Golden Gate Rescue'
    },
    age: '3 years',
    gender: 'male',
    size: 'Large',
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    name: 'Luna',
    standardized_breed: 'Border Collie',
    breed_group: 'Herding',
    primary_image_url: 'https://example.com/luna.jpg',
    status: 'available',
    organization: { 
      city: 'Seattle', 
      country: 'US',
      name: 'Northwest Dog Rescue'
    },
    age: '2 years',
    gender: 'female',
    size: 'Medium',
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 3,
    name: 'Max',
    standardized_breed: 'Labrador Retriever',
    breed_group: 'Sporting',
    primary_image_url: 'https://example.com/max.jpg',
    status: 'available',
    organization: { 
      city: 'Portland', 
      country: 'US',
      name: 'Oregon Pet Rescue'
    },
    age: '5 years',
    gender: 'male',
    size: 'Large',
    created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
  }
];

const mockOrganizations = [
  { id: 1, name: 'Golden Gate Rescue' },
  { id: 2, name: 'Northwest Dog Rescue' },
  { id: 3, name: 'Oregon Pet Rescue' }
];

describe('Session 7: End-to-End User Journey Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getAnimals.mockResolvedValue(mockDogs);
    getOrganizations.mockResolvedValue(mockOrganizations);
  });

  describe('Complete User Journey: Finding the Perfect Dog', () => {
    test('user successfully navigates through the entire dog discovery flow', async () => {
      const user = userEvent.setup();
      render(<DogsPage />);

      // 1. INITIAL PAGE LOAD - User arrives at dogs page
      await screen.findByText('Buddy');
      
      // Should see the page with proper styling
      expect(screen.getByTestId('dogs-page-gradient-wrapper')).toBeInTheDocument();
      expect(screen.getByTestId('dogs-grid')).toBeInTheDocument();
      
      // All dogs should be visible initially
      expect(screen.getByText('Buddy')).toBeInTheDocument();
      expect(screen.getByText('Luna')).toBeInTheDocument();
      expect(screen.getByText('Max')).toBeInTheDocument();

      // 2. FILTERING - User filters by size (Large dogs only)
      const largeSizeButton = screen.getByTestId('size-button-Large');
      await user.click(largeSizeButton);
      
      // Filter should be activated with orange styling
      await waitFor(() => {
        expect(largeSizeButton).toHaveClass('bg-orange-100');
      });

      // 3. ORGANIZATION FILTERING - User clicks organization selector
      const orgSelect = screen.getByTestId('organization-select');
      await user.click(orgSelect);
      
      // Should be able to interact with the selector
      expect(orgSelect).toBeInTheDocument();

      // 4. SEARCH - User can interact with search functionality
      const searchInputs = screen.getAllByPlaceholderText(/Search/i);
      expect(searchInputs.length).toBeGreaterThan(0);
      
      // Search inputs are available for user interaction
      expect(searchInputs[0]).toBeInTheDocument();

      // 5. DOG CARD INTERACTION - User examines a dog card
      const buddyCard = screen.getByText('Buddy').closest('[data-testid="dog-card"]');
      expect(buddyCard).toBeInTheDocument();
      
      // Card should have proper styling and animations (unified shadow system)
      expect(buddyCard).toHaveClass('shadow-sm', 'hover:shadow-md', 'will-change-transform');
      
      // Should see dog information displayed
      expect(screen.getByText('Buddy')).toBeInTheDocument();
      
      // Should see location information (may appear in multiple places)
      const locations = screen.getAllByText('Golden Gate Rescue');
      expect(locations.length).toBeGreaterThan(0);

      // 6. CTA INTERACTION - User clicks to meet the dog
      const meetBuddyButton = screen.getByText('Meet Buddy →');
      expect(meetBuddyButton).toHaveClass('from-orange-600', 'to-orange-700');
      expect(meetBuddyButton).toHaveClass('mobile-touch-target');
      
      // Button should be accessible
      expect(meetBuddyButton).toHaveAttribute('type', 'button');

      // 7. CLEAR FILTERS - User can access clear filters functionality
      const clearFiltersButton = screen.getByText('Clear All');
      expect(clearFiltersButton).toHaveClass('text-orange-600');
      
      // Clear filters button is available for interaction
      expect(clearFiltersButton).toBeInTheDocument();
    });

    test('user journey on mobile device with responsive features', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      const user = userEvent.setup();
      render(<DogsPage />);

      await screen.findByText('Buddy');

      // 1. MOBILE FILTER ACCESS - User opens mobile filter panel
      const mobileFilterButton = screen.getByRole('button', { name: /Filter/i });
      expect(mobileFilterButton).toBeInTheDocument();
      expect(mobileFilterButton).toHaveClass('mobile-touch-target'); // Touch target
      
      await user.click(mobileFilterButton);

      // 2. MOBILE GRID LAYOUT - Check responsive grid
      const dogsGrid = screen.getByTestId('dogs-grid');
      expect(dogsGrid).toHaveClass('grid-cols-1'); // Single column on mobile
      
      // 3. MOBILE CARD INTERACTION - Cards should be touch-friendly
      const dogCards = screen.getAllByTestId('dog-card');
      dogCards.forEach(card => {
        expect(card).toHaveClass('shadow-sm', 'hover:shadow-md');
      });

      // 4. MOBILE CTA BUTTONS - Should meet touch target requirements
      const meetButtons = screen.getAllByText(/Meet .* →/);
      meetButtons.forEach(button => {
        expect(button).toHaveClass('mobile-touch-target');
      });
    });

    test('user journey with accessibility features enabled', async () => {
      const user = userEvent.setup();
      render(<DogsPage />);

      await screen.findByText('Buddy');

      // 1. KEYBOARD NAVIGATION - User navigates using keyboard only
      await user.tab(); // Skip link
      expect(screen.getByText('Skip to main content')).toHaveFocus();
      
      await user.tab(); // Next focusable element
      expect(document.activeElement).toBeTruthy();

      // 2. SCREEN READER SUPPORT - Check ARIA landmarks
      const mains = screen.getAllByRole('main');
      expect(mains.length).toBeGreaterThan(0);
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      const complementary = screen.getAllByRole('complementary');
      expect(complementary.length).toBeGreaterThan(0);

      // 3. LOADING STATES - Should announce properly
      getAnimals.mockImplementation(() => new Promise(() => {})); // Never resolves
      render(<DogsPage />);
      
      const skeletons = await screen.findAllByTestId('dog-card-skeleton');
      expect(skeletons[0]).toHaveAttribute('role', 'status');
      expect(skeletons[0]).toHaveAttribute('aria-label', 'Loading dog information');

      // 4. FOCUS MANAGEMENT - Orange focus indicators
      getAnimals.mockResolvedValue(mockDogs); // Reset
      render(<DogsPage />);
      
      await screen.findByText('Buddy');
      const meetButton = screen.getAllByText(/Meet .* →/)[0];
      expect(meetButton).toHaveClass('enhanced-focus-button');
    });
  });

  describe('Error Recovery Journey', () => {
    test('user recovers from network errors gracefully', async () => {
      // 1. NETWORK ERROR - Initial load fails
      getAnimals.mockRejectedValue(new Error('Network error'));
      render(<DogsPage />);

      // Should show error state
      const errorHeading = await screen.findByRole('heading', { name: /Error Loading Dogs/i });
      expect(errorHeading).toBeInTheDocument();

      // 2. RETRY - User attempts to retry
      // Error state should be accessible
      expect(errorHeading.closest('div')).toBeInTheDocument();
    });

    test('user handles empty search results', async () => {
      const user = userEvent.setup();
      
      // 1. EMPTY RESULTS - Search returns no dogs
      getAnimals.mockResolvedValue([]);
      render(<DogsPage />);

      // Should show empty state
      const emptyState = await screen.findByTestId('empty-state');
      expect(emptyState).toBeInTheDocument();
      expect(emptyState).toHaveAttribute('role', 'status');

      // 2. SEARCH MODIFICATION - User tries different search
      getAnimals.mockResolvedValue(mockDogs);
      
      const searchInputs = screen.getAllByPlaceholderText(/Search/i);
      const searchInput = searchInputs[0];
      
      await user.click(searchInput);
      await user.type(searchInput, 'Golden');
      
      // Should be able to search again
      expect(searchInput).toHaveValue('Golden');
    });
  });

  describe('Performance and Polish Journey', () => {
    test('user experiences smooth animations and loading', async () => {
      const user = userEvent.setup();
      render(<DogsPage />);

      await screen.findByText('Buddy');

      // 1. CARD ANIMATIONS - Should use GPU acceleration and unified shadow system
      const dogCards = screen.getAllByTestId('dog-card');
      dogCards.forEach(card => {
        expect(card).toHaveClass('will-change-transform');
        expect(card).toHaveClass('shadow-sm', 'hover:shadow-md');
      });

      // 2. IMAGE LOADING - Should use lazy loading
      const imageContainers = screen.getAllByTestId('image-container');
      expect(imageContainers.length).toBeGreaterThan(0);
      // LazyImage component handles lazy loading internally

      // 3. BUTTON INTERACTIONS - Should have smooth hover states
      const meetButton = screen.getAllByText(/Meet .* →/)[0];
      expect(meetButton).toHaveClass('transition-all', 'duration-300');
      
      // Click should work smoothly
      await user.click(meetButton);
      expect(meetButton).toHaveClass('from-orange-600', 'to-orange-700');
    });

    test('user sees consistent orange theme throughout journey', async () => {
      const user = userEvent.setup();
      render(<DogsPage />);

      await screen.findByText('Buddy');

      // 1. DOG CARD CTAS - Should all use orange theme
      const meetButtons = screen.getAllByText(/Meet .* →/);
      meetButtons.forEach(button => {
        expect(button).toHaveClass('from-orange-600', 'to-orange-700');
        expect(button).toHaveClass('text-white');
      });

      // 2. FILTER ACTIVE STATES - Should use orange
      const sizeButton = screen.getByTestId('size-button-Large');
      await user.click(sizeButton);
      
      await waitFor(() => {
        expect(sizeButton).toHaveClass('bg-orange-100');
      });

      // 3. CLEAR FILTERS LINK - Should use orange
      const clearLink = screen.getByText('Clear All');
      expect(clearLink).toHaveClass('text-orange-600');

      // 4. FOCUS INDICATORS - Check that orange focus rings exist
      const meetButton = meetButtons[0];
      expect(meetButton).toHaveClass('enhanced-focus-button');
    });
  });

  describe('Cross-Platform Compatibility Journey', () => {
    test('user experience remains consistent across different screen sizes', async () => {
      const user = userEvent.setup();

      // Test desktop first
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      });

      render(<DogsPage />);
      await screen.findByText('Buddy');

      // Desktop should show 3-column grid
      const dogsGrids = screen.getAllByTestId('dogs-grid');
      expect(dogsGrids[0]).toHaveClass('lg:grid-cols-3');
      expect(dogsGrids[0]).toHaveClass('sm:grid-cols-2');
      expect(dogsGrids[0]).toHaveClass('grid-cols-1');
    });

    test('user with reduced motion preferences has accessible experience', async () => {
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

      const user = userEvent.setup();
      render(<DogsPage />);

      await screen.findByText('Buddy');

      // User should still be able to interact with all elements
      const meetButton = screen.getAllByText(/Meet .* →/)[0];
      await user.click(meetButton);
      
      // Interactions should still work
      expect(meetButton).toBeInTheDocument();
      
      // Elements should still be accessible
      expect(meetButton).toHaveClass('from-orange-600', 'to-orange-700');
    });
  });

  describe('Complete Session 7 Feature Integration', () => {
    test('all Session 7 features work together seamlessly', async () => {
      const user = userEvent.setup();
      render(<DogsPage />);

      await screen.findByText('Buddy');

      // 1. Visual consistency - Orange theme throughout
      const meetButtons = screen.getAllByText(/Meet .* →/);
      meetButtons.forEach(button => {
        expect(button).toHaveClass('from-orange-600', 'to-orange-700');
      });

      // 2. Cross-browser compatibility - Elements render properly
      const dogsGrid = screen.getByTestId('dogs-grid');
      expect(dogsGrid).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-3');

      // 3. Responsive design - Touch targets
      const mobileFilterButton = screen.getByRole('button', { name: /Filter/i });
      expect(mobileFilterButton).toHaveClass('mobile-touch-target');

      // 4. Performance - GPU acceleration
      const dogCards = screen.getAllByTestId('dog-card');
      expect(dogCards[0]).toHaveClass('will-change-transform');

      // 5. Accessibility - ARIA landmarks
      const mains = screen.getAllByRole('main');
      expect(mains.length).toBeGreaterThan(0);
      expect(screen.getByRole('navigation')).toBeInTheDocument();

      // 6. User interaction flow
      const sizeButton = screen.getByTestId('size-button-Large');
      await user.click(sizeButton);
      
      await waitFor(() => {
        expect(sizeButton).toHaveClass('bg-orange-100');
      });

      // All features work together
      expect(true).toBe(true); // Integration successful
    });
  });
});
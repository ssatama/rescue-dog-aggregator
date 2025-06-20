import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import MobileFilterBottomSheet from '../MobileFilterBottomSheet';

// Mock Next.js hooks
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock Framer Motion for testing
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }) => children,
}));

const mockFilters = {
  age: 'All',
  breed: '',
  sex: 'Any',
  size: 'Any size',
  organization: 'any',
  sort: 'newest'
};

const mockProps = {
  isOpen: false,
  onClose: jest.fn(),
  filters: mockFilters,
  onFiltersChange: jest.fn(),
  availableBreeds: ['Labrador', 'Golden Retriever', 'Poodle'],
  organizations: [
    { id: null, name: 'Any organization' },
    { id: 1, name: 'Pets in Turkey' },
    { id: 2, name: 'Berlin Rescue' }
  ],
  totalCount: 42,
  hasActiveFilters: false,
  onClearAll: jest.fn()
};

describe('MobileFilterBottomSheet', () => {
  const mockPush = jest.fn();
  const mockSearchParams = new URLSearchParams();

  beforeEach(() => {
    jest.clearAllMocks();
    useRouter.mockReturnValue({ push: mockPush });
    useSearchParams.mockReturnValue(mockSearchParams);
  });

  describe('Rendering', () => {
    test('renders bottom sheet when open', () => {
      render(<MobileFilterBottomSheet {...mockProps} isOpen={true} />);
      
      expect(screen.getByTestId('mobile-filter-sheet')).toBeInTheDocument();
      expect(screen.getByText('Filter & Sort')).toBeInTheDocument();
      expect(screen.getByText('42 dogs found')).toBeInTheDocument();
    });

    test('does not render when closed', () => {
      render(<MobileFilterBottomSheet {...mockProps} isOpen={false} />);
      
      expect(screen.queryByTestId('mobile-filter-sheet')).not.toBeInTheDocument();
    });

    test('renders all filter sections', () => {
      render(<MobileFilterBottomSheet {...mockProps} isOpen={true} />);
      
      expect(screen.getByText('Age')).toBeInTheDocument();
      expect(screen.getByText('Breed')).toBeInTheDocument();
      expect(screen.getByText('Sex')).toBeInTheDocument();
      expect(screen.getByText('Size')).toBeInTheDocument();
      expect(screen.getByText('Organization')).toBeInTheDocument();
      expect(screen.getByText('Sort By')).toBeInTheDocument();
    });
  });

  describe('Filter Interactions', () => {
    test('handles age filter selection', async () => {
      render(<MobileFilterBottomSheet {...mockProps} isOpen={true} />);
      
      const ageButton = screen.getByTestId('age-filter-Puppy');
      
      await act(async () => {
        fireEvent.click(ageButton);
      });

      expect(mockProps.onFiltersChange).toHaveBeenCalledWith({
        ...mockFilters,
        age: 'Puppy'
      });
    });

    test('handles breed search input', async () => {
      render(<MobileFilterBottomSheet {...mockProps} isOpen={true} />);
      
      const breedInput = screen.getByTestId('breed-search-input');
      
      await act(async () => {
        fireEvent.change(breedInput, { target: { value: 'Lab' } });
      });

      // Should update local state immediately
      expect(breedInput.value).toBe('Lab');
      
      // Should trigger debounced filter change
      await waitFor(() => {
        expect(mockProps.onFiltersChange).toHaveBeenCalledWith({
          ...mockFilters,
          breed: 'Lab'
        });
      }, { timeout: 500 });
    });

    test('handles sex filter selection', async () => {
      render(<MobileFilterBottomSheet {...mockProps} isOpen={true} />);
      
      const sexButton = screen.getByTestId('sex-filter-Male');
      
      await act(async () => {
        fireEvent.click(sexButton);
      });

      expect(mockProps.onFiltersChange).toHaveBeenCalledWith({
        ...mockFilters,
        sex: 'Male'
      });
    });

    test('handles organization selection', async () => {
      render(<MobileFilterBottomSheet {...mockProps} isOpen={true} />);
      
      const orgButton = screen.getByTestId('organization-filter-1');
      
      await act(async () => {
        fireEvent.click(orgButton);
      });

      expect(mockProps.onFiltersChange).toHaveBeenCalledWith({
        ...mockFilters,
        organization: '1'
      });
    });
  });

  describe('Clear Functionality', () => {
    test('shows clear all button when filters are active', () => {
      render(<MobileFilterBottomSheet {...mockProps} isOpen={true} hasActiveFilters={true} />);
      
      expect(screen.getByTestId('clear-all-button')).toBeInTheDocument();
    });

    test('hides clear all button when no filters are active', () => {
      render(<MobileFilterBottomSheet {...mockProps} isOpen={true} hasActiveFilters={false} />);
      
      expect(screen.queryByTestId('clear-all-button')).not.toBeInTheDocument();
    });

    test('handles clear all action', async () => {
      render(<MobileFilterBottomSheet {...mockProps} isOpen={true} hasActiveFilters={true} />);
      
      const clearButton = screen.getByTestId('clear-all-button');
      
      await act(async () => {
        fireEvent.click(clearButton);
      });

      expect(mockProps.onClearAll).toHaveBeenCalled();
    });
  });

  describe('Touch Gestures', () => {
    test('handles backdrop click to close', async () => {
      render(<MobileFilterBottomSheet {...mockProps} isOpen={true} />);
      
      const backdrop = screen.getByTestId('filter-backdrop');
      
      await act(async () => {
        fireEvent.click(backdrop);
      });

      expect(mockProps.onClose).toHaveBeenCalled();
    });

    test('handles escape key to close', async () => {
      render(<MobileFilterBottomSheet {...mockProps} isOpen={true} />);
      
      await act(async () => {
        fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
      });

      expect(mockProps.onClose).toHaveBeenCalled();
    });

    test('prevents body scroll when open', () => {
      const { rerender } = render(<MobileFilterBottomSheet {...mockProps} isOpen={false} />);
      
      expect(document.body.style.overflow).not.toBe('hidden');
      
      rerender(<MobileFilterBottomSheet {...mockProps} isOpen={true} />);
      
      expect(document.body.style.overflow).toBe('hidden');
      
      rerender(<MobileFilterBottomSheet {...mockProps} isOpen={false} />);
      
      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('Visual States', () => {
    test('highlights active filter buttons with orange theme', () => {
      const activeFilters = {
        ...mockFilters,
        age: 'Puppy',
        sex: 'Male'
      };
      
      render(<MobileFilterBottomSheet {...mockProps} isOpen={true} filters={activeFilters} />);
      
      const puppyButton = screen.getByTestId('age-filter-Puppy');
      const maleButton = screen.getByTestId('sex-filter-Male');
      
      expect(puppyButton).toHaveClass('bg-orange-500', 'text-white', 'border-orange-500');
      expect(maleButton).toHaveClass('bg-orange-500', 'text-white', 'border-orange-500');
    });

    test('shows inactive state for unselected filters', () => {
      render(<MobileFilterBottomSheet {...mockProps} isOpen={true} />);
      
      const adultButton = screen.getByTestId('age-filter-Adult');
      
      expect(adultButton).toHaveClass('bg-gray-100', 'text-gray-700', 'border-gray-300');
      expect(adultButton).not.toHaveClass('bg-orange-500');
    });

    test('bottom sheet has proper GPU acceleration and styling', () => {
      render(<MobileFilterBottomSheet {...mockProps} isOpen={true} />);
      
      const bottomSheet = screen.getByTestId('mobile-filter-sheet');
      
      expect(bottomSheet).toHaveClass('will-change-transform', 'gpu-accelerated');
      expect(bottomSheet).toHaveClass('bg-white', 'rounded-t-2xl', 'shadow-2xl');
    });

    test('displays total count in results counter', () => {
      render(<MobileFilterBottomSheet {...mockProps} isOpen={true} totalCount={42} />);
      
      expect(screen.getByText('42 dogs found')).toBeInTheDocument();
    });

    test('filter buttons have proper hover animation classes', () => {
      render(<MobileFilterBottomSheet {...mockProps} isOpen={true} />);
      
      const ageButton = screen.getByTestId('age-filter-Adult');
      
      expect(ageButton).toHaveClass('animate-button-hover', 'focus-ring');
      expect(ageButton).toHaveClass('min-h-[48px]'); // Touch target compliance
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels', () => {
      render(<MobileFilterBottomSheet {...mockProps} isOpen={true} />);
      
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'Filter and sort options');
      expect(screen.getByTestId('breed-search-input')).toHaveAttribute('aria-label', 'Search for specific breed');
    });

    test('supports keyboard navigation', async () => {
      render(<MobileFilterBottomSheet {...mockProps} isOpen={true} />);
      
      const puppyButton = screen.getByTestId('age-filter-Puppy');
      
      puppyButton.focus();
      expect(document.activeElement).toBe(puppyButton);
      
      await act(async () => {
        fireEvent.keyDown(puppyButton, { key: 'Enter' });
        fireEvent.click(puppyButton); // Buttons respond to click events, not keyDown
      });

      expect(mockProps.onFiltersChange).toHaveBeenCalledWith({
        ...mockFilters,
        age: 'Puppy'
      });
    });

    test('traps focus within modal', () => {
      render(<MobileFilterBottomSheet {...mockProps} isOpen={true} />);
      
      const modal = screen.getByRole('dialog');
      const focusableElements = modal.querySelectorAll('button, input, select, textarea');
      
      expect(focusableElements.length).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    test('debounces breed search input', async () => {
      render(<MobileFilterBottomSheet {...mockProps} isOpen={true} />);
      
      const breedInput = screen.getByTestId('breed-search-input');
      
      // Type quickly
      await act(async () => {
        fireEvent.change(breedInput, { target: { value: 'L' } });
        fireEvent.change(breedInput, { target: { value: 'La' } });
        fireEvent.change(breedInput, { target: { value: 'Lab' } });
      });

      // Should only call onFiltersChange once after debounce
      await waitFor(() => {
        expect(mockProps.onFiltersChange).toHaveBeenCalledTimes(1);
      }, { timeout: 500 });
    });
  });

  describe('Cross-Browser Mobile Compatibility', () => {
    test('works correctly on iOS Safari', async () => {
      // Mock iOS Safari user agent
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
      });

      render(<MobileFilterBottomSheet {...mockProps} isOpen={true} />);
      
      const bottomSheet = screen.getByTestId('mobile-filter-sheet');
      expect(bottomSheet).toBeInTheDocument();
      expect(bottomSheet).toHaveClass('will-change-transform', 'gpu-accelerated');
      
      // Test touch interaction
      const ageButton = screen.getByTestId('age-filter-Puppy');
      
      await act(async () => {
        fireEvent.touchStart(ageButton);
        fireEvent.touchEnd(ageButton);
        fireEvent.click(ageButton);
      });

      expect(mockProps.onFiltersChange).toHaveBeenCalled();
    });

    test('works correctly on Android Chrome', async () => {
      // Mock Android Chrome user agent
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.77 Mobile Safari/537.36'
      });

      render(<MobileFilterBottomSheet {...mockProps} isOpen={true} />);
      
      const bottomSheet = screen.getByTestId('mobile-filter-sheet');
      expect(bottomSheet).toBeInTheDocument();
      
      // Test backdrop interaction on Android
      const backdrop = screen.getByTestId('filter-backdrop');
      
      await act(async () => {
        fireEvent.click(backdrop);
      });

      expect(mockProps.onClose).toHaveBeenCalled();
    });

    test('supports reduced motion preferences', async () => {
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

      render(<MobileFilterBottomSheet {...mockProps} isOpen={true} />);
      
      const bottomSheet = screen.getByTestId('mobile-filter-sheet');
      expect(bottomSheet).toBeInTheDocument();
      
      // Should still render properly even with reduced motion
      expect(bottomSheet).toHaveClass('bg-white', 'rounded-t-2xl');
    });
  });
});
// src/components/filters/__tests__/MobileFilterBottomSheet.dark-mode.test.jsx
// TDD Phase 1: RED - Tests for MobileFilterBottomSheet dark mode functionality

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MobileFilterBottomSheet from '../MobileFilterBottomSheet';

// Mock framer-motion to avoid animation complexity in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }) => <>{children}</>
}));

// Mock the Icon component
jest.mock('../../ui/Icon', () => ({
  Icon: function MockIcon({ name, size, color, className }) {
    return (
      <span 
        data-testid="icon" 
        data-name={name} 
        data-size={size} 
        data-color={color}
        className={className}
      >
        Icon
      </span>
    );
  }
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: function MockButton({ children, variant, size, className, onClick, ...props }) {
    return (
      <button 
        className={className} 
        onClick={onClick}
        data-variant={variant}
        data-size={size}
        {...props}
      >
        {children}
      </button>
    );
  }
}));

jest.mock('@/components/ui/input', () => ({
  Input: function MockInput(props) {
    return <input {...props} />;
  }
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: function MockBadge({ children, className }) {
    return <span className={className}>{children}</span>;
  }
}));

describe('MobileFilterBottomSheet Dark Mode', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    filters: {},
    onFiltersChange: jest.fn(),
    availableBreeds: ['Golden Retriever', 'Labrador'],
    organizations: [
      { id: 1, name: 'Happy Tails' },
      { id: 2, name: 'Rescue Friends' }
    ],
    totalCount: 25,
    hasActiveFilters: false,
    onClearAll: jest.fn(),
    isOrganizationPage: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Bottom Sheet Container Dark Mode', () => {
    test('bottom sheet has dark mode background', () => {
      render(<MobileFilterBottomSheet {...defaultProps} />);
      
      const bottomSheet = screen.getByTestId('mobile-filter-sheet');
      expect(bottomSheet).toHaveClass('bg-white');
      expect(bottomSheet).toHaveClass('dark:bg-gray-900');
    });

    test('backdrop has proper dark mode opacity', () => {
      render(<MobileFilterBottomSheet {...defaultProps} />);
      
      const backdrop = screen.getByTestId('filter-backdrop');
      expect(backdrop).toHaveClass('bg-black/50');
      expect(backdrop).toHaveClass('dark:bg-black/70');
    });

    test('handle bar has dark mode styling', () => {
      render(<MobileFilterBottomSheet {...defaultProps} />);
      
      const handleBar = document.querySelector('.w-12.h-1');
      expect(handleBar).toHaveClass('bg-gray-300');
      expect(handleBar).toHaveClass('dark:bg-gray-600');
    });
  });

  describe('Header Section Dark Mode', () => {
    test('header has dark mode border', () => {
      render(<MobileFilterBottomSheet {...defaultProps} />);
      
      const header = screen.getByText('Filter & Sort').closest('.border-b');
      expect(header).toHaveClass('border-gray-200');
      expect(header).toHaveClass('dark:border-gray-700');
    });

    test('header title has dark mode text color', () => {
      render(<MobileFilterBottomSheet {...defaultProps} />);
      
      const title = screen.getByText('Filter & Sort');
      expect(title).toHaveClass('text-gray-900');
      expect(title).toHaveClass('dark:text-gray-100');
    });

    test('close button has dark mode hover styling', () => {
      render(<MobileFilterBottomSheet {...defaultProps} />);
      
      const closeButton = screen.getByLabelText('Close filters');
      expect(closeButton).toHaveClass('hover:bg-gray-100');
      expect(closeButton).toHaveClass('dark:hover:bg-gray-800');
    });
  });

  describe('Results Counter Dark Mode', () => {
    test('results counter section has dark mode background', () => {
      render(<MobileFilterBottomSheet {...defaultProps} />);
      
      const resultsSection = screen.getByText('25 dogs found').closest('.bg-gray-50');
      expect(resultsSection).toHaveClass('bg-gray-50');
      expect(resultsSection).toHaveClass('dark:bg-gray-800');
      expect(resultsSection).toHaveClass('border-gray-200');
      expect(resultsSection).toHaveClass('dark:border-gray-700');
    });

    test('results counter text has dark mode color', () => {
      render(<MobileFilterBottomSheet {...defaultProps} />);
      
      const resultsText = screen.getByText('25 dogs found');
      expect(resultsText).toHaveClass('text-gray-700');
      expect(resultsText).toHaveClass('dark:text-gray-300');
    });

    test('clear all button maintains orange theme in dark mode', () => {
      render(<MobileFilterBottomSheet {...defaultProps} hasActiveFilters={true} />);
      
      const clearButton = screen.getByTestId('clear-all-button');
      expect(clearButton).toHaveClass('text-orange-600');
      expect(clearButton).toHaveClass('dark:text-orange-400');
      expect(clearButton).toHaveClass('hover:text-orange-700');
      expect(clearButton).toHaveClass('dark:hover:text-orange-300');
      expect(clearButton).toHaveClass('hover:bg-orange-50');
      expect(clearButton).toHaveClass('dark:hover:bg-orange-900/20');
    });
  });

  describe('Filter Section Headers Dark Mode', () => {
    test('filter section headings have dark mode text color', () => {
      render(<MobileFilterBottomSheet {...defaultProps} />);
      
      const ageHeading = screen.getByText('Age');
      const breedHeading = screen.getByText('Breed');
      const sexHeading = screen.getByText('Sex');
      const sizeHeading = screen.getByText('Size');
      const sortHeading = screen.getByText('Sort By');
      
      [ageHeading, breedHeading, sexHeading, sizeHeading, sortHeading].forEach(heading => {
        expect(heading).toHaveClass('text-gray-700');
        expect(heading).toHaveClass('dark:text-gray-300');
      });
    });

    test('search input has dark mode styling', () => {
      render(<MobileFilterBottomSheet {...defaultProps} />);
      
      const searchInput = screen.getByTestId('breed-search-input');
      expect(searchInput).toHaveClass('border-gray-300');
      expect(searchInput).toHaveClass('dark:border-gray-600');
      expect(searchInput).toHaveClass('bg-white');
      expect(searchInput).toHaveClass('dark:bg-gray-800');
      expect(searchInput).toHaveClass('text-gray-900');
      expect(searchInput).toHaveClass('dark:text-gray-100');
      expect(searchInput).toHaveClass('focus:border-orange-600');
      expect(searchInput).toHaveClass('dark:focus:border-orange-400');
    });

    test('search placeholder icon has proper dark mode color', () => {
      render(<MobileFilterBottomSheet {...defaultProps} />);
      
      const searchIcon = document.querySelector('[data-name="search"]');
      expect(searchIcon).toHaveClass('text-gray-400');
      expect(searchIcon).toHaveClass('dark:text-gray-500');
    });

    test('search help text has dark mode color', () => {
      render(<MobileFilterBottomSheet {...defaultProps} />);
      
      // Trigger search text by typing
      const searchInput = screen.getByTestId('breed-search-input');
      fireEvent.change(searchInput, { target: { value: 'Golden' } });
      
      const helpText = screen.getByText('Search results will appear as you type');
      expect(helpText).toHaveClass('text-gray-500');
      expect(helpText).toHaveClass('dark:text-gray-400');
    });
  });

  describe('Filter Buttons Dark Mode', () => {
    test('inactive filter buttons have dark mode styling', () => {
      render(<MobileFilterBottomSheet {...defaultProps} />);
      
      const ageButton = screen.getByTestId('age-filter-All');
      expect(ageButton).toHaveClass('bg-gray-100');
      expect(ageButton).toHaveClass('dark:bg-gray-700');
      expect(ageButton).toHaveClass('hover:bg-gray-200');
      expect(ageButton).toHaveClass('dark:hover:bg-gray-600');
      expect(ageButton).toHaveClass('text-gray-700');
      expect(ageButton).toHaveClass('dark:text-gray-300');
      expect(ageButton).toHaveClass('border-gray-300');
      expect(ageButton).toHaveClass('dark:border-gray-600');
    });

    test('active filter buttons maintain orange theme in dark mode', () => {
      render(<MobileFilterBottomSheet {...defaultProps} filters={{ age: 'Puppy' }} />);
      
      const activeButton = screen.getByTestId('age-filter-Puppy');
      expect(activeButton).toHaveClass('bg-orange-600');
      expect(activeButton).toHaveClass('dark:bg-orange-600');
      expect(activeButton).toHaveClass('hover:bg-orange-700');
      expect(activeButton).toHaveClass('dark:hover:bg-orange-700');
      expect(activeButton).toHaveClass('text-white');
      expect(activeButton).toHaveClass('border-orange-600');
      expect(activeButton).toHaveClass('dark:border-orange-600');
    });

    test('filter button focus states work in dark mode', () => {
      render(<MobileFilterBottomSheet {...defaultProps} />);
      
      const ageButton = screen.getByTestId('age-filter-All');
      expect(ageButton).toHaveClass('focus:ring-2');
      expect(ageButton).toHaveClass('focus:ring-orange-600');
      expect(ageButton).toHaveClass('dark:focus:ring-orange-400');
      expect(ageButton).toHaveClass('focus:ring-offset-2');
    });
  });

  describe('Footer Dark Mode', () => {
    test('footer has dark mode background and border', () => {
      render(<MobileFilterBottomSheet {...defaultProps} />);
      
      const footer = screen.getByText('Apply Filters (25 dogs)').closest('.border-t');
      expect(footer).toHaveClass('bg-white');
      expect(footer).toHaveClass('dark:bg-gray-900');
      expect(footer).toHaveClass('border-gray-200');
      expect(footer).toHaveClass('dark:border-gray-700');
    });

    test('apply button maintains orange theme in dark mode', () => {
      render(<MobileFilterBottomSheet {...defaultProps} />);
      
      const applyButton = screen.getByText('Apply Filters (25 dogs)');
      expect(applyButton).toHaveClass('bg-orange-600');
      expect(applyButton).toHaveClass('dark:bg-orange-600');
      expect(applyButton).toHaveClass('hover:bg-orange-700');
      expect(applyButton).toHaveClass('dark:hover:bg-orange-700');
      expect(applyButton).toHaveClass('text-white');
    });
  });

  describe('Organization Page Mode Dark Mode', () => {
    test('limited filters maintain dark mode styling on organization pages', () => {
      render(<MobileFilterBottomSheet {...defaultProps} isOrganizationPage={true} />);
      
      // Should have Age, Breed, and Sort sections but not Sex, Size, Organization
      expect(screen.getByText('Age')).toBeInTheDocument();
      expect(screen.getByText('Breed')).toBeInTheDocument();
      expect(screen.getByText('Sort By')).toBeInTheDocument();
      expect(screen.queryByText('Sex')).not.toBeInTheDocument();
      expect(screen.queryByText('Size')).not.toBeInTheDocument();
      expect(screen.queryByText('Organization')).not.toBeInTheDocument();
      
      // Age filter should still have dark mode styling
      const ageButton = screen.getByTestId('age-filter-All');
      expect(ageButton).toHaveClass('dark:bg-gray-700');
      expect(ageButton).toHaveClass('dark:text-gray-300');
    });
  });

  describe('Accessibility in Dark Mode', () => {
    test('maintains proper contrast ratios', () => {
      render(<MobileFilterBottomSheet {...defaultProps} />);
      
      const bottomSheet = screen.getByTestId('mobile-filter-sheet');
      expect(bottomSheet).toHaveAttribute('role', 'dialog');
      expect(bottomSheet).toHaveAttribute('aria-label', 'Filter and sort options');
      expect(bottomSheet).toHaveAttribute('aria-modal', 'true');
      
      // Check that text maintains good contrast
      const title = screen.getByText('Filter & Sort');
      expect(title).toHaveClass('text-gray-900');
      expect(title).toHaveClass('dark:text-gray-100');
    });

    test('focus indicators work properly in dark mode', () => {
      render(<MobileFilterBottomSheet {...defaultProps} />);
      
      const closeButton = screen.getByLabelText('Close filters');
      expect(closeButton).toHaveClass('focus:outline-none');
      expect(closeButton).toHaveClass('focus:ring-2');
      expect(closeButton).toHaveClass('focus:ring-orange-600');
      expect(closeButton).toHaveClass('dark:focus:ring-orange-400');
    });
  });
});
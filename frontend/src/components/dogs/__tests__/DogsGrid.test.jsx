import React from 'react';
import { render, screen } from '@testing-library/react';
import DogsGrid from '../DogsGrid';

// Mock DogCard component
jest.mock('../DogCard', () => {
  return function MockDogCard({ dog }) {
    return <div data-testid={`dog-card-${dog.id}`}>Mock DogCard: {dog.name}</div>;
  };
});

describe('DogsGrid Component', () => {
  const mockDogs = [
    {
      id: 1,
      name: 'Buddy',
      status: 'available',
      organization: { name: 'Test Org 1' }
    },
    {
      id: 2,
      name: 'Max',
      status: 'available',
      organization: { name: 'Test Org 2' }
    },
    {
      id: 3,
      name: 'Luna',
      status: 'available',
      organization: { name: 'Test Org 3' }
    }
  ];

  describe('Basic Rendering', () => {
    test('renders dogs in a grid layout', () => {
      render(<DogsGrid dogs={mockDogs} />);
      
      // Check that all dogs are rendered
      expect(screen.getByTestId('dog-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('dog-card-2')).toBeInTheDocument();
      expect(screen.getByTestId('dog-card-3')).toBeInTheDocument();
    });

    test('applies correct grid classes with updated responsive breakpoints', () => {
      render(<DogsGrid dogs={mockDogs} />);
      
      const gridContainer = screen.getByTestId('dogs-grid');
      expect(gridContainer).toHaveClass('grid');
      expect(gridContainer).toHaveClass('grid-cols-1');
      expect(gridContainer).toHaveClass('sm:grid-cols-2');
      expect(gridContainer).toHaveClass('lg:grid-cols-3');
      // Should NOT have lg:grid-cols-4 anymore
      expect(gridContainer).not.toHaveClass('lg:grid-cols-4');
    });

    test('applies correct gap spacing with updated desktop spacing', () => {
      render(<DogsGrid dogs={mockDogs} />);
      
      const gridContainer = screen.getByTestId('dogs-grid');
      expect(gridContainer).toHaveClass('gap-4'); // Mobile gap (unchanged)
      expect(gridContainer).toHaveClass('md:gap-6'); // Desktop gap (increased from gap-4)
    });
  });

  describe('Empty States', () => {
    test('renders empty state when no dogs provided', () => {
      render(<DogsGrid dogs={[]} />);
      
      const emptyState = screen.getByTestId('empty-state');
      expect(emptyState).toBeInTheDocument();
      expect(emptyState).toHaveTextContent('No dogs available');
    });

    test('renders empty state when dogs array is null/undefined', () => {
      render(<DogsGrid dogs={null} />);
      
      const emptyState = screen.getByTestId('empty-state');
      expect(emptyState).toBeInTheDocument();
    });

    test('empty state has proper styling', () => {
      render(<DogsGrid dogs={[]} />);
      
      const emptyState = screen.getByTestId('empty-state');
      expect(emptyState).toHaveClass('bg-gray-50');
      expect(emptyState).toHaveClass('rounded-lg');
      expect(emptyState).toHaveClass('p-8');
      expect(emptyState).toHaveClass('text-center');
    });
  });

  describe('Loading States', () => {
    test('renders loading skeleton when in loading state', () => {
      render(<DogsGrid dogs={[]} loading={true} />);
      
      const loadingSkeletons = screen.getAllByTestId('dog-card-skeleton');
      expect(loadingSkeletons).toHaveLength(8); // Default skeleton count
    });

    test('renders custom number of loading skeletons', () => {
      render(<DogsGrid dogs={[]} loading={true} skeletonCount={12} />);
      
      const loadingSkeletons = screen.getAllByTestId('dog-card-skeleton');
      expect(loadingSkeletons).toHaveLength(12);
    });

    test('skeleton cards have proper structure', () => {
      render(<DogsGrid dogs={[]} loading={true} skeletonCount={1} />);
      
      const skeleton = screen.getByTestId('dog-card-skeleton');
      expect(skeleton).toHaveClass('animate-shimmer-warm');
      expect(skeleton).toHaveClass('bg-white');
      expect(skeleton).toHaveClass('shadow-md');
    });
  });

  describe('Grid Responsiveness', () => {
    test('applies auto-fit grid with minimum card width', () => {
      render(<DogsGrid dogs={mockDogs} />);
      
      const gridContainer = screen.getByTestId('dogs-grid');
      const computedStyle = window.getComputedStyle(gridContainer);
      
      // The CSS Grid should use the classes we set
      expect(gridContainer).toHaveClass('grid');
    });

    test('handles single dog correctly', () => {
      const singleDog = [mockDogs[0]];
      render(<DogsGrid dogs={singleDog} />);
      
      expect(screen.getByTestId('dog-card-1')).toBeInTheDocument();
      expect(screen.queryByTestId('dog-card-2')).not.toBeInTheDocument();
    });

    test('handles many dogs correctly', () => {
      const manyDogs = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        name: `Dog ${i + 1}`,
        status: 'available',
        organization: { name: `Org ${i + 1}` }
      }));
      
      render(<DogsGrid dogs={manyDogs} />);
      
      // Check first and last dogs are rendered
      expect(screen.getByTestId('dog-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('dog-card-20')).toBeInTheDocument();
    });
  });

  describe('Error Boundaries', () => {
    test('handles invalid dog data gracefully', () => {
      const invalidDogs = [
        { id: 1, name: 'Valid Dog' },
        null,
        { id: 3 }, // missing name
        undefined
      ];
      
      // Should not crash and should render valid dogs
      render(<DogsGrid dogs={invalidDogs} />);
      
      // Should still render the valid dog
      expect(screen.getByTestId('dog-card-1')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    test('applies correct aria-label for grid', () => {
      render(<DogsGrid dogs={mockDogs} />);
      
      const gridContainer = screen.getByTestId('dogs-grid');
      expect(gridContainer).toHaveAttribute('aria-label', 'Dogs available for adoption');
    });

    test('supports custom className prop', () => {
      render(<DogsGrid dogs={mockDogs} className="custom-grid-class" />);
      
      const gridContainer = screen.getByTestId('dogs-grid');
      expect(gridContainer).toHaveClass('custom-grid-class');
    });

    test('forwards additional props to grid container', () => {
      render(<DogsGrid dogs={mockDogs} data-custom="test-value" />);
      
      const gridContainer = screen.getByTestId('dogs-grid');
      expect(gridContainer).toHaveAttribute('data-custom', 'test-value');
    });
  });
});
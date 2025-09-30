// frontend/src/components/home/__tests__/FeaturedDogsSection.test.tsx

import React from 'react';
import { render, screen } from '../../../test-utils';
import FeaturedDogsSection from '../FeaturedDogsSection';

// Mock Next.js Link
jest.mock('next/link', () => {
  return function MockLink({ children, href, ...props }: any) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

// Mock DogCardOptimized component
jest.mock('../../dogs/DogCardOptimized', () => {
  return function MockDogCard({ dog }: any) {
    return (
      <div data-testid={`dog-card-${dog.id}`}>
        {dog.name}
      </div>
    );
  };
});

describe('FeaturedDogsSection', () => {
  const mockDogs = [
    { id: 1, name: 'Bella', breed: 'Golden Retriever' },
    { id: 2, name: 'Max', breed: 'Labrador' },
    { id: 3, name: 'Luna', breed: 'Husky' },
    { id: 4, name: 'Charlie', breed: 'Beagle' },
    { id: 5, name: 'Cooper', breed: 'Poodle' },
    { id: 6, name: 'Lucy', breed: 'Bulldog' },
    { id: 7, name: 'Bailey', breed: 'Shepherd' },
    { id: 8, name: 'Daisy', breed: 'Terrier' },
  ];

  const totalCount = 2500;

  describe('Section Header', () => {
    test('should render section headline', () => {
      render(<FeaturedDogsSection dogs={mockDogs} totalCount={totalCount} />);
      
      expect(screen.getByText('Dogs Waiting for Homes')).toBeInTheDocument();
    });

    test('should render meta text with correct count', () => {
      render(<FeaturedDogsSection dogs={mockDogs} totalCount={totalCount} />);
      
      expect(screen.getByText('Showing 6 of 2,500 available dogs')).toBeInTheDocument();
    });

    test('should format large numbers with commas', () => {
      render(<FeaturedDogsSection dogs={mockDogs} totalCount={3186} />);
      
      expect(screen.getByText('Showing 6 of 3,186 available dogs')).toBeInTheDocument();
    });

    test('should have correct heading styles', () => {
      render(<FeaturedDogsSection dogs={mockDogs} totalCount={totalCount} />);
      
      const heading = screen.getByText('Dogs Waiting for Homes');
      expect(heading).toHaveClass('text-4xl', 'lg:text-5xl', 'font-bold');
    });
  });

  describe('Dogs Grid', () => {
    test('should render exactly 6 dogs', () => {
      render(<FeaturedDogsSection dogs={mockDogs} totalCount={totalCount} />);
      
      const dogCards = screen.getAllByTestId(/dog-card-/);
      expect(dogCards).toHaveLength(6);
    });

    test('should render first 6 dogs from array', () => {
      render(<FeaturedDogsSection dogs={mockDogs} totalCount={totalCount} />);
      
      expect(screen.getByTestId('dog-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('dog-card-2')).toBeInTheDocument();
      expect(screen.getByTestId('dog-card-3')).toBeInTheDocument();
      expect(screen.getByTestId('dog-card-4')).toBeInTheDocument();
      expect(screen.getByTestId('dog-card-5')).toBeInTheDocument();
      expect(screen.getByTestId('dog-card-6')).toBeInTheDocument();
      
      // Should NOT render 7th and 8th dogs
      expect(screen.queryByTestId('dog-card-7')).not.toBeInTheDocument();
      expect(screen.queryByTestId('dog-card-8')).not.toBeInTheDocument();
    });

    test('should handle fewer than 6 dogs gracefully', () => {
      const fewDogs = mockDogs.slice(0, 3);
      render(<FeaturedDogsSection dogs={fewDogs} totalCount={3} />);
      
      const dogCards = screen.getAllByTestId(/dog-card-/);
      expect(dogCards).toHaveLength(3);
    });

    test('should have responsive grid classes', () => {
      const { container } = render(<FeaturedDogsSection dogs={mockDogs} totalCount={totalCount} />);
      
      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('grid-cols-2', 'xl:grid-cols-3', 'gap-6');
    });
  });

  describe('CTA Button', () => {
    test('should render CTA button with correct text', () => {
      render(<FeaturedDogsSection dogs={mockDogs} totalCount={totalCount} />);
      
      const button = screen.getByText('Browse All 2,500 Dogs →');
      expect(button).toBeInTheDocument();
    });

    test('should link to /dogs page', () => {
      render(<FeaturedDogsSection dogs={mockDogs} totalCount={totalCount} />);
      
      const button = screen.getByText('Browse All 2,500 Dogs →');
      const link = button.closest('a');
      expect(link).toHaveAttribute('href', '/dogs');
    });

    test('should format count with commas in button', () => {
      render(<FeaturedDogsSection dogs={mockDogs} totalCount={3186} />);
      
      expect(screen.getByText('Browse All 3,186 Dogs →')).toBeInTheDocument();
    });

    test('should have orange button styling', () => {
      render(<FeaturedDogsSection dogs={mockDogs} totalCount={totalCount} />);
      
      const button = screen.getByText('Browse All 2,500 Dogs →');
      expect(button).toHaveClass('bg-orange-600', 'hover:bg-orange-700', 'text-white');
    });

    test('should be centered', () => {
      const { container } = render(<FeaturedDogsSection dogs={mockDogs} totalCount={totalCount} />);
      
      const buttonContainer = container.querySelector('.text-center:last-child');
      expect(buttonContainer).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    test('should have section padding', () => {
      const { container } = render(<FeaturedDogsSection dogs={mockDogs} totalCount={totalCount} />);
      
      const section = container.querySelector('section');
      expect(section).toHaveClass('py-24');
    });

    test('should have max-width container', () => {
      const { container } = render(<FeaturedDogsSection dogs={mockDogs} totalCount={totalCount} />);
      
      const innerDiv = container.querySelector('.max-w-7xl');
      expect(innerDiv).toHaveClass('mx-auto', 'px-4', 'sm:px-6', 'lg:px-8');
    });

    test('should have 2 columns on tablet, 3 on desktop', () => {
      const { container } = render(<FeaturedDogsSection dogs={mockDogs} totalCount={totalCount} />);
      
      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('grid-cols-2', 'xl:grid-cols-3');
    });
  });

  describe('Dark Mode', () => {
    test('should have dark mode classes', () => {
      const { container } = render(<FeaturedDogsSection dogs={mockDogs} totalCount={totalCount} />);
      
      const section = container.querySelector('section');
      expect(section).toHaveClass('bg-white', 'dark:bg-gray-900');
    });

    test('should have dark mode text colors', () => {
      render(<FeaturedDogsSection dogs={mockDogs} totalCount={totalCount} />);
      
      const heading = screen.getByText('Dogs Waiting for Homes');
      expect(heading).toHaveClass('text-gray-900', 'dark:text-white');
      
      const subtitle = screen.getByText(/Showing 6 of/);
      expect(subtitle).toHaveClass('text-gray-600', 'dark:text-gray-400');
    });
  });

  describe('Accessibility', () => {
    test('should use semantic section element', () => {
      const { container } = render(<FeaturedDogsSection dogs={mockDogs} totalCount={totalCount} />);
      
      const section = container.querySelector('section');
      expect(section).toBeInTheDocument();
    });

    test('should have aria-labelledby on section', () => {
      const { container } = render(<FeaturedDogsSection dogs={mockDogs} totalCount={totalCount} />);
      
      const section = container.querySelector('section');
      expect(section).toHaveAttribute('aria-labelledby', 'featured-dogs-heading');
    });

    test('should have id on h2 for aria-labelledby', () => {
      render(<FeaturedDogsSection dogs={mockDogs} totalCount={totalCount} />);
      
      const h2 = screen.getByRole('heading', { level: 2 });
      expect(h2).toHaveAttribute('id', 'featured-dogs-heading');
    });

    test('should have proper heading hierarchy', () => {
      render(<FeaturedDogsSection dogs={mockDogs} totalCount={totalCount} />);
      
      const h2 = screen.getByRole('heading', { level: 2 });
      expect(h2).toHaveTextContent('Dogs Waiting for Homes');
    });

    test('should have clickable CTA link', () => {
      render(<FeaturedDogsSection dogs={mockDogs} totalCount={totalCount} />);
      
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/dogs');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty dogs array', () => {
      render(<FeaturedDogsSection dogs={[]} totalCount={0} />);
      
      const dogCards = screen.queryAllByTestId(/dog-card-/);
      expect(dogCards).toHaveLength(0);
      
      expect(screen.getByText('Showing 6 of 0 available dogs')).toBeInTheDocument();
    });

    test('should handle zero total count', () => {
      render(<FeaturedDogsSection dogs={mockDogs} totalCount={0} />);
      
      expect(screen.getByText('Browse All 0 Dogs →')).toBeInTheDocument();
    });

    test('should slice even if array has exactly 6 dogs', () => {
      const exactSix = mockDogs.slice(0, 6);
      render(<FeaturedDogsSection dogs={exactSix} totalCount={6} />);
      
      const dogCards = screen.getAllByTestId(/dog-card-/);
      expect(dogCards).toHaveLength(6);
    });
  });
});
// frontend/src/components/home/__tests__/PlatformCapabilities.test.tsx

import React from 'react';
import { render, screen } from '../../../test-utils';
import PlatformCapabilities from '../PlatformCapabilities';

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

describe('PlatformCapabilities', () => {
  describe('Section Header', () => {
    test('should render section headline', () => {
      render(<PlatformCapabilities />);
      
      expect(screen.getByText('Three Ways to Find Your Dog')).toBeInTheDocument();
    });

    test('should render section subheading', () => {
      render(<PlatformCapabilities />);
      
      expect(screen.getByText('Choose the approach that fits your search style')).toBeInTheDocument();
    });

    test('should have correct styling for headline', () => {
      render(<PlatformCapabilities />);
      
      const headline = screen.getByText('Three Ways to Find Your Dog');
      expect(headline).toHaveClass('text-4xl', 'lg:text-5xl', 'font-bold');
    });
  });

  describe('Capability Cards', () => {
    test('should render 3 capability cards', () => {
      render(<PlatformCapabilities />);
      
      expect(screen.getByText('Advanced Search')).toBeInTheDocument();
      expect(screen.getByText('Match by Personality')).toBeInTheDocument();
      expect(screen.getByText('Quick Discovery')).toBeInTheDocument();
    });

    test('should render Advanced Search card with correct content', () => {
      render(<PlatformCapabilities />);
      
      expect(screen.getByText('Advanced Search')).toBeInTheDocument();
      expect(screen.getByText(/Filter dogs by breed, age, size/)).toBeInTheDocument();
      expect(screen.getByText('50+ breeds · 13 rescues · 9 countries')).toBeInTheDocument();
      expect(screen.getByText('Start Searching →')).toBeInTheDocument();
    });

    test('should render Match by Personality card with correct content', () => {
      render(<PlatformCapabilities />);
      
      expect(screen.getByText('Match by Personality')).toBeInTheDocument();
      expect(screen.getByText(/Every breed analyzed for traits/)).toBeInTheDocument();
      expect(screen.getByText('Data from 2,500+ profiles')).toBeInTheDocument();
      expect(screen.getByText('Explore Breeds →')).toBeInTheDocument();
    });

    test('should render Quick Discovery card with correct content', () => {
      render(<PlatformCapabilities />);
      
      expect(screen.getByText('Quick Discovery')).toBeInTheDocument();
      expect(screen.getByText(/Not sure what you want/)).toBeInTheDocument();
      expect(screen.getByText('Updated twice weekly')).toBeInTheDocument();
      expect(screen.getByText('Start Swiping →')).toBeInTheDocument();
    });

    test('should have correct links for each card', () => {
      render(<PlatformCapabilities />);
      
      const searchButton = screen.getByText('Start Searching →');
      const breedsButton = screen.getByText('Explore Breeds →');
      const swipeButton = screen.getByText('Start Swiping →');
      
      expect(searchButton.closest('a')).toHaveAttribute('href', '/dogs');
      expect(breedsButton.closest('a')).toHaveAttribute('href', '/breeds');
      expect(swipeButton.closest('a')).toHaveAttribute('href', '/swipe');
    });
  });

  describe('Preview Components', () => {
    test('should render AdvancedSearchPreview elements', () => {
      render(<PlatformCapabilities />);
      
      expect(screen.getByPlaceholderText('Search breeds...')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Location')).toBeInTheDocument();
      expect(screen.getByText('Small')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument();
      expect(screen.getByText('Large')).toBeInTheDocument();
      expect(screen.getByText('Puppy')).toBeInTheDocument();
      expect(screen.getByText('Young')).toBeInTheDocument();
      expect(screen.getByText('Adult')).toBeInTheDocument();
    });

    test('should render PersonalityBarsPreview with all traits', () => {
      render(<PlatformCapabilities />);
      
      expect(screen.getByText('Affectionate')).toBeInTheDocument();
      expect(screen.getByText('78%')).toBeInTheDocument();
      expect(screen.getByText('Energetic')).toBeInTheDocument();
      expect(screen.getByText('65%')).toBeInTheDocument();
      expect(screen.getByText('Intelligent')).toBeInTheDocument();
      expect(screen.getByText('82%')).toBeInTheDocument();
      expect(screen.getByText('Trainability')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    test('should render SwipePreview elements', () => {
      render(<PlatformCapabilities />);
      
      expect(screen.getByText('Bella')).toBeInTheDocument();
      expect(screen.getByText('Golden Retriever')).toBeInTheDocument();
      expect(screen.getByText('🐕')).toBeInTheDocument();
      expect(screen.getByText('👎')).toBeInTheDocument();
      expect(screen.getByText('❤️')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    test('should have responsive grid classes', () => {
      const { container } = render(<PlatformCapabilities />);
      
      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('grid-cols-1', 'xl:grid-cols-3');
    });

    test('should have responsive padding', () => {
      const { container } = render(<PlatformCapabilities />);
      
      const section = container.querySelector('section');
      expect(section).toHaveClass('py-24');
    });

    test('should have responsive max-width container', () => {
      const { container } = render(<PlatformCapabilities />);
      
      const innerDiv = container.querySelector('.max-w-7xl');
      expect(innerDiv).toHaveClass('mx-auto', 'px-4', 'sm:px-6', 'lg:px-8');
    });
  });

  describe('Dark Mode', () => {
    test('should have dark mode background', () => {
      const { container } = render(<PlatformCapabilities />);
      
      const section = container.querySelector('section');
      expect(section).toHaveClass('bg-[#FFF8F0]', 'dark:bg-gray-900');
    });

    test('should have dark mode text colors', () => {
      render(<PlatformCapabilities />);
      
      const headline = screen.getByText('Three Ways to Find Your Dog');
      expect(headline).toHaveClass('text-gray-900', 'dark:text-white');
      
      const subheading = screen.getByText('Choose the approach that fits your search style');
      expect(subheading).toHaveClass('text-gray-600', 'dark:text-gray-400');
    });
  });

  describe('Accessibility', () => {
    test('should use semantic section element', () => {
      const { container } = render(<PlatformCapabilities />);
      
      const section = container.querySelector('section');
      expect(section).toBeInTheDocument();
    });

    test('should have proper heading hierarchy', () => {
      render(<PlatformCapabilities />);
      
      const h2 = screen.getByRole('heading', { level: 2 });
      expect(h2).toHaveTextContent('Three Ways to Find Your Dog');
    });

    test('should have clickable card links', () => {
      render(<PlatformCapabilities />);
      
      const links = screen.getAllByRole('link');
      expect(links.length).toBeGreaterThanOrEqual(3);
      
      links.forEach(link => {
        expect(link).toHaveAttribute('href');
      });
    });
  });

  describe('Card Hover States', () => {
    test('should have hover transition classes on cards', () => {
      const { container } = render(<PlatformCapabilities />);
      
      const cards = container.querySelectorAll('.group > div');
      cards.forEach(card => {
        expect(card).toHaveClass('transition-all', 'duration-300');
      });
    });
  });
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import DogCardSkeleton from '../DogCardSkeleton';

describe('DogCardSkeleton', () => {
  describe('Basic Rendering', () => {
    it('renders skeleton card with all essential elements', () => {
      render(<DogCardSkeleton />);
      
      const skeleton = screen.getByTestId('dog-card-skeleton');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass('animate-pulse');
    });

    it('has correct card structure matching DogCard', () => {
      render(<DogCardSkeleton />);
      
      // Check for image skeleton
      const imageSkeleton = screen.getByTestId('skeleton-image');
      expect(imageSkeleton).toBeInTheDocument();
      expect(imageSkeleton).toHaveClass('h-50', 'sm:h-50', 'md:h-60');
      
      // Check for content skeleton
      const contentSkeleton = screen.getByTestId('skeleton-content');
      expect(contentSkeleton).toBeInTheDocument();
      
      // Check for footer skeleton
      const footerSkeleton = screen.getByTestId('skeleton-footer');
      expect(footerSkeleton).toBeInTheDocument();
    });
  });

  describe('Animation and Styling', () => {
    it('has pulse animation applied', () => {
      render(<DogCardSkeleton />);
      
      const skeleton = screen.getByTestId('dog-card-skeleton');
      expect(skeleton).toHaveClass('animate-pulse');
    });

    it('uses gray-200 color for skeleton elements', () => {
      render(<DogCardSkeleton />);
      
      // Check specific skeleton elements that should have bg-gray-200
      const imageSkeleton = screen.getByTestId('skeleton-image');
      const nameSkeleton = screen.getByTestId('skeleton-name');
      const buttonSkeleton = screen.getByTestId('skeleton-button');
      
      expect(imageSkeleton).toHaveClass('bg-gray-200');
      expect(nameSkeleton).toHaveClass('bg-gray-200');
      expect(buttonSkeleton).toHaveClass('bg-gray-200');
    });

    it('matches DogCard responsive heights', () => {
      render(<DogCardSkeleton />);
      
      const imageSkeleton = screen.getByTestId('skeleton-image');
      expect(imageSkeleton).toHaveClass('h-50', 'sm:h-50', 'md:h-60');
    });
  });

  describe('Structure Elements', () => {
    it('renders name skeleton with correct width', () => {
      render(<DogCardSkeleton />);
      
      const nameSkeleton = screen.getByTestId('skeleton-name');
      expect(nameSkeleton).toHaveClass('w-3/4');
    });

    it('renders age/gender skeleton elements', () => {
      render(<DogCardSkeleton />);
      
      const ageGenderRow = screen.getByTestId('skeleton-age-gender');
      expect(ageGenderRow).toBeInTheDocument();
      expect(ageGenderRow).toHaveClass('flex', 'items-center', 'gap-3');
    });

    it('renders breed skeleton', () => {
      render(<DogCardSkeleton />);
      
      const breedSkeleton = screen.getByTestId('skeleton-breed');
      expect(breedSkeleton).toBeInTheDocument();
      expect(breedSkeleton).toHaveClass('w-1/2');
    });

    it('renders location skeleton with icon', () => {
      render(<DogCardSkeleton />);
      
      const locationSkeleton = screen.getByTestId('skeleton-location');
      expect(locationSkeleton).toBeInTheDocument();
      expect(locationSkeleton).toHaveClass('flex', 'items-center', 'gap-1');
    });

    it('renders ships-to skeleton', () => {
      render(<DogCardSkeleton />);
      
      const shipsToSkeleton = screen.getByTestId('skeleton-ships-to');
      expect(shipsToSkeleton).toBeInTheDocument();
    });

    it('renders button skeleton', () => {
      render(<DogCardSkeleton />);
      
      const buttonSkeleton = screen.getByTestId('skeleton-button');
      expect(buttonSkeleton).toBeInTheDocument();
      expect(buttonSkeleton).toHaveClass('h-10', 'w-full');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<DogCardSkeleton />);
      
      const skeleton = screen.getByTestId('dog-card-skeleton');
      expect(skeleton).toHaveAttribute('aria-label', 'Loading dog information');
      expect(skeleton).toHaveAttribute('role', 'status');
    });

    it('has proper semantic structure', () => {
      render(<DogCardSkeleton />);
      
      const skeleton = screen.getByTestId('dog-card-skeleton');
      expect(skeleton.tagName).toBe('DIV');
      
      // Should have proper card structure
      expect(skeleton).toHaveClass('overflow-hidden', 'flex', 'flex-col');
    });
  });

  describe('Responsive Design', () => {
    it('maintains proper spacing and layout', () => {
      render(<DogCardSkeleton />);
      
      const contentSkeleton = screen.getByTestId('skeleton-content');
      expect(contentSkeleton).toHaveClass('p-4', 'space-y-3');
      
      const footerSkeleton = screen.getByTestId('skeleton-footer');
      expect(footerSkeleton).toHaveClass('p-4', 'pt-0');
    });

    it('uses proper shadow and styling to match DogCard', () => {
      render(<DogCardSkeleton />);
      
      const skeleton = screen.getByTestId('dog-card-skeleton');
      expect(skeleton).toHaveClass('shadow-md', 'bg-white', 'animate-pulse');
    });
  });

  describe('Badge Skeletons', () => {
    it('renders NEW badge skeleton', () => {
      render(<DogCardSkeleton />);
      
      const newBadgeSkeleton = screen.getByTestId('skeleton-new-badge');
      expect(newBadgeSkeleton).toBeInTheDocument();
      expect(newBadgeSkeleton).toHaveClass('absolute', 'top-2', 'left-2');
    });

    it('renders organization badge skeleton', () => {
      render(<DogCardSkeleton />);
      
      const orgBadgeSkeleton = screen.getByTestId('skeleton-org-badge');
      expect(orgBadgeSkeleton).toBeInTheDocument();
      expect(orgBadgeSkeleton).toHaveClass('absolute', 'bottom-2', 'right-2');
    });
  });
});
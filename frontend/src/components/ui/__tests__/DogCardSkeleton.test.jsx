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
      expect(skeleton).toHaveClass('animate-shimmer-premium');
    });

    it('has correct card structure matching DogCard', () => {
      render(<DogCardSkeleton />);
      
      // Check for image skeleton
      const imageSkeleton = screen.getByTestId('skeleton-image');
      expect(imageSkeleton).toBeInTheDocument();
      expect(imageSkeleton).toHaveClass('aspect-[4/3]');
      
      // Check for content skeleton
      const contentSkeleton = screen.getByTestId('skeleton-content');
      expect(contentSkeleton).toBeInTheDocument();
      
      // Check for footer skeleton
      const footerSkeleton = screen.getByTestId('skeleton-footer');
      expect(footerSkeleton).toBeInTheDocument();
    });
  });

  describe('Animation and Styling', () => {
    it('has enhanced shimmer animation applied', () => {
      render(<DogCardSkeleton />);
      
      const skeleton = screen.getByTestId('dog-card-skeleton');
      expect(skeleton).toHaveClass('animate-shimmer-premium');
    });

    it('uses enhanced skeleton classes for shimmer elements', () => {
      render(<DogCardSkeleton />);
      
      // Check specific skeleton elements that should have skeleton class
      const imageSkeleton = screen.getByTestId('skeleton-image');
      const nameSkeleton = screen.getByTestId('skeleton-name');
      const buttonSkeleton = screen.getByTestId('skeleton-button');
      
      expect(imageSkeleton).toHaveClass('skeleton');
      expect(nameSkeleton).toHaveClass('skeleton');
      expect(buttonSkeleton).toHaveClass('skeleton');
    });

    it('matches DogCard aspect ratio (4:3)', () => {
      render(<DogCardSkeleton />);
      
      const imageSkeleton = screen.getByTestId('skeleton-image');
      expect(imageSkeleton).toHaveClass('aspect-[4/3]');
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
      expect(contentSkeleton).toHaveClass('p-5', 'space-y-3');
      
      const footerSkeleton = screen.getByTestId('skeleton-footer');
      expect(footerSkeleton).toHaveClass('p-5', 'pt-0');
    });

    it('uses proper shadow and styling to match DogCard', () => {
      render(<DogCardSkeleton />);
      
      const skeleton = screen.getByTestId('dog-card-skeleton');
      expect(skeleton).toHaveClass('shadow-sm', 'bg-card', 'animate-shimmer-premium');
    });
  });

  describe('Badge Skeletons', () => {
    it('renders NEW badge skeleton', () => {
      render(<DogCardSkeleton />);
      
      const newBadgeSkeleton = screen.getByTestId('skeleton-new-badge');
      expect(newBadgeSkeleton).toBeInTheDocument();
      expect(newBadgeSkeleton).toHaveClass('absolute', 'top-2', 'left-2');
    });

    it('does not render organization badge skeleton (removed in Session 2)', () => {
      render(<DogCardSkeleton />);
      
      // Organization badge skeleton should not exist since we removed it from DogCard
      const orgBadgeSkeleton = screen.queryByTestId('skeleton-org-badge');
      expect(orgBadgeSkeleton).not.toBeInTheDocument();
    });
  });

  describe('Session 3: Enhanced Skeleton Animation', () => {
    it('skeleton image uses 4:3 aspect ratio matching DogCard', () => {
      render(<DogCardSkeleton />);
      
      const skeletonImage = screen.getByTestId('skeleton-image');
      
      // Should use aspect-[4/3] instead of fixed height classes
      expect(skeletonImage).toHaveClass('aspect-[4/3]');
      expect(skeletonImage).not.toHaveClass('h-50');
      expect(skeletonImage).not.toHaveClass('h-60');
      expect(skeletonImage).not.toHaveClass('md:h-60');
    });

    it('skeleton has enhanced shimmer animation with orange tint', () => {
      render(<DogCardSkeleton />);
      
      const skeleton = screen.getByTestId('dog-card-skeleton');
      
      // Should have premium shimmer animation instead of basic pulse
      expect(skeleton).toHaveClass('animate-shimmer-premium');
      expect(skeleton).not.toHaveClass('animate-pulse');
    });

    it('skeleton image container matches DogCard structure exactly', () => {
      render(<DogCardSkeleton />);
      
      const skeletonImage = screen.getByTestId('skeleton-image');
      
      // Should match DogCard image container classes
      expect(skeletonImage).toHaveClass('w-full');
      expect(skeletonImage).toHaveClass('aspect-[4/3]');
      expect(skeletonImage).toHaveClass('skeleton');
      expect(skeletonImage).toHaveClass('relative');
    });

    it('skeleton maintains smooth loading animation timing', () => {
      render(<DogCardSkeleton />);
      
      const skeleton = screen.getByTestId('dog-card-skeleton');
      
      // Should have the premium shimmer animation which has proper timing
      expect(skeleton).toHaveClass('animate-shimmer-premium');
      
      // Verify the structure allows for proper shimmer effect
      expect(skeleton).toHaveClass('overflow-hidden');
    });

    it('skeleton respects reduced motion preferences', () => {
      // Mock prefers-reduced-motion: reduce
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
        })),
      });

      render(<DogCardSkeleton />);
      
      const skeleton = screen.getByTestId('dog-card-skeleton');
      
      // Even with reduced motion, the classes should be present
      // The CSS handles disabling animations via media queries
      expect(skeleton).toHaveClass('animate-shimmer-premium');
    });

    it('skeleton dimensions exactly match enhanced DogCard layout', () => {
      render(<DogCardSkeleton />);
      
      const skeleton = screen.getByTestId('dog-card-skeleton');
      const skeletonContent = screen.getByTestId('skeleton-content');
      const skeletonFooter = screen.getByTestId('skeleton-footer');
      
      // Should match DogCard structure
      expect(skeleton).toHaveClass('flex');
      expect(skeleton).toHaveClass('flex-col');
      expect(skeleton).toHaveClass('h-full');
      
      // Content padding should match DogCard (p-5)
      expect(skeletonContent).toHaveClass('p-5');
      expect(skeletonFooter).toHaveClass('p-5');
      expect(skeletonFooter).toHaveClass('pt-0');
    });
  });

  describe('Session 6: Enhanced Loading States & Transitions', () => {
    it('has premium shimmer animation with enhanced orange-tinted effect', () => {
      render(<DogCardSkeleton />);
      
      const skeleton = screen.getByTestId('dog-card-skeleton');
      
      // Should have enhanced shimmer with premium effect
      expect(skeleton).toHaveClass('animate-shimmer-premium');
      expect(skeleton).not.toHaveClass('animate-shimmer-warm');
    });

    it('skeleton elements have enhanced shimmer classes', () => {
      render(<DogCardSkeleton />);
      
      // All gray skeleton elements should have shimmer class for coordinated animation
      const imageSkeleton = screen.getByTestId('skeleton-image');
      const nameSkeleton = screen.getByTestId('skeleton-name');
      const buttonSkeleton = screen.getByTestId('skeleton-button');
      
      expect(imageSkeleton).toHaveClass('skeleton');
      expect(nameSkeleton).toHaveClass('skeleton');
      expect(buttonSkeleton).toHaveClass('skeleton');
    });

    it('supports staggered animation delay prop', () => {
      const { rerender } = render(<DogCardSkeleton animationDelay={100} />);
      
      const skeleton = screen.getByTestId('dog-card-skeleton');
      expect(skeleton).toHaveStyle('animation-delay: 100ms');
      
      // Test different delay
      rerender(<DogCardSkeleton animationDelay={250} />);
      expect(skeleton).toHaveStyle('animation-delay: 250ms');
    });

    it('includes all elements from current DogCard structure', () => {
      render(<DogCardSkeleton />);
      
      // Should have all skeleton elements that match DogCard
      expect(screen.getByTestId('skeleton-image')).toBeInTheDocument();
      expect(screen.getByTestId('skeleton-new-badge')).toBeInTheDocument();
      expect(screen.getByTestId('skeleton-name')).toBeInTheDocument();
      expect(screen.getByTestId('skeleton-age-gender')).toBeInTheDocument();
      expect(screen.getByTestId('skeleton-breed')).toBeInTheDocument();
      expect(screen.getByTestId('skeleton-location')).toBeInTheDocument();
      expect(screen.getByTestId('skeleton-ships-to')).toBeInTheDocument();
      expect(screen.getByTestId('skeleton-button')).toBeInTheDocument();
    });

    it('maintains high performance with will-change optimization', () => {
      render(<DogCardSkeleton />);
      
      const skeleton = screen.getByTestId('dog-card-skeleton');
      expect(skeleton).toHaveClass('will-change-transform');
    });

    it('has proper loading transition timing', () => {
      render(<DogCardSkeleton />);
      
      const skeleton = screen.getByTestId('dog-card-skeleton');
      
      // Should have fade-in timing for smooth loading transitions
      expect(skeleton).toHaveClass('animate-fade-in');
      expect(skeleton).toHaveClass('duration-300');
    });
  });
});
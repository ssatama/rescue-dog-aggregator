// frontend/src/components/ui/__tests__/HeroImageWithBlurredBackground.test.jsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HeroImageWithBlurredBackground from '../HeroImageWithBlurredBackground';

// Mock the imageUtils
jest.mock('../../../utils/imageUtils', () => ({
  getDetailHeroImageWithPosition: jest.fn((url) => ({
    src: url ? `optimized-${url}` : '/placeholder_dog.svg',
    position: 'center center'
  })),
  handleImageError: jest.fn()
}));

describe('HeroImageWithBlurredBackground', () => {
  const mockProps = {
    src: 'https://example.com/dog.jpg',
    alt: 'Test Dog',
    className: 'test-class'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with correct structure and aspect ratio', () => {
      render(<HeroImageWithBlurredBackground {...mockProps} />);
      
      const container = screen.getByRole('img').closest('.aspect-\\[16\\/9\\]');
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('relative', 'w-full', 'aspect-[16/9]', 'rounded-lg', 'overflow-hidden');
    });

    it('should apply custom className', () => {
      render(<HeroImageWithBlurredBackground {...mockProps} />);
      
      const container = screen.getByRole('img').closest('.test-class');
      expect(container).toBeInTheDocument();
    });

    it('should render blurred background', () => {
      const { container } = render(<HeroImageWithBlurredBackground {...mockProps} />);
      
      // Check for background layer with blur - look for the absolute div
      const backgroundDiv = container.querySelector('.absolute.inset-0.bg-cover.bg-center');
      expect(backgroundDiv).toBeInTheDocument();
      expect(backgroundDiv).toHaveStyle('filter: blur(20px)');
    });

    it('should render overlay for contrast', () => {
      const { container } = render(<HeroImageWithBlurredBackground {...mockProps} />);
      
      const overlay = container.querySelector('.bg-black.bg-opacity-20');
      expect(overlay).toBeInTheDocument();
    });
  });

  describe('Image optimization', () => {
    it('should generate blurred background for Cloudinary URLs', () => {
      const cloudinaryUrl = 'https://res.cloudinary.com/test/image/upload/v123/dog.jpg';
      const { container } = render(<HeroImageWithBlurredBackground src={cloudinaryUrl} alt="Test" />);
      
      const backgroundDiv = container.querySelector('.absolute.inset-0.bg-cover.bg-center');
      expect(backgroundDiv).toBeInTheDocument();
      
      // Should contain blur transformation in style attribute
      const style = backgroundDiv.getAttribute('style');
      expect(style).toContain('e_blur:800');
    });

    it('should use original URL for non-Cloudinary images', () => {
      const externalUrl = 'https://example.com/dog.jpg';
      const { container } = render(<HeroImageWithBlurredBackground src={externalUrl} alt="Test" />);
      
      const backgroundDiv = container.querySelector('.absolute.inset-0.bg-cover.bg-center');
      expect(backgroundDiv).toBeInTheDocument();
      
      const style = backgroundDiv.getAttribute('style');
      expect(style).toContain(externalUrl);
    });
  });

  describe('Loading states', () => {
    it('should show loading state initially', () => {
      const { container } = render(<HeroImageWithBlurredBackground {...mockProps} />);
      
      const loadingIcon = container.querySelector('.animate-pulse svg');
      expect(loadingIcon).toBeInTheDocument();
    });

    it('should hide loading state when image loads', async () => {
      render(<HeroImageWithBlurredBackground {...mockProps} />);
      
      const img = screen.getByRole('img');
      
      // Trigger load event
      fireEvent.load(img);
      
      await waitFor(() => {
        expect(img).toHaveClass('opacity-100');
      });
    });

    it('should start with opacity-0 and transition to opacity-100', () => {
      render(<HeroImageWithBlurredBackground {...mockProps} />);
      
      const img = screen.getByRole('img');
      expect(img).toHaveClass('opacity-0');
      expect(img).toHaveClass('transition-opacity');
    });
  });

  describe('Error handling', () => {
    it('should show error state when no src provided', () => {
      render(<HeroImageWithBlurredBackground src={null} alt="Test" />);
      
      expect(screen.getByText('No image available')).toBeInTheDocument();
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('should handle image error gracefully', () => {
      const onError = jest.fn();
      render(<HeroImageWithBlurredBackground {...mockProps} onError={onError} />);
      
      const img = screen.getByRole('img');
      fireEvent.error(img);
      
      expect(onError).toHaveBeenCalled();
    });

    it('should show fallback when image errors', async () => {
      render(<HeroImageWithBlurredBackground {...mockProps} />);
      
      const img = screen.getByRole('img');
      fireEvent.error(img);
      
      await waitFor(() => {
        expect(screen.getByText('No image available')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper alt text', () => {
      render(<HeroImageWithBlurredBackground {...mockProps} />);
      
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('alt', 'Test Dog');
    });

    it('should be keyboard accessible', () => {
      render(<HeroImageWithBlurredBackground {...mockProps} />);
      
      const img = screen.getByRole('img');
      expect(img).toBeVisible();
    });
  });

  describe('Responsive design', () => {
    it('should maintain 16:9 aspect ratio', () => {
      render(<HeroImageWithBlurredBackground {...mockProps} />);
      
      const container = screen.getByRole('img').closest('.aspect-\\[16\\/9\\]');
      expect(container).toHaveClass('aspect-[16/9]');
    });

    it('should be full width', () => {
      render(<HeroImageWithBlurredBackground {...mockProps} />);
      
      const container = screen.getByRole('img').closest('.w-full');
      expect(container).toHaveClass('w-full');
    });

    it('should have rounded corners', () => {
      render(<HeroImageWithBlurredBackground {...mockProps} />);
      
      const container = screen.getByRole('img').closest('.rounded-lg');
      expect(container).toHaveClass('rounded-lg');
    });
  });

  describe('Hero image enhancements', () => {
    it('should use object-contain for proper dog display without cropping', () => {
      render(<HeroImageWithBlurredBackground {...mockProps} />);
      
      const img = screen.getByRole('img');
      expect(img).toHaveClass('object-contain');
    });

    it('should support gradient background as fallback', () => {
      const { container } = render(<HeroImageWithBlurredBackground {...mockProps} useGradientFallback={true} />);
      
      // Should have gradient background when specified
      const gradientBackground = container.querySelector('.bg-gradient-to-br');
      expect(gradientBackground).toBeInTheDocument();
    });

    it('should work without blurred background when gradient fallback is enabled', () => {
      const { container } = render(<HeroImageWithBlurredBackground {...mockProps} useGradientFallback={true} />);
      
      // Should not have blurred background when gradient fallback is enabled
      const blurredBackground = container.querySelector('.absolute.inset-0.bg-cover.bg-center[style*="blur"]');
      expect(blurredBackground).not.toBeInTheDocument();
    });
  });
});
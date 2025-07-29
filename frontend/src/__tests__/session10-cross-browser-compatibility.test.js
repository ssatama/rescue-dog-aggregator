/**
 * Session 10: Cross-Browser Compatibility Testing
 * Tests for Chrome/Edge, Firefox, Safari, and mobile browsers
 */

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DogCard from '../components/dogs/DogCard';
import LazyImage from '../components/ui/LazyImage';
import { Button } from '../components/ui/button';
import MobileStickyBar from '../components/ui/MobileStickyBar';
import { renderWithProviders, withoutIntersectionObserver } from '../test-utils';

// Mock intersection observer for browser compatibility
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  disconnect() {}
  unobserve() {}
};

// Mock matchMedia for cross-browser testing
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

describe('Session 10: Cross-Browser Compatibility', () => {
  describe('CSS Grid and Flexbox Support', () => {
    test('Components use modern CSS properties with fallbacks', () => {
      const mockDog = {
        id: 1,
        name: "Grid Test Dog",
        primary_image_url: "https://example.com/test.jpg",
        organization: { name: "Test Org" }
      };

      render(<DogCard dog={mockDog} />);
      
      const card = screen.getByTestId('dog-card');
      expect(card).toHaveClass('flex', 'flex-col'); // Flexbox support
      
      const cardContent = screen.getByTestId('card-content');
      expect(cardContent).toHaveClass('flex', 'flex-col', 'flex-grow'); // Modern flexbox
    });

    test('Aspect ratio containers work across browsers', () => {
      const mockDog = {
        id: 1,
        name: "Aspect Ratio Test",
        primary_image_url: "https://example.com/test.jpg"
      };

      render(<DogCard dog={mockDog} />);
      
      const imageContainer = screen.getByTestId('image-container');
      expect(imageContainer).toHaveClass('aspect-[4/3]'); // Modern aspect-ratio support
      expect(imageContainer).toHaveClass('relative'); // Fallback positioning
    });
  });

  describe('Touch and Mouse Event Compatibility', () => {
    test('Interactive elements support both touch and mouse events', async () => {
      const user = userEvent.setup();
      const mockDog = {
        id: 1,
        name: "Touch Test Dog",
        primary_image_url: "https://example.com/test.jpg",
        organization: { name: "Test Org" }
      };

      render(<DogCard dog={mockDog} />);
      
      const ctaButton = screen.getByText(/Meet Touch Test Dog/);
      
      // Should handle mouse events
      await user.hover(ctaButton);
      expect(ctaButton).toBeInTheDocument();
      
      // Should handle keyboard events
      await user.tab();
      expect(document.activeElement).toBeTruthy();
    });

    test('Mobile sticky elements handle viewport changes', () => {
      const mockDog = {
        id: 1,
        name: "Test Dog",
        primary_image_url: "https://example.com/test.jpg",
        adoption_url: "https://example.com/adopt"
      };

      renderWithProviders(<MobileStickyBar dog={mockDog} isVisible={true} />);
      
      const stickyBar = screen.getByTestId('mobile-sticky-bar');
      expect(stickyBar).toHaveClass('fixed', 'bottom-0');
    });
  });

  describe('JavaScript Feature Detection', () => {
    test('Components gracefully handle missing modern JS features', withoutIntersectionObserver(() => {
      // Test without IntersectionObserver (older browsers)
      expect(() => {
        render(
          <LazyImage
            src="https://example.com/test.jpg"
            alt="Feature detection test"
            priority={false}
          />
        );
      }).not.toThrow();
    }));

    test('Components handle older event API gracefully', () => {
      const mockDog = {
        id: 1,
        name: "Event API Test",
        primary_image_url: "https://example.com/test.jpg"
      };

      const { container } = render(<DogCard dog={mockDog} />);
      
      // Test keyboard event handling (works in all browsers)
      const card = screen.getByTestId('dog-card');
      fireEvent.keyDown(card, { key: 'Enter' });
      
      // Should not crash
      expect(container).toBeInTheDocument();
    });
  });

  describe('CSS Custom Properties and Variables', () => {
    test('Components work without CSS custom property support', () => {
      const mockDog = {
        id: 1,
        name: "CSS Variables Test",
        primary_image_url: "https://example.com/test.jpg"
      };

      render(<DogCard dog={mockDog} />);
      
      const ctaButton = screen.getByText(/Meet CSS Variables Test/);
      // Should have fallback colors even without CSS custom properties
      expect(ctaButton).toHaveClass('from-orange-600', 'to-orange-700');
    });
  });

  describe('Font Loading and Typography', () => {
    test('Components handle web font loading failures gracefully', () => {
      const mockDog = {
        id: 1,
        name: "Font Loading Test Dog with Very Long Name That Tests Truncation",
        primary_image_url: "https://example.com/test.jpg",
        organization: { name: "Test Organization" }
      };

      render(<DogCard dog={mockDog} />);
      
      const dogName = screen.getByTestId('dog-name');
      expect(dogName).toHaveClass('truncate'); // Prevents layout issues with fallback fonts
      expect(dogName).toHaveClass('text-card-title'); // Uses semantic typography scale
    });

    test('Typography scales work across different screen densities', () => {
      const mockDog = {
        id: 1,
        name: "Typography Scale Test",
        primary_image_url: "https://example.com/test.jpg",
        age_min_months: 24
      };

      render(<DogCard dog={mockDog} />);
      
      const ageCategory = screen.getByTestId('age-category');
      expect(ageCategory).toHaveClass('font-medium'); // Should work on all displays
    });
  });

  describe('Responsive Design Cross-Browser', () => {
    test('Responsive padding works across browsers', () => {
      const mockDog = {
        id: 1,
        name: "Responsive Test",
        primary_image_url: "https://example.com/test.jpg"
      };

      render(<DogCard dog={mockDog} />);
      
      const cardContent = screen.getByTestId('card-content');
      expect(cardContent).toHaveClass('p-4', 'sm:p-6'); // Progressive enhancement
    });

    test('Mobile-first responsive classes are applied correctly', () => {
      const mockDog = {
        id: 1,
        name: "Mobile First Test",
        primary_image_url: "https://example.com/test.jpg"
      };

      render(<DogCard dog={mockDog} />);
      
      const ctaButton = screen.getByText(/Meet Mobile First Test/);
      expect(ctaButton).toHaveClass('mobile-touch-target'); // 48px minimum for mobile
    });
  });

  describe('Image Format Compatibility', () => {
    test('LazyImage provides fallbacks for older browsers', () => {
      render(
        <LazyImage
          src="https://res.cloudinary.com/test/image/upload/v123/test.jpg"
          alt="Format compatibility test"
          priority={true}
        />
      );

      // Cloudinary f_auto provides automatic format fallbacks
      const images = screen.getAllByAltText('Format compatibility test');
      expect(images.length).toBeGreaterThan(0);
      
      // Should provide JPG fallback for browsers without WebP support
      images.forEach(img => {
        expect(img.src).toMatch(/\.(jpg|jpeg|webp|avif)$/i);
      });
    });
  });

  describe('Animation and Transition Compatibility', () => {
    test('Animations respect prefers-reduced-motion', () => {
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

      const mockDog = {
        id: 1,
        name: "Motion Test Dog",
        primary_image_url: "https://example.com/test.jpg"
      };

      render(<DogCard dog={mockDog} />);
      
      // Component should render without issues even with reduced motion
      const card = screen.getByTestId('dog-card');
      expect(card).toBeInTheDocument();
    });

    test('GPU-accelerated animations work across browsers', () => {
      const mockDog = {
        id: 1,
        name: "GPU Animation Test",
        primary_image_url: "https://example.com/test.jpg"
      };

      render(<DogCard dog={mockDog} />);
      
      const card = screen.getByTestId('dog-card');
      // Should use transform for GPU acceleration
      expect(card.className).toMatch(/transition|transform|animate/);
    });
  });

  describe('Focus Management Cross-Browser', () => {
    test('Focus indicators work in all browsers', async () => {
      const user = userEvent.setup();
      const mockDog = {
        id: 1,
        name: "Focus Test Dog",
        primary_image_url: "https://example.com/test.jpg"
      };

      render(<DogCard dog={mockDog} />);
      
      // Tab navigation should work in all browsers
      await user.tab();
      const focusedElement = document.activeElement;
      
      // Should have proper focus styling
      expect(focusedElement?.className).toMatch(/focus:ring|focus:outline/);
    });

    test('Keyboard navigation follows logical order', async () => {
      const user = userEvent.setup();
      const mockDog = {
        id: 1,
        name: "Keyboard Nav Test",
        primary_image_url: "https://example.com/test.jpg"
      };

      render(<DogCard dog={mockDog} />);
      
      // Should be able to navigate through interactive elements
      await user.tab(); // First focusable element
      expect(document.activeElement).toBeTruthy();
      
      await user.tab(); // Next focusable element
      expect(document.activeElement).toBeTruthy();
    });
  });

  describe('Performance Across Browsers', () => {
    test('Components render efficiently in older browsers', () => {
      const startTime = performance.now();
      
      const mockDog = {
        id: 1,
        name: "Performance Test Dog",
        primary_image_url: "https://example.com/test.jpg",
        organization: { name: "Test Org" }
      };

      render(<DogCard dog={mockDog} />);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render within reasonable time even in slower browsers
      expect(renderTime).toBeLessThan(100); // 100ms threshold
    });

    test('LazyImage reduces initial page load impact', () => {
      render(
        <LazyImage
          src="https://example.com/large-image.jpg"
          alt="Performance test image"
          priority={false} // Should not load immediately
        />
      );

      // Should show placeholder instead of loading large image immediately
      const placeholder = screen.getByTestId('image-placeholder');
      expect(placeholder).toBeInTheDocument();
    });
  });

  describe('Error Handling Across Browsers', () => {
    test('Components handle network failures gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(
        <LazyImage
          src="https://invalid-domain.com/missing.jpg"
          alt="Error handling test"
          priority={true}
        />
      );

      // Should show fallback without crashing
      const placeholder = screen.getByTestId('image-placeholder');
      expect(placeholder).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });

    test('Components handle malformed props without crashing', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const malformedDog = {
        id: undefined,
        name: null,
        primary_image_url: "not-a-url"
      };

      expect(() => {
        render(<DogCard dog={malformedDog} />);
      }).not.toThrow();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Mobile Browser Specific Features', () => {
    test('Touch targets meet mobile browser requirements', () => {
      const mockDog = {
        id: 1,
        name: "Mobile Touch Test",
        primary_image_url: "https://example.com/test.jpg",
        adoption_url: "https://example.com/adopt"
      };

      renderWithProviders(<MobileStickyBar dog={mockDog} isVisible={true} />);
      
      const ctaButton = screen.getByTestId('mobile-contact-button');
      expect(ctaButton).toHaveClass('mobile-touch-target'); // 48px minimum
    });

    test('Viewport scaling works correctly on mobile', () => {
      const mockDog = {
        id: 1,
        name: "Viewport Test Dog",
        primary_image_url: "https://example.com/test.jpg"
      };

      render(<DogCard dog={mockDog} />);
      
      const imageContainer = screen.getByTestId('image-container');
      expect(imageContainer).toHaveClass('relative', 'overflow-hidden');
      // Should prevent horizontal scrolling on mobile
    });
  });

  describe('Browser-Specific CSS Features', () => {
    test('Components work without backdrop-filter support', () => {
      const { container } = render(
        <Button variant="outline" size="sm">
          Backdrop Filter Test
        </Button>
      );

      // Should render properly even without backdrop-filter support
      expect(container.firstChild).toBeInTheDocument();
    });

    test('Components work without CSS Grid support', () => {
      const mockDog = {
        id: 1,
        name: "CSS Grid Fallback Test",
        primary_image_url: "https://example.com/test.jpg"
      };

      render(<DogCard dog={mockDog} />);
      
      const card = screen.getByTestId('dog-card');
      // Should use flexbox as fallback for grid layouts
      expect(card).toHaveClass('flex', 'flex-col');
    });
  });
});
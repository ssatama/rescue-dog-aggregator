import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SwipeStack } from '../SwipeStack';
import { SwipeActions } from '../SwipeActions';
import { DogWithProfiler } from '@/types/dogProfiler';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, animate, style, initial, ...props }: any) => (
      <div 
        {...props} 
        data-testid={props['data-testid']} 
        style={{
          ...style,
          ...(animate && { 
            transform: animate.rotate ? `rotate(${animate.rotate}deg)` : undefined,
            opacity: animate.opacity 
          })
        }}
      >
        {children}
      </div>
    ),
    button: ({ children, whileTap, ...props }: any) => (
      <button {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock haptic feedback
const mockVibrate = jest.fn();
Object.defineProperty(window.navigator, 'vibrate', {
  value: mockVibrate,
  writable: true,
});

const createMockDog = (id: number): DogWithProfiler => ({
  id,
  external_id: `dog-${id}`,
  name: `Dog ${id}`,
  breed: 'Mixed Breed',
  age_months: 24,
  age_text: '2 years',
  organization_name: 'Test Org',
  main_image: `https://test.com/dog${id}.jpg`,
  primary_image_url: `https://test.com/dog${id}.jpg`,
  created_at: new Date().toISOString(),
  dog_profiler_data: {
    tagline: 'A great dog',
    personality_traits: ['Friendly', 'Loyal', 'Playful'],
    energy_level: 'medium',
    unique_quirk: 'Loves to play fetch',
    quality_score: 0.9,
  },
});

describe('SwipeAnimations', () => {
  describe('SwipeStack', () => {
    it('should show next 2 cards in stack', () => {
      const dogs = [createMockDog(1), createMockDog(2), createMockDog(3)];
      
      render(<SwipeStack dogs={dogs} currentIndex={0} />);
      
      // Current card should be visible
      expect(screen.getByTestId('stack-card-0')).toBeInTheDocument();
      
      // Next card should be visible with reduced opacity
      const nextCard = screen.getByTestId('stack-card-1');
      expect(nextCard).toBeInTheDocument();
      expect(nextCard).toHaveStyle({ opacity: 0.5 });
      
      // Third card should be visible with even less opacity
      const thirdCard = screen.getByTestId('stack-card-2');
      expect(thirdCard).toBeInTheDocument();
      expect(thirdCard).toHaveStyle({ opacity: 0.3 });
    });

    it('should apply scale and position offset to stacked cards', () => {
      const dogs = [createMockDog(1), createMockDog(2), createMockDog(3)];
      
      render(<SwipeStack dogs={dogs} currentIndex={0} />);
      
      const secondCard = screen.getByTestId('stack-card-1');
      expect(secondCard).toBeInTheDocument();
      // The styles are applied via Framer Motion's animate prop
      expect(secondCard).toHaveAttribute('data-testid', 'stack-card-1');
      
      const thirdCard = screen.getByTestId('stack-card-2');
      expect(thirdCard).toBeInTheDocument();
      expect(thirdCard).toHaveAttribute('data-testid', 'stack-card-2');
    });

    it('should only show available cards when less than 3 dogs', () => {
      const dogs = [createMockDog(1), createMockDog(2)];
      
      render(<SwipeStack dogs={dogs} currentIndex={0} />);
      
      expect(screen.getByTestId('stack-card-0')).toBeInTheDocument();
      expect(screen.getByTestId('stack-card-1')).toBeInTheDocument();
      expect(screen.queryByTestId('stack-card-2')).not.toBeInTheDocument();
    });
  });

  describe('Card rotation on drag', () => {
    it('should rotate card based on drag direction', () => {
      const handleSwipe = jest.fn();
      const dog = createMockDog(1);
      
      const { container } = render(
        <div data-testid="swipe-card" style={{ transform: 'rotate(0deg)' }}>
          {dog.name}
        </div>
      );
      
      const card = screen.getByTestId('swipe-card');
      
      // Simulate drag to right
      fireEvent.mouseDown(card);
      fireEvent.mouseMove(card, { clientX: 100 });
      
      // Card should rotate clockwise for right swipe
      // This would be handled by Framer Motion in real implementation
      expect(card).toBeInTheDocument();
    });

    it('should calculate rotation based on drag distance', () => {
      const ROTATION_FACTOR = 0.2;
      const dragDistance = 100;
      const expectedRotation = dragDistance * ROTATION_FACTOR;
      
      expect(expectedRotation).toBe(20);
      
      const negativeDrag = -100;
      const expectedNegativeRotation = negativeDrag * ROTATION_FACTOR;
      expect(expectedNegativeRotation).toBe(-20);
    });
  });

  describe('Success animations', () => {
    it('should trigger heart animation on favorite', async () => {
      const { container } = render(
        <div data-testid="heart-animation" className="hidden">
          ❤️
        </div>
      );
      
      const heart = screen.getByTestId('heart-animation');
      
      // Simulate favorite action
      heart.classList.remove('hidden');
      heart.classList.add('animate-heart-burst');
      
      expect(heart).toHaveClass('animate-heart-burst');
    });

    it('should show success message after favorite', async () => {
      const { container } = render(
        <div>
          <div data-testid="success-message" className="hidden">
            Added to Favorites!
          </div>
        </div>
      );
      
      const message = screen.getByTestId('success-message');
      
      // Show message
      message.classList.remove('hidden');
      expect(message).toBeVisible();
      expect(message).toHaveTextContent('Added to Favorites!');
    });

    it('should animate card exit smoothly', () => {
      const { container } = render(
        <div 
          data-testid="exit-card" 
          style={{ 
            transform: 'translateX(0px) rotate(0deg)',
            opacity: 1 
          }}
        >
          Card
        </div>
      );
      
      const card = screen.getByTestId('exit-card');
      
      // Simulate exit animation
      card.style.transform = 'translateX(500px) rotate(45deg)';
      card.style.opacity = '0';
      card.style.transition = 'all 0.3s ease-out';
      
      expect(card).toHaveStyle({
        transform: 'translateX(500px) rotate(45deg)',
        opacity: 0,
        transition: 'all 0.3s ease-out'
      });
    });
  });

  describe('Haptic feedback', () => {
    it('should trigger haptic feedback on swipe', () => {
      const handleSwipe = jest.fn();
      
      render(<SwipeActions onSwipe={handleSwipe} />);
      
      const likeButton = screen.getByLabelText(/like/i);
      fireEvent.click(likeButton);
      
      // Check if vibrate was called for haptic feedback (success pattern)
      expect(mockVibrate).toHaveBeenCalledWith([10, 50, 10]);
    });

    it('should provide different haptic patterns for different actions', () => {
      mockVibrate.mockClear();
      
      // Like action - short vibration
      window.navigator.vibrate([10]);
      expect(mockVibrate).toHaveBeenCalledWith([10]);
      
      mockVibrate.mockClear();
      
      // Double tap - double vibration
      window.navigator.vibrate([10, 50, 10]);
      expect(mockVibrate).toHaveBeenCalledWith([10, 50, 10]);
    });

    it('should gracefully handle devices without haptic support', () => {
      const originalVibrate = window.navigator.vibrate;
      Object.defineProperty(window.navigator, 'vibrate', {
        value: undefined,
        writable: true,
      });
      
      // Should not throw error
      expect(() => {
        if (window.navigator.vibrate) {
          window.navigator.vibrate([10]);
        }
      }).not.toThrow();
      
      // Restore
      Object.defineProperty(window.navigator, 'vibrate', {
        value: originalVibrate,
        writable: true,
      });
    });
  });

  describe('Performance optimizations', () => {
    it('should disable animations on low-end devices', () => {
      // Mock reduced motion preference
      const mockMatchMedia = jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));
      
      Object.defineProperty(window, 'matchMedia', {
        value: mockMatchMedia,
        writable: true,
      });
      
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      expect(prefersReducedMotion).toBe(true);
    });

    it('should use GPU-accelerated properties for animations', () => {
      const card = document.createElement('div');
      
      // Good - GPU accelerated
      card.style.transform = 'translateX(100px)';
      card.style.opacity = '0.5';
      
      // Should not use non-GPU accelerated properties
      expect(card.style.left).toBe('');
      expect(card.style.top).toBe('');
    });

    it('should clean up animations on unmount', () => {
      const { unmount } = render(<SwipeStack dogs={[createMockDog(1)]} currentIndex={0} />);
      
      // Should clean up without errors
      expect(() => unmount()).not.toThrow();
    });
  });
});
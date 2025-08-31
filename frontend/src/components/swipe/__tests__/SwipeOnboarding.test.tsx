import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SwipeOnboarding from '../SwipeOnboarding';

describe('SwipeOnboarding', () => {
  const mockOnComplete = jest.fn();

  beforeEach(() => {
    mockOnComplete.mockClear();
    localStorage.clear();
  });

  describe('First-Time User Detection', () => {
    it('should show onboarding for new users', () => {
      render(<SwipeOnboarding onComplete={mockOnComplete} />);
      
      expect(screen.getByText(/Where can you adopt/i)).toBeInTheDocument();
    });

    it('should not show onboarding for returning users', () => {
      localStorage.setItem('swipeOnboardingComplete', 'true');
      
      const { container } = render(<SwipeOnboarding onComplete={mockOnComplete} />);
      
      expect(container.firstChild).toBeNull();
      expect(mockOnComplete).toHaveBeenCalledWith(true);
    });

    it('should show onboarding if filters are not set', () => {
      localStorage.setItem('swipeOnboardingComplete', 'true');
      // But no filters saved
      
      render(<SwipeOnboarding onComplete={mockOnComplete} />);
      
      expect(screen.getByText(/Where can you adopt/i)).toBeInTheDocument();
    });
  });

  describe('Country Selection Step', () => {
    it('should display available countries with dog counts', () => {
      render(<SwipeOnboarding onComplete={mockOnComplete} />);
      
      expect(screen.getByText(/Germany/)).toBeInTheDocument();
      expect(screen.getByText(/486 dogs available/)).toBeInTheDocument();
      
      expect(screen.getByText(/United Kingdom/)).toBeInTheDocument();
      expect(screen.getByText(/1,245 dogs available/)).toBeInTheDocument();
      
      expect(screen.getByText(/United States/)).toBeInTheDocument();
      expect(screen.getByText(/342 dogs available/)).toBeInTheDocument();
    });

    it('should show country flags', () => {
      render(<SwipeOnboarding onComplete={mockOnComplete} />);
      
      expect(screen.getByText(/🇩🇪/)).toBeInTheDocument();
      expect(screen.getByText(/🇬🇧/)).toBeInTheDocument();
      expect(screen.getByText(/🇺🇸/)).toBeInTheDocument();
    });

    it('should highlight selected country', async () => {
      render(<SwipeOnboarding onComplete={mockOnComplete} />);
      
      const germanyButton = screen.getByRole('button', { name: /Germany/i });
      fireEvent.click(germanyButton);
      
      await waitFor(() => {
        expect(germanyButton).toHaveClass('selected');
      });
    });

    it('should require country selection before proceeding', () => {
      render(<SwipeOnboarding onComplete={mockOnComplete} />);
      
      const nextButton = screen.getByRole('button', { name: /Continue/i });
      expect(nextButton).toBeDisabled();
      
      const germanyButton = screen.getByRole('button', { name: /Germany/i });
      fireEvent.click(germanyButton);
      
      expect(nextButton).not.toBeDisabled();
    });
  });

  describe('Size Preference Step', () => {
    it('should show size options after country selection', async () => {
      render(<SwipeOnboarding onComplete={mockOnComplete} />);
      
      const germanyButton = screen.getByRole('button', { name: /Germany/i });
      fireEvent.click(germanyButton);
      
      const continueButton = screen.getByRole('button', { name: /Continue/i });
      fireEvent.click(continueButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Size preference/i)).toBeInTheDocument();
      });
      
      expect(screen.getByRole('button', { name: /Small/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Medium/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Large/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Giant/i })).toBeInTheDocument();
    });

    it('should show size icons', async () => {
      render(<SwipeOnboarding onComplete={mockOnComplete} />);
      
      // Select country first
      fireEvent.click(screen.getByRole('button', { name: /Germany/i }));
      fireEvent.click(screen.getByRole('button', { name: /Continue/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/🐕/)).toBeInTheDocument(); // Small dog emoji
      });
    });

    it('should allow multiple size selection', async () => {
      render(<SwipeOnboarding onComplete={mockOnComplete} />);
      
      // Select country first
      fireEvent.click(screen.getByRole('button', { name: /Germany/i }));
      fireEvent.click(screen.getByRole('button', { name: /Continue/i }));
      
      await waitFor(() => {
        const smallButton = screen.getByRole('button', { name: /Small/i });
        const mediumButton = screen.getByRole('button', { name: /Medium/i });
        
        fireEvent.click(smallButton);
        fireEvent.click(mediumButton);
        
        expect(smallButton).toHaveClass('selected');
        expect(mediumButton).toHaveClass('selected');
      });
    });

    it('should allow skipping size selection', async () => {
      render(<SwipeOnboarding onComplete={mockOnComplete} />);
      
      // Select country
      fireEvent.click(screen.getByRole('button', { name: /Germany/i }));
      fireEvent.click(screen.getByRole('button', { name: /Continue/i }));
      
      await waitFor(() => {
        const skipButton = screen.getByRole('button', { name: /Skip|All sizes/i });
        expect(skipButton).toBeInTheDocument();
      });
    });
  });

  describe('Completion', () => {
    it('should save filters and mark onboarding complete', async () => {
      render(<SwipeOnboarding onComplete={mockOnComplete} />);
      
      // Select country
      fireEvent.click(screen.getByRole('button', { name: /Germany/i }));
      fireEvent.click(screen.getByRole('button', { name: /Continue/i }));
      
      // Select sizes
      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /Small/i }));
        fireEvent.click(screen.getByRole('button', { name: /Medium/i }));
      });
      
      // Complete
      fireEvent.click(screen.getByRole('button', { name: /Start Swiping/i }));
      
      await waitFor(() => {
        expect(localStorage.getItem('swipeOnboardingComplete')).toBe('true');
        expect(JSON.parse(localStorage.getItem('swipeFilters') || '{}')).toEqual({
          country: 'Germany',
          sizes: ['small', 'medium']
        });
      });
    });

    it('should call onComplete with filters', async () => {
      render(<SwipeOnboarding onComplete={mockOnComplete} />);
      
      // Complete onboarding
      fireEvent.click(screen.getByRole('button', { name: /Germany/i }));
      fireEvent.click(screen.getByRole('button', { name: /Continue/i }));
      
      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /Small/i }));
      });
      
      fireEvent.click(screen.getByRole('button', { name: /Start Swiping/i }));
      
      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledWith(false, {
          country: 'Germany',
          sizes: ['small']
        });
      });
    });
  });

  describe('Visual Design', () => {
    it('should show globe icon for country step', () => {
      render(<SwipeOnboarding onComplete={mockOnComplete} />);
      
      expect(screen.getByText(/🌍/)).toBeInTheDocument();
    });

    it('should show descriptive text', () => {
      render(<SwipeOnboarding onComplete={mockOnComplete} />);
      
      expect(screen.getByText(/We'll show dogs available in your country/i)).toBeInTheDocument();
    });

    it('should animate transitions between steps', async () => {
      const { container } = render(<SwipeOnboarding onComplete={mockOnComplete} />);
      
      // Check for animation class on initial render
      expect(container.querySelector('.animate-in')).toBeInTheDocument();
      
      // Move to next step
      fireEvent.click(screen.getByRole('button', { name: /Germany/i }));
      fireEvent.click(screen.getByRole('button', { name: /Continue/i }));
      
      await waitFor(() => {
        expect(container.querySelector('.animate-in')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<SwipeOnboarding onComplete={mockOnComplete} />);
      
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'Swipe feature onboarding');
    });

    it('should be keyboard navigable', () => {
      render(<SwipeOnboarding onComplete={mockOnComplete} />);
      
      const germanyButton = screen.getByRole('button', { name: /Germany/i });
      germanyButton.focus();
      
      fireEvent.keyDown(germanyButton, { key: 'Enter' });
      expect(germanyButton).toHaveClass('selected');
    });

    it('should announce step changes to screen readers', async () => {
      render(<SwipeOnboarding onComplete={mockOnComplete} />);
      
      fireEvent.click(screen.getByRole('button', { name: /Germany/i }));
      fireEvent.click(screen.getByRole('button', { name: /Continue/i }));
      
      await waitFor(() => {
        const announcement = screen.getByRole('status');
        expect(announcement).toHaveTextContent(/Step 2 of 2/i);
      });
    });
  });
});
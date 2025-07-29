// frontend/src/components/ui/__tests__/button.test.jsx

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Button } from '../button';

describe('Button Component', () => {
  describe('Default button styling', () => {
    it('should have proper contrast for default variant', () => {
      render(<Button>Test Button</Button>);
      const button = screen.getByRole('button', { name: 'Test Button' });
      
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('bg-primary');
      expect(button).toHaveClass('text-primary-foreground');
    });

    it('should be readable and accessible', () => {
      render(<Button>Browse All Dogs</Button>);
      const button = screen.getByRole('button', { name: 'Browse All Dogs' });
      
      expect(button).toBeVisible();
      expect(button).not.toHaveStyle('color: rgb(0, 0, 0)'); // Should not be black text
    });
  });

  describe('Button variants', () => {
    it('should render secondary variant with proper styling', () => {
      render(<Button variant="secondary">Secondary Button</Button>);
      const button = screen.getByRole('button', { name: 'Secondary Button' });
      
      expect(button).toHaveClass('bg-secondary');
      expect(button).toHaveClass('text-secondary-foreground');
    });

    it('should render outline variant with proper styling', () => {
      render(<Button variant="outline">Outline Button</Button>);
      const button = screen.getByRole('button', { name: 'Outline Button' });
      
      expect(button).toHaveClass('border');
      expect(button).toHaveClass('bg-background');
    });

    it('should render large size variant', () => {
      render(<Button size="lg">Large Button</Button>);
      const button = screen.getByRole('button', { name: 'Large Button' });
      
      expect(button).toHaveClass('h-10');
      expect(button).toHaveClass('px-8');
    });
  });

  describe('Critical CTA buttons', () => {
    it('should render Browse All Dogs button with high contrast', () => {
      render(<Button size="lg">Browse All Dogs</Button>);
      const button = screen.getByRole('button', { name: 'Browse All Dogs' });
      
      expect(button).toBeVisible();
      expect(button).toHaveClass('bg-primary');
      expect(button).toHaveClass('text-primary-foreground');
      
      // Test computed styles
      const styles = window.getComputedStyle(button);
      expect(styles.backgroundColor).not.toBe('transparent');
      expect(styles.color).not.toBe('rgb(0, 0, 0)');
    });

    it('should render Visit Website button with proper contrast', () => {
      render(<Button>Visit Website</Button>);
      const button = screen.getByRole('button', { name: 'Visit Website' });
      
      expect(button).toBeVisible();
      expect(button).toHaveClass('bg-primary');
      expect(button).toHaveClass('text-primary-foreground');
    });

    it('should render Adopt buttons with proper green styling', () => {
      render(<Button className="bg-green-700 hover:bg-green-800">Adopt Dog</Button>);
      const button = screen.getByRole('button', { name: 'Adopt Dog' });
      
      expect(button).toBeVisible();
      expect(button).toHaveClass('bg-green-700');
    });
  });

  describe('Button accessibility', () => {
    it('should have proper focus states', () => {
      render(<Button>Focus Test</Button>);
      const button = screen.getByRole('button', { name: 'Focus Test' });
      
      expect(button).toHaveClass('focus-visible:outline-none');
      expect(button).toHaveClass('focus-visible:ring-2');
    });

    it('should handle disabled state properly', () => {
      render(<Button disabled>Disabled Button</Button>);
      const button = screen.getByRole('button', { name: 'Disabled Button' });
      
      expect(button).toBeDisabled();
      expect(button).toHaveClass('disabled:opacity-50');
    });
  });
});
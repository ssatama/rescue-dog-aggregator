import React from 'react';
import { render, screen } from '@testing-library/react';
import { Icon } from '../Icon';

describe('Icon Component', () => {
  // Size System Tests
  describe('Size System', () => {
    test('renders small size with correct classes', () => {
      render(<Icon name="heart" size="small" />);
      const icon = screen.getByRole('img', { hidden: true });
      expect(icon).toHaveClass('w-4', 'h-4');
    });

    test('renders default size with correct classes', () => {
      render(<Icon name="heart" size="default" />);
      const icon = screen.getByRole('img', { hidden: true });
      expect(icon).toHaveClass('w-5', 'h-5');
    });

    test('renders medium size with correct classes', () => {
      render(<Icon name="heart" size="medium" />);
      const icon = screen.getByRole('img', { hidden: true });
      expect(icon).toHaveClass('w-6', 'h-6');
    });

    test('renders large size with correct classes', () => {
      render(<Icon name="heart" size="large" />);
      const icon = screen.getByRole('img', { hidden: true });
      expect(icon).toHaveClass('w-8', 'h-8');
    });

    test('defaults to default size when size prop is not provided', () => {
      render(<Icon name="heart" />);
      const icon = screen.getByRole('img', { hidden: true });
      expect(icon).toHaveClass('w-5', 'h-5');
    });
  });

  // Color System Tests
  describe('Color System', () => {
    test('renders default color with correct classes', () => {
      render(<Icon name="heart" color="default" />);
      const icon = screen.getByRole('img', { hidden: true });
      expect(icon).toHaveClass('text-gray-600');
    });

    test('renders interactive color with correct classes', () => {
      render(<Icon name="heart" color="interactive" />);
      const icon = screen.getByRole('img', { hidden: true });
      expect(icon).toHaveClass('text-gray-600', 'hover:text-orange-600', 'transition-colors');
    });

    test('renders active color with correct classes', () => {
      render(<Icon name="heart" color="active" />);
      const icon = screen.getByRole('img', { hidden: true });
      expect(icon).toHaveClass('text-orange-600');
    });

    test('renders on-dark color with correct classes', () => {
      render(<Icon name="heart" color="on-dark" />);
      const icon = screen.getByRole('img', { hidden: true });
      expect(icon).toHaveClass('text-white');
    });

    test('defaults to default color when color prop is not provided', () => {
      render(<Icon name="heart" />);
      const icon = screen.getByRole('img', { hidden: true });
      expect(icon).toHaveClass('text-gray-600');
    });
  });

  // Icon Mapping Tests
  describe('Icon Mapping', () => {
    test('renders heart icon correctly', () => {
      render(<Icon name="heart" />);
      expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
    });

    test('renders x icon correctly', () => {
      render(<Icon name="x" />);
      expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
    });

    test('renders search icon correctly', () => {
      render(<Icon name="search" />);
      expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
    });

    test('renders filter icon correctly', () => {
      render(<Icon name="filter" />);
      expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
    });

    test('throws error for unmapped icon name', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => render(<Icon name="nonexistent-icon" />)).toThrow();
      consoleSpy.mockRestore();
    });
  });

  // Props and Customization Tests
  describe('Props and Customization', () => {
    test('merges custom className with default classes', () => {
      render(<Icon name="heart" className="custom-class" />);
      const icon = screen.getByRole('img', { hidden: true });
      expect(icon).toHaveClass('custom-class', 'w-5', 'h-5', 'text-gray-600');
    });

    test('forwards additional props to icon component', () => {
      render(<Icon name="heart" data-testid="custom-icon" />);
      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });

    test('combines size and color props correctly', () => {
      render(<Icon name="heart" size="large" color="active" />);
      const icon = screen.getByRole('img', { hidden: true });
      expect(icon).toHaveClass('w-8', 'h-8', 'text-orange-600');
    });
  });

  // Accessibility Tests
  describe('Accessibility', () => {
    test('applies proper aria-hidden by default', () => {
      render(<Icon name="heart" />);
      const icon = screen.getByRole('img', { hidden: true });
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });

    test('allows custom aria-label to be passed', () => {
      render(<Icon name="heart" aria-label="Favorite this item" />);
      const icon = screen.getByRole('img');
      expect(icon).toHaveAttribute('aria-label', 'Favorite this item');
      expect(icon).not.toHaveAttribute('aria-hidden');
    });

    test('interactive icons have proper focus states', () => {
      render(<Icon name="heart" color="interactive" />);
      const icon = screen.getByRole('img', { hidden: true });
      expect(icon).toHaveClass('hover:text-orange-600');
    });
  });

  // Error Handling Tests
  describe('Error Handling', () => {
    test('handles undefined icon name gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => render(<Icon name={undefined} />)).toThrow();
      consoleSpy.mockRestore();
    });

    test('handles invalid size gracefully', () => {
      render(<Icon name="heart" size="invalid" />);
      const icon = screen.getByRole('img', { hidden: true });
      // Should fall back to default size
      expect(icon).toHaveClass('w-5', 'h-5');
    });

    test('handles invalid color gracefully', () => {
      render(<Icon name="heart" color="invalid" />);
      const icon = screen.getByRole('img', { hidden: true });
      // Should fall back to default color
      expect(icon).toHaveClass('text-gray-600');
    });
  });
});
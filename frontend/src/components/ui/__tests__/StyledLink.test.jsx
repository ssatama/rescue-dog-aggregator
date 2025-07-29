import React from 'react';
import { render, screen } from '@testing-library/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import StyledLink from '../StyledLink';

// Mock Next.js Link component
jest.mock('next/link', () => {
  return function MockLink({ children, href, className, ...props }) {
    return (
      <a href={href} className={className} {...props}>
        {children}
      </a>
    );
  };
});

describe('StyledLink Component', () => {
  describe('Text Variant', () => {
    it('should render with text variant styling', () => {
      render(
        <StyledLink href="/dogs" variant="text">
          View all dogs
        </StyledLink>
      );
      
      const link = screen.getByRole('link');
      expect(link).toHaveClass('text-orange-600');
      expect(link).toHaveClass('hover:text-orange-700');
      expect(link).toHaveClass('underline');
      expect(link).toHaveClass('underline-offset-4');
      expect(link).toHaveClass('hover:underline-offset-2');
      expect(link).toHaveClass('transition-all');
      expect(link).toHaveClass('duration-200');
    });

    it('should handle ChevronLeft icon with text variant', () => {
      render(
        <StyledLink href="/dogs" variant="text" className="inline-flex items-center gap-2">
          <ChevronLeft className="w-4 h-4" />
          Back to all dogs
        </StyledLink>
      );
      
      const link = screen.getByRole('link');
      expect(link).toHaveClass('text-orange-600');
      expect(link).toHaveClass('inline-flex');
      expect(link).toHaveClass('items-center');
      expect(link).toHaveClass('gap-2');
      expect(link).toHaveTextContent('Back to all dogs');
    });
  });

  describe('Button Variant', () => {
    it('should render with button variant styling', () => {
      render(
        <StyledLink href="/dogs" variant="button">
          View all →
        </StyledLink>
      );
      
      const link = screen.getByRole('link');
      expect(link).toHaveClass('inline-flex');
      expect(link).toHaveClass('items-center');
      expect(link).toHaveClass('gap-1');
      expect(link).toHaveClass('px-4');
      expect(link).toHaveClass('py-2');
      expect(link).toHaveClass('bg-orange-50');
      expect(link).toHaveClass('text-orange-700');
      expect(link).toHaveClass('hover:bg-orange-100');
      expect(link).toHaveClass('rounded-md');
      expect(link).toHaveClass('transition-colors');
      expect(link).toHaveClass('duration-200');
    });

    it('should handle ChevronRight icon with button variant', () => {
      render(
        <StyledLink href="/dogs" variant="button">
          View all dogs
          <ChevronRight className="w-4 h-4" />
        </StyledLink>
      );
      
      const link = screen.getByRole('link');
      expect(link).toHaveClass('bg-orange-50');
      expect(link).toHaveClass('text-orange-700');
      expect(link).toHaveTextContent('View all dogs');
    });
  });

  describe('Nav Variant', () => {
    it('should render with nav variant styling', () => {
      render(
        <StyledLink href="/organizations" variant="nav">
          Organizations
        </StyledLink>
      );
      
      const link = screen.getByRole('link');
      expect(link).toHaveClass('text-gray-700');
      expect(link).toHaveClass('hover:text-orange-600');
      expect(link).toHaveClass('transition-colors');
      expect(link).toHaveClass('duration-200');
      expect(link).not.toHaveClass('underline');
    });
  });

  describe('Default Behavior', () => {
    it('should default to text variant when no variant specified', () => {
      render(
        <StyledLink href="/dogs">
          Default link
        </StyledLink>
      );
      
      const link = screen.getByRole('link');
      expect(link).toHaveClass('text-orange-600');
      expect(link).toHaveClass('underline');
    });
  });

  describe('Props Forwarding', () => {
    it('should forward href prop correctly', () => {
      render(
        <StyledLink href="/test-path" variant="button">
          Test Link
        </StyledLink>
      );
      
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/test-path');
    });

    it('should merge custom className with variant classes', () => {
      render(
        <StyledLink 
          href="/dogs" 
          variant="text" 
          className="custom-class font-bold"
        >
          Custom styled link
        </StyledLink>
      );
      
      const link = screen.getByRole('link');
      expect(link).toHaveClass('text-orange-600');
      expect(link).toHaveClass('custom-class');
      expect(link).toHaveClass('font-bold');
    });

    it('should forward additional props', () => {
      render(
        <StyledLink 
          href="/dogs" 
          variant="button"
          data-testid="custom-link"
          aria-label="Custom test link"
        >
          Test Link
        </StyledLink>
      );
      
      const link = screen.getByTestId('custom-link');
      expect(link).toHaveAttribute('aria-label', 'Custom test link');
    });
  });

  describe('Accessibility', () => {
    it('should have proper focus states for text variant', () => {
      render(
        <StyledLink href="/dogs" variant="text">
          Accessible link
        </StyledLink>
      );
      
      const link = screen.getByRole('link');
      expect(link).toHaveClass('focus-visible:outline-none');
      expect(link).toHaveClass('focus-visible:ring-2');
      expect(link).toHaveClass('focus-visible:ring-orange-600');
      expect(link).toHaveClass('focus-visible:ring-offset-2');
    });

    it('should have proper focus states for button variant', () => {
      render(
        <StyledLink href="/dogs" variant="button">
          Button-style link
        </StyledLink>
      );
      
      const link = screen.getByRole('link');
      expect(link).toHaveClass('focus-visible:outline-none');
      expect(link).toHaveClass('focus-visible:ring-2');
      expect(link).toHaveClass('focus-visible:ring-orange-600');
      expect(link).toHaveClass('focus-visible:ring-offset-2');
    });

    it('should have proper focus states for nav variant', () => {
      render(
        <StyledLink href="/organizations" variant="nav">
          Navigation link
        </StyledLink>
      );
      
      const link = screen.getByRole('link');
      expect(link).toHaveClass('focus-visible:outline-none');
      expect(link).toHaveClass('focus-visible:ring-2');
      expect(link).toHaveClass('focus-visible:ring-orange-600');
      expect(link).toHaveClass('focus-visible:ring-offset-2');
    });

    it('should be keyboard accessible', () => {
      render(
        <StyledLink href="/dogs" variant="button">
          Keyboard accessible
        </StyledLink>
      );
      
      const link = screen.getByRole('link');
      expect(link.tagName).toBe('A');
      expect(link).toHaveAttribute('href');
    });
  });

  describe('Content Handling', () => {
    it('should render arrow symbols correctly', () => {
      render(
        <StyledLink href="/dogs" variant="button">
          View all →
        </StyledLink>
      );
      
      expect(screen.getByText('View all →')).toBeInTheDocument();
    });

    it('should render with React icons', () => {
      render(
        <StyledLink href="/dogs" variant="text" className="inline-flex items-center gap-2">
          <ChevronLeft className="w-4 h-4" />
          Back to dogs
        </StyledLink>
      );
      
      expect(screen.getByText('Back to dogs')).toBeInTheDocument();
    });

    it('should handle empty children gracefully', () => {
      render(
        <StyledLink href="/dogs" variant="button">
        </StyledLink>
      );
      
      const link = screen.getByRole('link');
      expect(link).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined variant gracefully', () => {
      render(
        <StyledLink href="/dogs" variant={undefined}>
          Undefined variant
        </StyledLink>
      );
      
      const link = screen.getByRole('link');
      expect(link).toHaveClass('text-orange-600');
      expect(link).toHaveClass('underline');
    });

    it('should handle null className', () => {
      render(
        <StyledLink href="/dogs" variant="button" className={null}>
          Null className
        </StyledLink>
      );
      
      const link = screen.getByRole('link');
      expect(link).toHaveClass('bg-orange-50');
    });
  });
});
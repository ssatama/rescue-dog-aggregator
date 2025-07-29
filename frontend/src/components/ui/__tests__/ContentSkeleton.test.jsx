import React from 'react';
import { render, screen } from '@testing-library/react';
import ContentSkeleton from '../ContentSkeleton';

describe('ContentSkeleton', () => {
  describe('Basic Rendering', () => {
    it('renders default 3 lines with proper spacing', () => {
      render(<ContentSkeleton />);
      
      const container = screen.getByRole('status');
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('space-y-3');
      
      // Should have 3 skeleton lines by default
      const skeletonLines = container.querySelectorAll('[class*="h-4"]');
      expect(skeletonLines).toHaveLength(3);
    });

    it('renders custom number of lines', () => {
      render(<ContentSkeleton lines={5} />);
      
      const container = screen.getByRole('status');
      const skeletonLines = container.querySelectorAll('[class*="h-4"]');
      expect(skeletonLines).toHaveLength(5);
    });

    it('applies custom className to container', () => {
      render(<ContentSkeleton className="my-8" />);
      
      const container = screen.getByRole('status');
      expect(container).toHaveClass('my-8');
      expect(container).toHaveClass('space-y-3');
    });
  });

  describe('Line Width Patterns', () => {
    it('applies proper width patterns for varied text simulation', () => {
      render(<ContentSkeleton lines={6} />);
      
      const container = screen.getByRole('status');
      const skeletonLines = container.querySelectorAll('[class*="h-4"]');
      
      // Check that we have varied width classes
      const widthClasses = Array.from(skeletonLines).map(line => 
        line.className.match(/w-\d+\/\d+|w-full/)?.[0]
      );
      
      // Should have mix of different widths
      const uniqueWidths = new Set(widthClasses);
      expect(uniqueWidths.size).toBeGreaterThan(1);
    });

    it('includes expected width variations', () => {
      render(<ContentSkeleton lines={8} />);
      
      const container = screen.getByRole('status');
      const allText = container.textContent || container.innerHTML;
      
      // Should include the standard width patterns
      expect(container.innerHTML).toMatch(/w-3\/4|w-1\/2|w-5\/6|w-full/);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<ContentSkeleton />);
      
      const container = screen.getByRole('status');
      expect(container).toHaveAttribute('aria-label', 'Loading content');
      expect(container).toHaveAttribute('aria-busy', 'true');
    });

    it('supports custom aria-label', () => {
      render(<ContentSkeleton aria-label="Loading article content" />);
      
      const container = screen.getByRole('status');
      expect(container).toHaveAttribute('aria-label', 'Loading article content');
    });
  });

  describe('Skeleton Styling Integration', () => {
    it('uses SkeletonPulse for each line', () => {
      render(<ContentSkeleton lines={3} />);
      
      const container = screen.getByRole('status');
      const skeletonLines = container.querySelectorAll('[class*="bg-muted"]');
      
      // Each line should have skeleton styling
      expect(skeletonLines.length).toBeGreaterThan(0);
      
      skeletonLines.forEach(line => {
        expect(line).toHaveClass('bg-muted');
        expect(line).toHaveClass('animate-pulse');
        expect(line).toHaveClass('rounded');
        // Child skeletons should not have role attribute
        expect(line).not.toHaveAttribute('role');
      });
    });
  });

  describe('Responsive Design', () => {
    it('maintains consistent height across all lines', () => {
      render(<ContentSkeleton lines={4} />);
      
      const container = screen.getByRole('status');
      const skeletonLines = container.querySelectorAll('[class*="h-4"]');
      
      // All lines should have h-4 class
      skeletonLines.forEach(line => {
        expect(line).toHaveClass('h-4');
      });
    });

    it('supports custom line height', () => {
      render(<ContentSkeleton lineHeight="h-6" />);
      
      const container = screen.getByRole('status');
      const skeletonLines = container.querySelectorAll('[class*="h-6"]');
      
      expect(skeletonLines.length).toBeGreaterThan(0);
    });
  });

  describe('Props Forwarding', () => {
    it('forwards additional props to container', () => {
      render(
        <ContentSkeleton 
          lines={3}
          data-testid="content-skeleton"
          id="test-content"
        />
      );
      
      const container = screen.getByTestId('content-skeleton');
      expect(container).toHaveAttribute('id', 'test-content');
      expect(container).toHaveAttribute('role', 'status');
    });
  });

  describe('Performance', () => {
    it('handles large number of lines efficiently', () => {
      const startTime = performance.now();
      render(<ContentSkeleton lines={50} />);
      const endTime = performance.now();
      
      // Should render quickly even with many lines
      expect(endTime - startTime).toBeLessThan(100);
      
      const container = screen.getByRole('status');
      const skeletonLines = container.querySelectorAll('[class*="h-4"]');
      expect(skeletonLines).toHaveLength(50);
    });
  });
});
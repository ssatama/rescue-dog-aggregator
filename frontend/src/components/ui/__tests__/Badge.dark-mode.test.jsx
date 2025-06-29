import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '../../providers/ThemeProvider';
import { Badge } from '../badge';

// Helper to render with ThemeProvider in dark mode
const renderWithDarkTheme = (component) => {
  // Set dark mode in localStorage
  localStorage.setItem('theme', 'dark');
  document.documentElement.classList.add('dark');
  
  return render(
    <ThemeProvider>
      {component}
    </ThemeProvider>
  );
};

describe('Badge Component - Dark Mode Support', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  describe('Dark Mode Contrast Enhancement', () => {
    test('default variant should have enhanced contrast in dark mode', () => {
      renderWithDarkTheme(
        <Badge data-testid="default-badge">Available</Badge>
      );

      const badge = screen.getByTestId('default-badge');
      
      // Should have dark mode contrast enhancements
      expect(badge).toHaveClass('dark:shadow-purple-500/20');
      expect(badge).toHaveClass('dark:ring-1');
      expect(badge).toHaveClass('dark:ring-purple-500/30');
      
      // Should use semantic tokens
      expect(badge).toHaveClass('bg-primary');
      expect(badge).toHaveClass('text-primary-foreground');
      
      // Should be in dark mode context
      expect(document.documentElement).toHaveClass('dark');
    });

    test('secondary variant should have proper dark mode styling', () => {
      renderWithDarkTheme(
        <Badge data-testid="secondary-badge" variant="secondary">
          Medium
        </Badge>
      );

      const badge = screen.getByTestId('secondary-badge');
      
      // Should have dark mode enhancements for secondary
      expect(badge).toHaveClass('dark:shadow-orange-500/15');
      expect(badge).toHaveClass('dark:ring-1');
      expect(badge).toHaveClass('dark:ring-orange-500/25');
      
      // Should use semantic tokens
      expect(badge).toHaveClass('bg-secondary');
      expect(badge).toHaveClass('text-secondary-foreground');
    });

    test('destructive variant should have enhanced red contrast in dark mode', () => {
      renderWithDarkTheme(
        <Badge data-testid="destructive-badge" variant="destructive">
          Urgent
        </Badge>
      );

      const badge = screen.getByTestId('destructive-badge');
      
      // Should have dark mode red enhancements
      expect(badge).toHaveClass('dark:shadow-red-500/20');
      expect(badge).toHaveClass('dark:ring-1');
      expect(badge).toHaveClass('dark:ring-red-500/30');
      
      // Should use semantic tokens
      expect(badge).toHaveClass('bg-destructive');
      expect(badge).toHaveClass('text-destructive-foreground');
    });

    test('outline variant should have proper dark mode border', () => {
      renderWithDarkTheme(
        <Badge data-testid="outline-badge" variant="outline">
          Special
        </Badge>
      );

      const badge = screen.getByTestId('outline-badge');
      
      // Should have dark mode outline enhancements
      expect(badge).toHaveClass('dark:border-purple-500/40');
      expect(badge).toHaveClass('dark:bg-purple-500/10');
      expect(badge).toHaveClass('dark:text-purple-300');
      
      // Should use semantic text color
      expect(badge).toHaveClass('text-foreground');
    });
  });

  describe('Dark Mode Text Readability', () => {
    test('should ensure text is readable on dark backgrounds', () => {
      renderWithDarkTheme(
        <Badge data-testid="readable-badge">Test Badge</Badge>
      );

      const badge = screen.getByTestId('readable-badge');
      
      // Should have proper text color for dark mode
      expect(badge).toHaveClass('text-primary-foreground');
      
      // Text should be visible
      expect(screen.getByText('Test Badge')).toBeVisible();
    });

    test('should handle long text properly in dark mode', () => {
      renderWithDarkTheme(
        <Badge data-testid="long-badge">
          Very Long Badge Text That Might Wrap
        </Badge>
      );

      const badge = screen.getByTestId('long-badge');
      
      // Should maintain readability with long text
      expect(badge).toHaveClass('text-xs');
      expect(badge).toHaveClass('font-semibold');
      expect(badge).toHaveClass('px-2.5');
      expect(badge).toHaveClass('py-0.5');
    });
  });

  describe('Dark Mode Hover States', () => {
    test('should have proper hover states in dark mode', () => {
      renderWithDarkTheme(
        <Badge data-testid="hover-badge">Hover Me</Badge>
      );

      const badge = screen.getByTestId('hover-badge');
      
      // Should have hover effects
      expect(badge).toHaveClass('hover:bg-primary/80');
      expect(badge).toHaveClass('transition-colors');
      
      // Should have dark mode hover enhancements
      expect(badge).toHaveClass('hover:dark:shadow-purple-500/30');
    });

    test('secondary variant should have proper hover in dark mode', () => {
      renderWithDarkTheme(
        <Badge data-testid="secondary-hover" variant="secondary">
          Secondary Hover
        </Badge>
      );

      const badge = screen.getByTestId('secondary-hover');
      
      // Should have secondary hover
      expect(badge).toHaveClass('hover:bg-secondary/80');
      
      // Should have dark mode hover enhancements
      expect(badge).toHaveClass('hover:dark:shadow-orange-500/25');
    });

    test('destructive variant should have proper hover in dark mode', () => {
      renderWithDarkTheme(
        <Badge data-testid="destructive-hover" variant="destructive">
          Destructive Hover
        </Badge>
      );

      const badge = screen.getByTestId('destructive-hover');
      
      // Should have destructive hover
      expect(badge).toHaveClass('hover:bg-destructive/80');
      
      // Should have dark mode hover enhancements
      expect(badge).toHaveClass('hover:dark:shadow-red-500/30');
    });
  });

  describe('Dark Mode Focus States', () => {
    test('should have proper focus states in dark mode', () => {
      renderWithDarkTheme(
        <Badge data-testid="focus-badge" tabIndex={0}>
          Focusable Badge
        </Badge>
      );

      const badge = screen.getByTestId('focus-badge');
      
      // Should have focus states that work in dark mode
      expect(badge).toHaveClass('focus:outline-none');
      expect(badge).toHaveClass('focus:ring-2');
      expect(badge).toHaveClass('focus:ring-ring');
      expect(badge).toHaveClass('focus:ring-offset-2');
    });
  });

  describe('Dark Mode Accessibility', () => {
    test('should maintain accessibility in dark mode', () => {
      renderWithDarkTheme(
        <Badge data-testid="accessible-badge" role="status">
          Status Badge
        </Badge>
      );

      const badge = screen.getByTestId('accessible-badge');
      
      // Should have proper role
      expect(badge).toHaveAttribute('role', 'status');
      
      // Should be visible
      expect(badge).toBeVisible();
      
      // Text should be readable
      expect(screen.getByText('Status Badge')).toBeInTheDocument();
    });

    test('should work with screen readers in dark mode', () => {
      renderWithDarkTheme(
        <Badge data-testid="sr-badge" aria-label="Important notification">
          !
        </Badge>
      );

      const badge = screen.getByTestId('sr-badge');
      
      // Should have proper aria-label
      expect(badge).toHaveAttribute('aria-label', 'Important notification');
      
      // Should be accessible
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Dark Mode Custom Classes', () => {
    test('should support custom dark mode classes', () => {
      renderWithDarkTheme(
        <Badge 
          data-testid="custom-badge" 
          className="dark:bg-blue-600 dark:text-blue-100"
        >
          Custom Badge
        </Badge>
      );

      const badge = screen.getByTestId('custom-badge');
      
      // Should preserve custom dark mode classes
      expect(badge).toHaveClass('dark:bg-blue-600');
      expect(badge).toHaveClass('dark:text-blue-100');
      
      // Should still have base badge classes
      expect(badge).toHaveClass('inline-flex');
      expect(badge).toHaveClass('items-center');
      expect(badge).toHaveClass('rounded-md');
    });

    test('should work with size modifiers in dark mode', () => {
      renderWithDarkTheme(
        <Badge 
          data-testid="sized-badge" 
          className="text-sm px-3 py-1"
        >
          Larger Badge
        </Badge>
      );

      const badge = screen.getByTestId('sized-badge');
      
      // Should preserve custom sizing
      expect(badge).toHaveClass('text-sm');
      expect(badge).toHaveClass('px-3');
      expect(badge).toHaveClass('py-1');
      
      // Should still have dark mode enhancements
      expect(badge).toHaveClass('dark:shadow-purple-500/20');
    });
  });

  describe('Dark Mode Visual Consistency', () => {
    test('should maintain visual hierarchy in dark mode', () => {
      renderWithDarkTheme(
        <div data-testid="badge-group">
          <Badge>Primary</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
      );

      const badgeGroup = screen.getByTestId('badge-group');
      const badges = badgeGroup.querySelectorAll('.inline-flex');
      
      // Should have multiple badges
      expect(badges).toHaveLength(4);
      
      // All should have dark mode enhancements
      badges.forEach(badge => {
        expect(badge).toHaveClass('transition-colors');
        // Should have some form of dark mode styling
        const hasRing = badge.classList.contains('dark:ring-1') || 
                       badge.classList.contains('dark:border-purple-500/40');
        const hasShadow = Array.from(badge.classList).some(cls => 
          cls.includes('dark:shadow-'));
        expect(hasRing || hasShadow).toBe(true);
      });
    });

    test('should work well with other components in dark mode', () => {
      renderWithDarkTheme(
        <div data-testid="integration-test" className="dark:bg-card p-4">
          <h3 className="dark:text-card-foreground">Dog Status</h3>
          <Badge>Available for Adoption</Badge>
        </div>
      );

      const container = screen.getByTestId('integration-test');
      const badge = container.querySelector('.inline-flex');
      
      // Should integrate well with card background
      expect(container).toHaveClass('dark:bg-card');
      expect(badge).toHaveClass('bg-primary');
      expect(badge).toHaveClass('dark:shadow-purple-500/20');
    });
  });
});
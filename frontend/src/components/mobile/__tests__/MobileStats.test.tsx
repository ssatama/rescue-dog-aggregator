import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import MobileStats from '../MobileStats';

// Mock the AnimatedCounter component
jest.mock('../../ui/AnimatedCounter', () => {
  return function MockAnimatedCounter({ value, label }: { value: number; label: string }) {
    return <span data-testid={`counter-${label}`}>{value}</span>;
  };
});

describe('MobileStats', () => {
  const mockStatistics = {
    total_dogs: 2860,
    total_organizations: 13,
    total_breeds: 50,
  };

  describe('Rendering', () => {
    it('renders all three statistics', () => {
      render(<MobileStats statistics={mockStatistics} />);
      
      expect(screen.getByText('2860')).toBeInTheDocument();
      expect(screen.getByText('13')).toBeInTheDocument();
      expect(screen.getByText('50+')).toBeInTheDocument();
    });

    it('renders correct labels for each statistic', () => {
      render(<MobileStats statistics={mockStatistics} />);
      
      expect(screen.getByText('Dogs')).toBeInTheDocument();
      expect(screen.getByText('Rescues')).toBeInTheDocument();
      expect(screen.getByText('Breeds')).toBeInTheDocument();
    });

    it('has 3-column grid layout', () => {
      const { container } = render(<MobileStats statistics={mockStatistics} />);
      
      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('grid-cols-3');
    });

    it('is hidden on desktop viewports (md and above)', () => {
      const { container } = render(<MobileStats statistics={mockStatistics} />);
      
      const statsSection = container.firstChild as HTMLElement;
      expect(statsSection).toHaveClass('md:hidden');
    });

    it('has beige/soft background color', () => {
      const { container } = render(<MobileStats statistics={mockStatistics} />);
      
      const statsSection = container.querySelector('.bg-orange-50');
      expect(statsSection).toBeInTheDocument();
    });

    it('has rounded corners', () => {
      const { container } = render(<MobileStats statistics={mockStatistics} />);
      
      const statsSection = container.querySelector('.rounded-2xl');
      expect(statsSection).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows skeleton loaders when statistics is null', () => {
      render(<MobileStats statistics={null} />);
      
      const skeletons = screen.getAllByTestId('stat-skeleton');
      expect(skeletons).toHaveLength(3);
      
      // Check that skeleton elements have animate-pulse class
      skeletons.forEach(skeleton => {
        const pulseElements = skeleton.querySelectorAll('.animate-pulse');
        expect(pulseElements.length).toBeGreaterThan(0);
      });
    });

    it('shows skeleton loaders when loading is true', () => {
      render(<MobileStats statistics={null} loading={true} />);
      
      const skeletons = screen.getAllByTestId('stat-skeleton');
      expect(skeletons).toHaveLength(3);
    });
  });

  describe('AnimatedCounter Integration', () => {
    it('uses AnimatedCounter for dog count', () => {
      render(<MobileStats statistics={mockStatistics} />);
      
      const dogCounter = screen.getByTestId('counter-Dogs');
      expect(dogCounter).toHaveTextContent('2860');
    });

    it('uses AnimatedCounter for organization count', () => {
      render(<MobileStats statistics={mockStatistics} />);
      
      const orgCounter = screen.getByTestId('counter-Rescues');
      expect(orgCounter).toHaveTextContent('13');
    });

    it('handles breed count with + suffix', () => {
      render(<MobileStats statistics={mockStatistics} />);
      
      expect(screen.getByText('50+')).toBeInTheDocument();
    });
  });

  describe('Dark Mode', () => {
    it('has dark mode classes for background', () => {
      const { container } = render(<MobileStats statistics={mockStatistics} />);
      
      const statsSection = container.querySelector('.dark\\:bg-gray-800');
      expect(statsSection).toBeInTheDocument();
    });

    it('has dark mode classes for border', () => {
      const { container } = render(<MobileStats statistics={mockStatistics} />);
      
      const statsSection = container.querySelector('.dark\\:border-gray-700');
      expect(statsSection).toBeInTheDocument();
    });

    it('has dark mode classes for labels', () => {
      render(<MobileStats statistics={mockStatistics} />);
      
      const labels = [
        screen.getByText('Dogs'),
        screen.getByText('Rescues'),
        screen.getByText('Breeds'),
      ];
      
      labels.forEach(label => {
        expect(label.className).toMatch(/dark:text-gray-400/);
      });
    });
  });

  describe('Responsive Text', () => {
    it('has proper text sizing for numbers', () => {
      render(<MobileStats statistics={mockStatistics} />);
      
      const numbers = screen.getAllByTestId(/counter-/);
      numbers.forEach(number => {
        const parent = number.parentElement;
        expect(parent?.className).toMatch(/text-2xl/);
      });
    });

    it('has small text for labels', () => {
      render(<MobileStats statistics={mockStatistics} />);
      
      const labels = [
        screen.getByText('Dogs'),
        screen.getByText('Rescues'),
        screen.getByText('Breeds'),
      ];
      
      labels.forEach(label => {
        expect(label.className).toMatch(/text-\[11px\]|text-xs/);
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles zero values', () => {
      render(
        <MobileStats
          statistics={{
            total_dogs: 0,
            total_organizations: 0,
            total_breeds: 0,
          }}
        />
      );
      
      // Check that we have multiple zeros displayed
      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBeGreaterThanOrEqual(2);
    });

    it('handles large numbers', () => {
      render(
        <MobileStats
          statistics={{
            total_dogs: 99999,
            total_organizations: 999,
            total_breeds: 999,
          }}
        />
      );
      
      expect(screen.getByText('99999')).toBeInTheDocument();
      expect(screen.getByText('999')).toBeInTheDocument();
    });
  });
});
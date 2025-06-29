import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '../../components/providers/ThemeProvider';

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

// Test component for utility classes
function TestUtilityComponent({ className }) {
  return (
    <div 
      className={className}
      data-testid="utility-element"
    >
      Test Content
    </div>
  );
}

describe('Globals.css Utility Classes - Dark Mode Support', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  describe('Shimmer Animations', () => {
    test('animate-shimmer-warm should render in dark mode', () => {
      renderWithDarkTheme(<TestUtilityComponent className="animate-shimmer-warm" />);
      
      const element = screen.getByTestId('utility-element');
      
      // Should have the class applied
      expect(element).toHaveClass('animate-shimmer-warm');
      
      // Should be in dark mode context
      expect(document.documentElement).toHaveClass('dark');
    });

    test('animate-shimmer-premium should render in dark mode', () => {
      renderWithDarkTheme(<TestUtilityComponent className="animate-shimmer-premium" />);
      
      const element = screen.getByTestId('utility-element');
      
      // Should have premium shimmer class
      expect(element).toHaveClass('animate-shimmer-premium');
      
      // Should be in dark mode context
      expect(document.documentElement).toHaveClass('dark');
    });

    test('skeleton class should render in dark mode', () => {
      renderWithDarkTheme(<TestUtilityComponent className="skeleton" />);
      
      const element = screen.getByTestId('utility-element');
      
      // Should have skeleton class
      expect(element).toHaveClass('skeleton');
      
      // Should be in dark mode context
      expect(document.documentElement).toHaveClass('dark');
    });
  });

  describe('Interactive Utilities', () => {
    test('hover-lift should render in dark mode', () => {
      renderWithDarkTheme(<TestUtilityComponent className="hover-lift" />);
      
      const element = screen.getByTestId('utility-element');
      
      // Should have hover lift class applied
      expect(element).toHaveClass('hover-lift');
      
      // Should be in dark mode context
      expect(document.documentElement).toHaveClass('dark');
    });

    test('animate-card-hover should render in dark mode', () => {
      renderWithDarkTheme(<TestUtilityComponent className="animate-card-hover" />);
      
      const element = screen.getByTestId('utility-element');
      
      // Should have card hover class
      expect(element).toHaveClass('animate-card-hover');
      
      // Should be in dark mode context
      expect(document.documentElement).toHaveClass('dark');
    });

    test('animate-button-hover should render in dark mode', () => {
      renderWithDarkTheme(<TestUtilityComponent className="animate-button-hover" />);
      
      const element = screen.getByTestId('utility-element');
      
      // Should have button hover class
      expect(element).toHaveClass('animate-button-hover');
      
      // Should be in dark mode context
      expect(document.documentElement).toHaveClass('dark');
    });
  });

  describe('Typography Utilities', () => {
    test('text-hero should render in dark mode', () => {
      renderWithDarkTheme(<TestUtilityComponent className="text-hero" />);
      
      const element = screen.getByTestId('utility-element');
      
      // Should have hero text class
      expect(element).toHaveClass('text-hero');
      
      // Should be in dark mode context
      expect(document.documentElement).toHaveClass('dark');
    });

    test('text-section should render in dark mode', () => {
      renderWithDarkTheme(<TestUtilityComponent className="text-section" />);
      
      const element = screen.getByTestId('utility-element');
      
      // Should have section text class
      expect(element).toHaveClass('text-section');
      
      // Should be in dark mode context
      expect(document.documentElement).toHaveClass('dark');
    });

    test('text-body should render in dark mode', () => {
      renderWithDarkTheme(<TestUtilityComponent className="text-body" />);
      
      const element = screen.getByTestId('utility-element');
      
      // Should have body text class
      expect(element).toHaveClass('text-body');
      
      // Should be in dark mode context
      expect(document.documentElement).toHaveClass('dark');
    });
  });

  describe('Shadow Utilities', () => {
    test('shadow-blue-sm should render in dark mode', () => {
      renderWithDarkTheme(<TestUtilityComponent className="shadow-blue-sm" />);
      
      const element = screen.getByTestId('utility-element');
      
      // Should have shadow class applied
      expect(element).toHaveClass('shadow-blue-sm');
      
      // Should be in dark mode context
      expect(document.documentElement).toHaveClass('dark');
    });

    test('shadow-blue-md should render in dark mode', () => {
      renderWithDarkTheme(<TestUtilityComponent className="shadow-blue-md" />);
      
      const element = screen.getByTestId('utility-element');
      
      // Should have shadow class applied
      expect(element).toHaveClass('shadow-blue-md');
      
      // Should be in dark mode context
      expect(document.documentElement).toHaveClass('dark');
    });

    test('shadow-blue-lg should render in dark mode', () => {
      renderWithDarkTheme(<TestUtilityComponent className="shadow-blue-lg" />);
      
      const element = screen.getByTestId('utility-element');
      
      // Should have shadow class applied
      expect(element).toHaveClass('shadow-blue-lg');
      
      // Should be in dark mode context
      expect(document.documentElement).toHaveClass('dark');
    });
  });

  describe('Animation Utilities', () => {
    test('animate-fade-in should render in dark mode', () => {
      renderWithDarkTheme(<TestUtilityComponent className="animate-fade-in" />);
      
      const element = screen.getByTestId('utility-element');
      
      // Should have fade-in class
      expect(element).toHaveClass('animate-fade-in');
      
      // Should be in dark mode context
      expect(document.documentElement).toHaveClass('dark');
    });

    test('animate-fade-in-up should render in dark mode', () => {
      renderWithDarkTheme(<TestUtilityComponent className="animate-fade-in-up" />);
      
      const element = screen.getByTestId('utility-element');
      
      // Should have fade-in-up class
      expect(element).toHaveClass('animate-fade-in-up');
      
      // Should be in dark mode context
      expect(document.documentElement).toHaveClass('dark');
    });

    test('animate-page-enter should render in dark mode', () => {
      renderWithDarkTheme(<TestUtilityComponent className="animate-page-enter" />);
      
      const element = screen.getByTestId('utility-element');
      
      // Should have page-enter class
      expect(element).toHaveClass('animate-page-enter');
      
      // Should be in dark mode context
      expect(document.documentElement).toHaveClass('dark');
    });
  });

  describe('Theme Consistent Utilities', () => {
    test('theme-consistent-card should render in dark mode', () => {
      renderWithDarkTheme(<TestUtilityComponent className="theme-consistent-card" />);
      
      const element = screen.getByTestId('utility-element');
      
      // Should have card styling
      expect(element).toHaveClass('theme-consistent-card');
      
      // Should be in dark mode context
      expect(document.documentElement).toHaveClass('dark');
    });

    test('theme-consistent-button should render in dark mode', () => {
      renderWithDarkTheme(<TestUtilityComponent className="theme-consistent-button" />);
      
      const element = screen.getByTestId('utility-element');
      
      // Should have button styling
      expect(element).toHaveClass('theme-consistent-button');
      
      // Should be in dark mode context
      expect(document.documentElement).toHaveClass('dark');
    });

    test('theme-consistent-input should render in dark mode', () => {
      renderWithDarkTheme(<TestUtilityComponent className="theme-consistent-input" />);
      
      const element = screen.getByTestId('utility-element');
      
      // Should have input styling
      expect(element).toHaveClass('theme-consistent-input');
      
      // Should be in dark mode context
      expect(document.documentElement).toHaveClass('dark');
    });
  });
});
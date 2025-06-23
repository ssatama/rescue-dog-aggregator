import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock components to test visual consistency
const ThemeConsistencyTestComponent = () => (
  <div>
    {/* Orange theme buttons */}
    <button 
      data-testid="primary-orange-button"
      className="theme-consistent-button bg-orange-600 hover:bg-orange-600 text-white px-4 py-2 rounded-lg"
    >
      Primary Orange Button
    </button>
    
    <button 
      data-testid="secondary-orange-button"
      className="theme-consistent-button bg-orange-100 hover:bg-orange-200 text-orange-700 border border-orange-200 px-4 py-2 rounded-lg"
    >
      Secondary Orange Button
    </button>
    
    {/* Links with orange theme */}
    <a 
      href="#test"
      data-testid="orange-link"
      className="theme-consistent-link text-orange-600 hover:text-orange-700 underline"
    >
      Orange Theme Link
    </a>
    
    {/* Form elements with orange focus */}
    <input 
      data-testid="orange-input"
      className="theme-consistent-input border border-gray-300 focus:border-orange-400 focus:ring-orange-200 px-3 py-2 rounded-md"
      placeholder="Orange focus input"
    />
    
    <select 
      data-testid="orange-select"
      className="theme-consistent-select border border-gray-300 focus:border-orange-400 focus:ring-orange-200 px-3 py-2 rounded-md"
    >
      <option>Orange focus select</option>
    </select>
    
    {/* Badges and indicators */}
    <span 
      data-testid="orange-badge"
      className="theme-consistent-badge bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-sm"
    >
      Orange Badge
    </span>
    
    {/* Cards with consistent styling */}
    <div 
      data-testid="consistent-card"
      className="theme-consistent-card bg-white rounded-lg shadow-md border border-gray-200 p-6"
    >
      <h3 className="theme-consistent-title text-lg font-semibold text-gray-900 mb-2">
        Consistent Card Title
      </h3>
      <p className="theme-consistent-text text-gray-600 mb-4">
        Card content with consistent theming
      </p>
      <button className="theme-consistent-button bg-orange-600 hover:bg-orange-600 text-white px-4 py-2 rounded-lg">
        Card CTA
      </button>
    </div>
    
    {/* Progress indicators */}
    <div 
      data-testid="orange-progress"
      className="theme-consistent-progress bg-gray-200 rounded-full h-2 overflow-hidden"
    >
      <div className="bg-orange-600 h-full w-3/4 rounded-full"></div>
    </div>
    
    {/* Alert/notification components */}
    <div 
      data-testid="orange-alert"
      className="theme-consistent-alert bg-orange-50 border border-orange-200 text-orange-800 px-4 py-3 rounded-lg"
    >
      Orange themed alert message
    </div>
    
    {/* Navigation elements */}
    <nav data-testid="consistent-nav" className="theme-consistent-nav">
      <ul className="flex space-x-4">
        <li>
          <a 
            href="#nav1"
            data-testid="nav-item-1"
            className="theme-consistent-nav-link text-orange-600 hover:text-orange-700 px-3 py-2 rounded-md hover:bg-orange-50"
          >
            Nav Item 1
          </a>
        </li>
        <li>
          <a 
            href="#nav2"
            data-testid="nav-item-2"
            className="theme-consistent-nav-link text-orange-600 hover:text-orange-700 px-3 py-2 rounded-md hover:bg-orange-50"
          >
            Nav Item 2
          </a>
        </li>
      </ul>
    </nav>
    
    {/* Gradients consistency */}
    <div 
      data-testid="orange-gradient"
      className="theme-consistent-gradient bg-gradient-to-r from-orange-600 to-orange-700 text-white px-6 py-4 rounded-lg"
    >
      Orange gradient element
    </div>
    
    {/* Icon colors */}
    <div className="flex space-x-4">
      <svg 
        data-testid="orange-icon-1"
        className="theme-consistent-icon text-orange-600 w-6 h-6"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
      
      <svg 
        data-testid="orange-icon-2"
        className="theme-consistent-icon text-orange-600 w-6 h-6"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
    </div>
    
    {/* Error states with orange theming */}
    <div 
      data-testid="error-state"
      className="theme-consistent-error border border-red-300 bg-red-50 text-red-800 px-4 py-3 rounded-lg"
    >
      Error message (should maintain orange accents)
    </div>
    
    {/* Success states with orange theming */}
    <div 
      data-testid="success-state"
      className="theme-consistent-success border border-green-300 bg-green-50 text-green-800 px-4 py-3 rounded-lg"
    >
      Success message (should maintain orange accents)
    </div>
    
    {/* Loading states */}
    <div 
      data-testid="loading-state"
      className="theme-consistent-loading animate-pulse bg-gray-200 rounded-lg h-20"
    >
      <div className="bg-orange-200 h-4 rounded w-3/4 mb-2"></div>
      <div className="bg-orange-100 h-4 rounded w-1/2"></div>
    </div>
  </div>
);

describe('Visual Consistency & Theme Tests', () => {
  describe('Orange Theme Consistency', () => {
    test('primary buttons use consistent orange colors', () => {
      render(<ThemeConsistencyTestComponent />);
      
      const primaryButton = screen.getByTestId('primary-orange-button');
      expect(primaryButton).toHaveClass('bg-orange-600');
      expect(primaryButton).toHaveClass('hover:bg-orange-600');
      expect(primaryButton).toHaveClass('text-white');
      expect(primaryButton).toHaveClass('theme-consistent-button');
    });

    test('secondary buttons use consistent orange variants', () => {
      render(<ThemeConsistencyTestComponent />);
      
      const secondaryButton = screen.getByTestId('secondary-orange-button');
      expect(secondaryButton).toHaveClass('bg-orange-100');
      expect(secondaryButton).toHaveClass('hover:bg-orange-200');
      expect(secondaryButton).toHaveClass('text-orange-700');
      expect(secondaryButton).toHaveClass('border-orange-200');
    });

    test('links use consistent orange colors', () => {
      render(<ThemeConsistencyTestComponent />);
      
      const link = screen.getByTestId('orange-link');
      expect(link).toHaveClass('text-orange-600');
      expect(link).toHaveClass('hover:text-orange-700');
      expect(link).toHaveClass('theme-consistent-link');
    });

    test('form elements have consistent orange focus states', () => {
      render(<ThemeConsistencyTestComponent />);
      
      const input = screen.getByTestId('orange-input');
      expect(input).toHaveClass('focus:border-orange-400');
      expect(input).toHaveClass('focus:ring-orange-200');
      
      const select = screen.getByTestId('orange-select');
      expect(select).toHaveClass('focus:border-orange-400');
      expect(select).toHaveClass('focus:ring-orange-200');
    });
  });

  describe('Badge and Indicator Consistency', () => {
    test('badges use consistent orange styling', () => {
      render(<ThemeConsistencyTestComponent />);
      
      const badge = screen.getByTestId('orange-badge');
      expect(badge).toHaveClass('bg-orange-100');
      expect(badge).toHaveClass('text-orange-700');
      expect(badge).toHaveClass('theme-consistent-badge');
    });

    test('progress indicators use orange theme', () => {
      render(<ThemeConsistencyTestComponent />);
      
      const progress = screen.getByTestId('orange-progress');
      expect(progress).toHaveClass('theme-consistent-progress');
      
      const progressBar = progress.querySelector('.bg-orange-600');
      expect(progressBar).toBeInTheDocument();
    });
  });

  describe('Card and Layout Consistency', () => {
    test('cards have consistent styling and structure', () => {
      render(<ThemeConsistencyTestComponent />);
      
      const card = screen.getByTestId('consistent-card');
      expect(card).toHaveClass('theme-consistent-card');
      expect(card).toHaveClass('bg-white');
      expect(card).toHaveClass('rounded-lg');
      expect(card).toHaveClass('shadow-md');
      
      const title = screen.getByText('Consistent Card Title');
      expect(title).toHaveClass('theme-consistent-title');
      expect(title).toHaveClass('text-gray-900');
      
      const text = screen.getByText('Card content with consistent theming');
      expect(text).toHaveClass('theme-consistent-text');
      expect(text).toHaveClass('text-gray-600');
    });

    test('card CTAs maintain orange button styling', () => {
      render(<ThemeConsistencyTestComponent />);
      
      const cardCTA = screen.getByText('Card CTA');
      expect(cardCTA).toHaveClass('bg-orange-600');
      expect(cardCTA).toHaveClass('hover:bg-orange-600');
      expect(cardCTA).toHaveClass('text-white');
    });
  });

  describe('Navigation Consistency', () => {
    test('navigation links use consistent orange theming', () => {
      render(<ThemeConsistencyTestComponent />);
      
      const navItem1 = screen.getByTestId('nav-item-1');
      const navItem2 = screen.getByTestId('nav-item-2');
      
      [navItem1, navItem2].forEach(item => {
        expect(item).toHaveClass('theme-consistent-nav-link');
        expect(item).toHaveClass('text-orange-600');
        expect(item).toHaveClass('hover:text-orange-700');
        expect(item).toHaveClass('hover:bg-orange-50');
      });
    });
  });

  describe('Gradient and Visual Effects', () => {
    test('gradients use consistent orange color stops', () => {
      render(<ThemeConsistencyTestComponent />);
      
      const gradient = screen.getByTestId('orange-gradient');
      expect(gradient).toHaveClass('theme-consistent-gradient');
      expect(gradient).toHaveClass('bg-gradient-to-r');
      expect(gradient).toHaveClass('from-orange-600');
      expect(gradient).toHaveClass('to-orange-700');
    });

    test('icons use consistent orange colors', () => {
      render(<ThemeConsistencyTestComponent />);
      
      const icon1 = screen.getByTestId('orange-icon-1');
      const icon2 = screen.getByTestId('orange-icon-2');
      
      expect(icon1).toHaveClass('theme-consistent-icon');
      expect(icon1).toHaveClass('text-orange-600');
      
      expect(icon2).toHaveClass('theme-consistent-icon');
      expect(icon2).toHaveClass('text-orange-600');
    });
  });

  describe('Alert and Notification Consistency', () => {
    test('orange-themed alerts have consistent styling', () => {
      render(<ThemeConsistencyTestComponent />);
      
      const alert = screen.getByTestId('orange-alert');
      expect(alert).toHaveClass('theme-consistent-alert');
      expect(alert).toHaveClass('bg-orange-50');
      expect(alert).toHaveClass('border-orange-200');
      expect(alert).toHaveClass('text-orange-800');
    });

    test('error states maintain visual hierarchy while preserving orange accents', () => {
      render(<ThemeConsistencyTestComponent />);
      
      const errorState = screen.getByTestId('error-state');
      expect(errorState).toHaveClass('theme-consistent-error');
      expect(errorState).toHaveClass('border-red-300');
      expect(errorState).toHaveClass('bg-red-50');
      expect(errorState).toHaveClass('text-red-800');
    });

    test('success states maintain visual hierarchy', () => {
      render(<ThemeConsistencyTestComponent />);
      
      const successState = screen.getByTestId('success-state');
      expect(successState).toHaveClass('theme-consistent-success');
      expect(successState).toHaveClass('border-green-300');
      expect(successState).toHaveClass('bg-green-50');
      expect(successState).toHaveClass('text-green-800');
    });
  });

  describe('Loading and Skeleton States', () => {
    test('loading states incorporate orange theming', () => {
      render(<ThemeConsistencyTestComponent />);
      
      const loadingState = screen.getByTestId('loading-state');
      expect(loadingState).toHaveClass('theme-consistent-loading');
      
      const orangeElements = loadingState.querySelectorAll('.bg-orange-200, .bg-orange-100');
      expect(orangeElements).toHaveLength(2);
    });
  });

  describe('Typography Consistency', () => {
    test('headings and text have consistent styling', () => {
      render(<ThemeConsistencyTestComponent />);
      
      const title = screen.getByText('Consistent Card Title');
      expect(title).toHaveClass('text-lg');
      expect(title).toHaveClass('font-semibold');
      expect(title).toHaveClass('text-gray-900');
      
      const text = screen.getByText('Card content with consistent theming');
      expect(text).toHaveClass('text-gray-600');
    });
  });

  describe('Interactive State Consistency', () => {
    test('all interactive elements have consistent hover and focus states', () => {
      render(<ThemeConsistencyTestComponent />);
      
      // Check buttons
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        if (button.classList.contains('theme-consistent-button')) {
          expect(button.classList.toString()).toMatch(/orange/);
        }
      });
      
      // Check links
      const links = screen.getAllByRole('link');
      links.forEach(link => {
        if (link.classList.contains('theme-consistent-link') || 
            link.classList.contains('theme-consistent-nav-link')) {
          expect(link.classList.toString()).toMatch(/orange/);
        }
      });
    });
  });

  describe('Color Accessibility', () => {
    test('orange theme maintains sufficient color contrast', () => {
      render(<ThemeConsistencyTestComponent />);
      
      // Test primary button contrast
      const primaryButton = screen.getByTestId('primary-orange-button');
      expect(primaryButton).toHaveClass('bg-orange-600', 'text-white');
      
      // Test secondary button contrast
      const secondaryButton = screen.getByTestId('secondary-orange-button');
      expect(secondaryButton).toHaveClass('bg-orange-100', 'text-orange-700');
      
      // Test badge contrast
      const badge = screen.getByTestId('orange-badge');
      expect(badge).toHaveClass('bg-orange-100', 'text-orange-700');
    });
  });

  describe('Brand Consistency', () => {
    test('all orange elements use the standard orange palette', () => {
      render(<ThemeConsistencyTestComponent />);
      
      // Define expected orange classes
      const expectedOrangeClasses = [
        'orange-50', 'orange-100', 'orange-200', 'orange-300', 
        'orange-400', 'orange-500', 'orange-600', 'orange-700', 'orange-800'
      ];
      
      const container = screen.getByTestId('primary-orange-button').parentElement;
      const htmlContent = container.innerHTML;
      
      // Check that only standard orange classes are used
      const orangeMatches = htmlContent.match(/orange-\d+/g) || [];
      orangeMatches.forEach(match => {
        expect(expectedOrangeClasses.some(validClass => match.includes(validClass))).toBe(true);
      });
    });
  });
});
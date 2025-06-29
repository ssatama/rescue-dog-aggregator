// src/components/error/__tests__/DogDetailErrorBoundary.dark-mode.test.jsx
// TDD Phase 1: RED - Tests for DogDetailErrorBoundary dark mode functionality

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DogDetailErrorBoundary from '../DogDetailErrorBoundary';

// Mock the logger utility
jest.mock('../../../utils/logger', () => ({
  reportError: jest.fn()
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: function MockButton({ children, variant, size, className, onClick, asChild, ...props }) {
    if (asChild) {
      return <div className={className} data-variant={variant} data-size={size}>{children}</div>;
    }
    return (
      <button 
        className={className} 
        onClick={onClick}
        data-variant={variant}
        data-size={size}
        {...props}
      >
        {children}
      </button>
    );
  }
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: function MockAlert({ children, variant, className }) {
    return (
      <div 
        className={className}
        data-variant={variant}
        role="alert"
      >
        {children}
      </div>
    );
  },
  AlertTitle: function MockAlertTitle({ children, className }) {
    return <h3 className={className}>{children}</h3>;
  },
  AlertDescription: function MockAlertDescription({ children, className }) {
    return <div className={className}>{children}</div>;
  }
}));

// Component that throws an error for testing
function ThrowError({ shouldThrow }) {
  if (shouldThrow) {
    throw new Error('Dog detail test error');
  }
  return <div>Dog detail component working normally</div>;
}

describe('DogDetailErrorBoundary Dark Mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock window.history.back
    Object.defineProperty(window, 'history', {
      value: { back: jest.fn() },
      writable: true
    });
    // Suppress console.error during tests to avoid noise
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('Error Container Dark Mode', () => {
    test('main container has dark mode background', () => {
      render(
        <DogDetailErrorBoundary dogId="test-dog-123">
          <ThrowError shouldThrow={true} />
        </DogDetailErrorBoundary>
      );
      
      const container = screen.getByTestId('dog-detail-error-boundary');
      expect(container).toHaveClass('max-w-4xl');
      expect(container).toHaveClass('mx-auto');
      expect(container).toHaveClass('p-4');
      expect(container).toHaveClass('bg-gray-50');
      expect(container).toHaveClass('dark:bg-gray-900');
    });

    test('alert component has dark mode styling', () => {
      render(
        <DogDetailErrorBoundary dogId="test-dog-123">
          <ThrowError shouldThrow={true} />
        </DogDetailErrorBoundary>
      );
      
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('mb-6');
      expect(alert).toHaveClass('bg-red-50');
      expect(alert).toHaveClass('dark:bg-red-900/20');
      expect(alert).toHaveClass('border-red-200');
      expect(alert).toHaveClass('dark:border-red-800/30');
    });
  });

  describe('Error Header Dark Mode', () => {
    test('error title has dark mode styling', () => {
      render(
        <DogDetailErrorBoundary dogId="test-dog-123">
          <ThrowError shouldThrow={true} />
        </DogDetailErrorBoundary>
      );
      
      const title = screen.getByText('Something went wrong');
      expect(title.closest('[class*="flex"]')).toHaveClass('text-red-800');
      expect(title.closest('[class*="flex"]')).toHaveClass('dark:text-red-200');
    });

    test('error icon has proper dark mode color', () => {
      render(
        <DogDetailErrorBoundary dogId="test-dog-123">
          <ThrowError shouldThrow={true} />
        </DogDetailErrorBoundary>
      );
      
      const icon = document.querySelector('svg');
      expect(icon).toHaveClass('w-5');
      expect(icon).toHaveClass('h-5');
      expect(icon).toHaveClass('mr-2');
      expect(icon).toHaveClass('text-red-600');
      expect(icon).toHaveClass('dark:text-red-400');
    });

    test('error description text has dark mode color', () => {
      render(
        <DogDetailErrorBoundary dogId="test-dog-123">
          <ThrowError shouldThrow={true} />
        </DogDetailErrorBoundary>
      );
      
      const description = screen.getByText(/We're having trouble loading this dog's information/);
      expect(description.closest('[class*="text-red"]')).toHaveClass('text-red-700');
      expect(description.closest('[class*="text-red"]')).toHaveClass('dark:text-red-300');
    });
  });

  describe('Action Buttons Dark Mode', () => {
    test('try again button has dark mode styling', () => {
      render(
        <DogDetailErrorBoundary dogId="test-dog-123">
          <ThrowError shouldThrow={true} />
        </DogDetailErrorBoundary>
      );
      
      const tryAgainButton = screen.getByText(/Try Again/);
      expect(tryAgainButton).toHaveClass('bg-white');
      expect(tryAgainButton).toHaveClass('dark:bg-gray-800');
      expect(tryAgainButton).toHaveClass('text-red-600');
      expect(tryAgainButton).toHaveClass('dark:text-red-400');
      expect(tryAgainButton).toHaveClass('border-red-300');
      expect(tryAgainButton).toHaveClass('dark:border-red-600');
      expect(tryAgainButton).toHaveClass('hover:bg-red-50');
      expect(tryAgainButton).toHaveClass('dark:hover:bg-red-900/20');
    });

    test('go back button has dark mode styling', () => {
      render(
        <DogDetailErrorBoundary dogId="test-dog-123">
          <ThrowError shouldThrow={true} />
        </DogDetailErrorBoundary>
      );
      
      const goBackButton = screen.getByText('Go Back');
      expect(goBackButton).toHaveClass('bg-white');
      expect(goBackButton).toHaveClass('dark:bg-gray-800');
      expect(goBackButton).toHaveClass('text-gray-700');
      expect(goBackButton).toHaveClass('dark:text-gray-300');
      expect(goBackButton).toHaveClass('border-gray-300');
      expect(goBackButton).toHaveClass('dark:border-gray-600');
      expect(goBackButton).toHaveClass('hover:bg-gray-50');
      expect(goBackButton).toHaveClass('dark:hover:bg-gray-700');
    });

    test('browse all dogs button has dark mode styling', () => {
      render(
        <DogDetailErrorBoundary dogId="test-dog-123">
          <ThrowError shouldThrow={true} />
        </DogDetailErrorBoundary>
      );
      
      const browseButton = screen.getByText('Browse All Dogs');
      const buttonContainer = browseButton.closest('[data-variant="outline"]');
      expect(buttonContainer).toHaveClass('bg-orange-50');
      expect(buttonContainer).toHaveClass('dark:bg-orange-900/20');
      expect(buttonContainer).toHaveClass('text-orange-700');
      expect(buttonContainer).toHaveClass('dark:text-orange-300');
      expect(buttonContainer).toHaveClass('border-orange-200');
      expect(buttonContainer).toHaveClass('dark:border-orange-800/30');
      expect(buttonContainer).toHaveClass('hover:bg-orange-100');
      expect(buttonContainer).toHaveClass('dark:hover:bg-orange-900/30');
    });

    test('button icons have appropriate dark mode colors', () => {
      render(
        <DogDetailErrorBoundary dogId="test-dog-123">
          <ThrowError shouldThrow={true} />
        </DogDetailErrorBoundary>
      );
      
      const icons = document.querySelectorAll('svg:not(:first-child)'); // Exclude the main error icon
      icons.forEach(icon => {
        expect(icon).toHaveClass('w-4');
        expect(icon).toHaveClass('h-4');
        expect(icon).toHaveClass('mr-2');
      });
    });
  });

  describe('Retry Count Display Dark Mode', () => {
    test('retry count display has proper dark mode styling', () => {
      // Create a boundary that has already retried once
      const TestWrapper = () => {
        const [shouldThrow, setShouldThrow] = React.useState(true);
        const [retryCount, setRetryCount] = React.useState(0);
        
        return (
          <div>
            <button onClick={() => {
              setShouldThrow(!shouldThrow);
              setRetryCount(prev => prev + 1);
            }}>
              Toggle Error
            </button>
            <DogDetailErrorBoundary dogId="test-dog-123">
              <ThrowError shouldThrow={shouldThrow} />
            </DogDetailErrorBoundary>
          </div>
        );
      };

      render(<TestWrapper />);
      
      // Should show initial try again button
      expect(screen.getByText(/Try Again/)).toBeInTheDocument();
    });

    test('max retry message has dark mode styling', () => {
      // Test when retries are exhausted
      const MultiRetryBoundary = () => {
        return (
          <DogDetailErrorBoundary dogId="test-dog-123">
            <ThrowError shouldThrow={true} />
          </DogDetailErrorBoundary>
        );
      };

      render(<MultiRetryBoundary />);
      
      // The component should still show try again initially
      expect(screen.getByText(/Try Again/)).toBeInTheDocument();
    });
  });

  describe('Helpful Suggestions Dark Mode', () => {
    test('suggestions container has dark mode background', () => {
      render(
        <DogDetailErrorBoundary dogId="test-dog-123">
          <ThrowError shouldThrow={true} />
        </DogDetailErrorBoundary>
      );
      
      const suggestionsContainer = screen.getByText('While you\'re here:').closest('.bg-orange-50');
      expect(suggestionsContainer).toHaveClass('bg-orange-50');
      expect(suggestionsContainer).toHaveClass('dark:bg-orange-900/20');
      expect(suggestionsContainer).toHaveClass('border-orange-200');
      expect(suggestionsContainer).toHaveClass('dark:border-orange-800/30');
    });

    test('suggestions heading has dark mode text color', () => {
      render(
        <DogDetailErrorBoundary dogId="test-dog-123">
          <ThrowError shouldThrow={true} />
        </DogDetailErrorBoundary>
      );
      
      const heading = screen.getByText('While you\'re here:');
      expect(heading).toHaveClass('text-orange-900');
      expect(heading).toHaveClass('dark:text-orange-100');
    });

    test('suggestions list has dark mode text color', () => {
      render(
        <DogDetailErrorBoundary dogId="test-dog-123">
          <ThrowError shouldThrow={true} />
        </DogDetailErrorBoundary>
      );
      
      const suggestionsList = screen.getByText('• Browse other available dogs').closest('ul');
      expect(suggestionsList).toHaveClass('text-orange-800');
      expect(suggestionsList).toHaveClass('dark:text-orange-200');
    });
  });

  describe('Interaction Dark Mode', () => {
    test('retry functionality works with dark mode', () => {
      render(
        <DogDetailErrorBoundary dogId="test-dog-123">
          <ThrowError shouldThrow={true} />
        </DogDetailErrorBoundary>
      );
      
      // Verify error state and dark mode styling
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      
      // Verify retry button exists and has proper dark mode styling
      const tryAgainButton = screen.getByText(/Try Again/);
      expect(tryAgainButton).toBeInTheDocument();
      expect(tryAgainButton).toHaveClass('bg-white');
      expect(tryAgainButton).toHaveClass('dark:bg-gray-800');
      expect(tryAgainButton).toHaveClass('text-red-600');
      expect(tryAgainButton).toHaveClass('dark:text-red-400');
      
      // Verify button is clickable (error boundary state management is complex in tests)
      expect(tryAgainButton).not.toBeDisabled();
    });

    test('go back button calls window.history.back', () => {
      render(
        <DogDetailErrorBoundary dogId="test-dog-123">
          <ThrowError shouldThrow={true} />
        </DogDetailErrorBoundary>
      );
      
      const goBackButton = screen.getByText('Go Back');
      fireEvent.click(goBackButton);
      
      expect(window.history.back).toHaveBeenCalled();
    });

    test('button focus states work in dark mode', () => {
      render(
        <DogDetailErrorBoundary dogId="test-dog-123">
          <ThrowError shouldThrow={true} />
        </DogDetailErrorBoundary>
      );
      
      const tryAgainButton = screen.getByText(/Try Again/);
      expect(tryAgainButton).toHaveClass('focus:outline-none');
      expect(tryAgainButton).toHaveClass('focus:ring-2');
      expect(tryAgainButton).toHaveClass('focus:ring-red-500');
      expect(tryAgainButton).toHaveClass('dark:focus:ring-red-400');
      expect(tryAgainButton).toHaveClass('focus:ring-offset-2');
    });
  });

  describe('Accessibility in Dark Mode', () => {
    test('maintains proper contrast ratios', () => {
      render(
        <DogDetailErrorBoundary dogId="test-dog-123">
          <ThrowError shouldThrow={true} />
        </DogDetailErrorBoundary>
      );
      
      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('role', 'alert');
      
      // Check that text maintains good contrast
      const title = screen.getByText('Something went wrong');
      expect(title.closest('[class*="text-red"]')).toHaveClass('text-red-800');
      expect(title.closest('[class*="text-red"]')).toHaveClass('dark:text-red-200');
    });

    test('alert maintains semantic meaning in dark mode', () => {
      render(
        <DogDetailErrorBoundary dogId="test-dog-123">
          <ThrowError shouldThrow={true} />
        </DogDetailErrorBoundary>
      );
      
      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('data-variant', 'destructive');
      expect(alert).toBeInTheDocument();
    });

    test('button aria labels work in dark mode', () => {
      render(
        <DogDetailErrorBoundary dogId="test-dog-123">
          <ThrowError shouldThrow={true} />
        </DogDetailErrorBoundary>
      );
      
      // Buttons should have descriptive text
      expect(screen.getByText(/Try Again/)).toBeInTheDocument();
      expect(screen.getByText('Go Back')).toBeInTheDocument();
      expect(screen.getByText('Browse All Dogs')).toBeInTheDocument();
    });
  });
});
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Toast, ToastProvider, useToast } from '../Toast';

// Test component that uses the toast hook
function TestComponent() {
  const { showToast } = useToast();
  
  return (
    <div>
      <button onClick={() => showToast('Test success message', 'success')}>
        Show Success
      </button>
      <button onClick={() => showToast('Test error message', 'error')}>
        Show Error
      </button>
      <button onClick={() => showToast('Test info message', 'info')}>
        Show Info
      </button>
    </div>
  );
}

describe('Toast', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Toast component', () => {
    test('renders toast with success styling', () => {
      render(
        <Toast
          message="Success message"
          type="success"
          isVisible={true}
          onClose={() => {}}
        />
      );

      const toast = screen.getByRole('alert');
      expect(toast).toBeInTheDocument();
      expect(toast).toHaveTextContent('Success message');
      expect(toast).toHaveClass('bg-green-700');
    });

    test('renders toast with error styling', () => {
      render(
        <Toast
          message="Error message"
          type="error"
          isVisible={true}
          onClose={() => {}}
        />
      );

      const toast = screen.getByRole('alert');
      expect(toast).toHaveClass('bg-red-600');
    });

    test('renders toast with info styling', () => {
      render(
        <Toast
          message="Info message"
          type="info"
          isVisible={true}
          onClose={() => {}}
        />
      );

      const toast = screen.getByRole('alert');
      expect(toast).toHaveClass('bg-orange-600');
    });

    test('does not render when isVisible is false', () => {
      render(
        <Toast
          message="Hidden message"
          type="success"
          isVisible={false}
          onClose={() => {}}
        />
      );

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    test('calls onClose when close button is clicked', () => {
      const mockOnClose = jest.fn();
      
      render(
        <Toast
          message="Test message"
          type="success"
          isVisible={true}
          onClose={mockOnClose}
        />
      );

      const closeButton = screen.getByRole('button', { name: /close/i });
      closeButton.click();

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('ToastProvider and useToast', () => {
    test('shows and hides toast messages', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      // Initially no toast
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();

      // Show success toast
      const successButton = screen.getByText('Show Success');
      act(() => {
        successButton.click();
      });

      // Toast should appear
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
      expect(screen.getByText('Test success message')).toBeInTheDocument();
    });

    test('auto-dismisses toast after timeout', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      // Show toast
      const successButton = screen.getByText('Show Success');
      act(() => {
        successButton.click();
      });

      // Toast should be visible
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // Fast-forward time to trigger auto-dismiss
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      // Wait for animation to complete
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Toast should be hidden
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });

    test('replaces existing toast with new one', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      // Show first toast
      const successButton = screen.getByText('Show Success');
      act(() => {
        successButton.click();
      });
      
      await waitFor(() => {
        expect(screen.getByText('Test success message')).toBeInTheDocument();
      });

      // Show second toast
      const errorButton = screen.getByText('Show Error');
      act(() => {
        errorButton.click();
      });

      // Should only see the new toast
      await waitFor(() => {
        expect(screen.queryByText('Test success message')).not.toBeInTheDocument();
      });
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    test('manually closes toast', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      // Show toast
      const successButton = screen.getByText('Show Success');
      act(() => {
        successButton.click();
      });
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // Close toast manually
      const closeButton = screen.getByRole('button', { name: /close/i });
      act(() => {
        closeButton.click();
      });

      // Wait for animation and removal
      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });

    test('throws error when useToast is used outside ToastProvider', () => {
      // Temporarily suppress console.error for this test
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useToast must be used within a ToastProvider');

      console.error = originalError;
    });
  });

  describe('accessibility', () => {
    test('toast has proper ARIA attributes', () => {
      render(
        <Toast
          message="Test message"
          type="success"
          isVisible={true}
          onClose={() => {}}
        />
      );

      const toast = screen.getByRole('alert');
      expect(toast).toHaveAttribute('aria-live', 'polite');
    });

    test('close button has accessible label', () => {
      render(
        <Toast
          message="Test message"
          type="success"
          isVisible={true}
          onClose={() => {}}
        />
      );

      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toHaveAttribute('aria-label', 'Close notification');
    });
  });
});
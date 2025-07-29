import React from 'react';
import { render } from '@testing-library/react';
import { ToastProvider } from './components/ui/Toast';

// Test wrapper that provides necessary context providers
const AllProviders = ({ children }) => {
  return (
    <ToastProvider>
      {children}
    </ToastProvider>
  );
};

// Custom render function that includes providers
export const renderWithProviders = (ui, options) => {
  return render(ui, { wrapper: AllProviders, ...options });
};

// Mock IntersectionObserver that's more complete than the global one
export const createMockIntersectionObserver = () => {
  const mockIntersectionObserver = jest.fn();
  mockIntersectionObserver.mockReturnValue({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
    root: null,
    rootMargin: '0px',
    thresholds: [0],
  });
  return mockIntersectionObserver;
};

// Helper to safely mock and restore IntersectionObserver
export const withIntersectionObserver = (testFn) => {
  return () => {
    const originalIO = global.IntersectionObserver;
    const mockIO = createMockIntersectionObserver();
    global.IntersectionObserver = mockIO;
    
    try {
      return testFn();
    } finally {
      global.IntersectionObserver = originalIO;
    }
  };
};

// Helper to test components without IntersectionObserver
export const withoutIntersectionObserver = (testFn) => {
  return () => {
    const originalIO = global.IntersectionObserver;
    delete global.IntersectionObserver;
    
    try {
      return testFn();
    } finally {
      global.IntersectionObserver = originalIO;
    }
  };
};

// Re-export everything from testing-library
export * from '@testing-library/react';
export { renderWithProviders as render };
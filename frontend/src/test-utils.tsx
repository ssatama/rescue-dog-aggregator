/**
 * Test utilities with proper context providers
 */

import React from "react";
import { render as rtlRender, RenderOptions } from "@testing-library/react";

// Mock the hooks first to avoid circular dependencies
const mockUseFavorites = () => ({
  favorites: [],
  count: 0,
  isFavorited: () => false,
  addFavorite: jest.fn(),
  removeFavorite: jest.fn(),
  toggleFavorite: jest.fn(),
  clearFavorites: jest.fn(),
  getShareableUrl: () => "/favorites",
  loadFromUrl: jest.fn(),
  isLoading: false,
});

const mockUseToast = () => ({
  showToast: jest.fn(),
  hideToast: jest.fn(),
});

// Mock the contexts to avoid complex provider setup issues in tests
jest.mock("./contexts/FavoritesContext", () => ({
  useFavorites: mockUseFavorites,
  FavoritesProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="favorites-provider">{children}</div>
  ),
}));

jest.mock("./contexts/ToastContext", () => ({
  useToast: mockUseToast,
  ToastProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="toast-provider">{children}</div>
  ),
}));

// Simple wrapper that just renders the children
const TestProviders = ({ children }: { children: React.ReactNode }) => {
  return <div data-testid="test-wrapper">{children}</div>;
};

const customRender = (ui: React.ReactElement, options?: RenderOptions) =>
  rtlRender(ui, { wrapper: TestProviders, ...options });

// Re-export everything
export * from "@testing-library/react";

// Override render method
export { customRender as render };

// Additional test utilities
export const renderWithProviders = customRender;

export const withoutIntersectionObserver = (fn: () => void) => {
  const originalIO = global.IntersectionObserver;
  // Temporarily remove IntersectionObserver to simulate environments without it
  Object.defineProperty(global, "IntersectionObserver", {
    value: undefined,
    writable: true,
    configurable: true,
  });
  try {
    fn();
  } finally {
    Object.defineProperty(global, "IntersectionObserver", {
      value: originalIO,
      writable: true,
      configurable: true,
    });
  }
};

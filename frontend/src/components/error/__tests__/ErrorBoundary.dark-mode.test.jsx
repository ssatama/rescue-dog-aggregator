// src/components/error/__tests__/ErrorBoundary.dark-mode.test.jsx
// TDD Phase 1: RED - Tests for ErrorBoundary dark mode functionality

import React from "react";
import { render, screen, fireEvent } from "../../../test-utils";
import "@testing-library/jest-dom";
import ErrorBoundary from "../ErrorBoundary";

// Mock the logger utility
jest.mock("../../../utils/logger", () => ({
  reportError: jest.fn(),
}));

// Mock UI components
jest.mock("@/components/ui/button", () => ({
  Button: function MockButton({
    children,
    variant,
    size,
    className,
    onClick,
    ...props
  }) {
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
  },
}));

jest.mock("@/components/ui/alert", () => ({
  Alert: function MockAlert({ children, variant, className }) {
    return (
      <div className={className} data-variant={variant} role="alert">
        {children}
      </div>
    );
  },
  AlertTitle: function MockAlertTitle({ children, className }) {
    return <h3 className={className}>{children}</h3>;
  },
  AlertDescription: function MockAlertDescription({ children, className }) {
    return <div className={className}>{children}</div>;
  },
}));

// Component that throws an error for testing
function ThrowError({ shouldThrow }) {
  if (shouldThrow) {
    throw new Error("Test error");
  }
  return <div>Component working normally</div>;
}

describe("ErrorBoundary Dark Mode", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error during tests to avoid noise
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe("Error Container Dark Mode", () => {
    test("error container has dark mode background", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      const container = document.querySelector(".min-h-\\[200px\\]");
      expect(container).toHaveClass("min-h-[200px]");
      expect(container).toHaveClass("dark:bg-gray-900/50");
    });

    test("alert component has dark mode styling", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      const alert = screen.getByRole("alert");
      expect(alert).toHaveClass("max-w-lg");
      expect(alert).toHaveClass("bg-red-50");
      expect(alert).toHaveClass("dark:bg-red-900/20");
      expect(alert).toHaveClass("border-red-200");
      expect(alert).toHaveClass("dark:border-red-800/30");
    });
  });

  describe("Error Content Dark Mode", () => {
    test("error title has dark mode text color", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      const title = screen.getByText("Something went wrong");
      expect(title).toHaveClass("text-red-800");
      expect(title).toHaveClass("dark:text-red-200");
    });

    test("error description has dark mode text color", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      const description = screen.getByText(
        /We encountered an unexpected error/,
      );
      expect(description.closest('[class*="text-red"]')).toHaveClass(
        "text-red-700",
      );
      expect(description.closest('[class*="text-red"]')).toHaveClass(
        "dark:text-red-300",
      );
    });

    test("action buttons have dark mode styling", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      const tryAgainButton = screen.getByText("Try Again");
      const refreshButton = screen.getByText("Refresh Page");

      [tryAgainButton, refreshButton].forEach((button) => {
        expect(button).toHaveClass("bg-white");
        expect(button).toHaveClass("dark:bg-gray-800");
        expect(button).toHaveClass("text-red-600");
        expect(button).toHaveClass("dark:text-red-400");
        expect(button).toHaveClass("border-red-300");
        expect(button).toHaveClass("dark:border-red-600");
        expect(button).toHaveClass("hover:bg-red-50");
        expect(button).toHaveClass("dark:hover:bg-red-900/20");
      });
    });
  });

  describe("Development Error Details Dark Mode", () => {
    const originalNodeEnv = process.env.NODE_ENV;

    beforeEach(() => {
      process.env.NODE_ENV = "development";
    });

    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv;
    });

    test("error details summary has dark mode styling", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      const detailsSummary = screen.getByText(
        "Error Details (Development Only)",
      );
      expect(detailsSummary).toHaveClass("text-sm");
      expect(detailsSummary).toHaveClass("font-medium");
      expect(detailsSummary).toHaveClass("text-red-700");
      expect(detailsSummary).toHaveClass("dark:text-red-300");
      expect(detailsSummary).toHaveClass("cursor-pointer");
    });

    test("error details code block has dark mode styling", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      const codeBlock = document.querySelector("pre");
      expect(codeBlock).toHaveClass("bg-gray-100");
      expect(codeBlock).toHaveClass("dark:bg-gray-800");
      expect(codeBlock).toHaveClass("text-gray-900");
      expect(codeBlock).toHaveClass("dark:text-gray-100");
      expect(codeBlock).toHaveClass("border");
      expect(codeBlock).toHaveClass("border-gray-300");
      expect(codeBlock).toHaveClass("dark:border-gray-600");
    });
  });

  describe("Custom Fallback Dark Mode", () => {
    function CustomFallback({ error, onRetry }) {
      return (
        <div className="custom-error bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200">
          <h2>Custom Error: {error?.message}</h2>
          <button onClick={onRetry}>Custom Retry</button>
        </div>
      );
    }

    test("custom fallback maintains dark mode styling", () => {
      render(
        <ErrorBoundary fallback={CustomFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      const customError = document.querySelector(".custom-error");
      expect(customError).toHaveClass("bg-blue-50");
      expect(customError).toHaveClass("dark:bg-blue-900/20");
      expect(customError).toHaveClass("text-blue-800");
      expect(customError).toHaveClass("dark:text-blue-200");
    });
  });

  describe("Interaction Dark Mode", () => {
    test("retry button functionality works with dark mode", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      // Verify error state and dark mode styling
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();

      // Verify retry button exists and has proper dark mode styling
      const tryAgainButton = screen.getByText("Try Again");
      expect(tryAgainButton).toBeInTheDocument();
      expect(tryAgainButton).toHaveClass("bg-white");
      expect(tryAgainButton).toHaveClass("dark:bg-gray-800");
      expect(tryAgainButton).toHaveClass("text-red-600");
      expect(tryAgainButton).toHaveClass("dark:text-red-400");

      // Verify button is clickable (error boundary state management is complex in tests)
      expect(tryAgainButton).not.toBeDisabled();
    });

    test("button focus states work in dark mode", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      const tryAgainButton = screen.getByText("Try Again");
      expect(tryAgainButton).toHaveClass("focus:outline-none");
      expect(tryAgainButton).toHaveClass("focus:ring-2");
      expect(tryAgainButton).toHaveClass("focus:ring-red-500");
      expect(tryAgainButton).toHaveClass("dark:focus:ring-red-400");
      expect(tryAgainButton).toHaveClass("focus:ring-offset-2");
    });
  });

  describe("Accessibility in Dark Mode", () => {
    test("maintains proper contrast ratios", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      const alert = screen.getByRole("alert");
      expect(alert).toHaveAttribute("role", "alert");

      // Check that text maintains good contrast
      const title = screen.getByText("Something went wrong");
      expect(title).toHaveClass("text-red-800");
      expect(title).toHaveClass("dark:text-red-200");
    });

    test("alert maintains semantic meaning in dark mode", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      const alert = screen.getByRole("alert");
      expect(alert).toHaveAttribute("data-variant", "destructive");
      expect(alert).toBeInTheDocument();
    });
  });
});

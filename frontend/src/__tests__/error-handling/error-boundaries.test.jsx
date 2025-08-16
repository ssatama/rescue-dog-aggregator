/**
 * Tests for error boundary components
 */
import React from "react";
import { render, screen } from "../../test-utils";
import ErrorBoundary from "../../components/error/ErrorBoundary";
import DogCardErrorBoundary from "../../components/error/DogCardErrorBoundary";

// Component that throws an error for testing
const ThrowError = ({ shouldThrow = false }) => {
  if (shouldThrow) {
    throw new Error("Test error");
  }
  return <div>No error</div>;
};

describe("Error Boundaries", () => {
  // Suppress console.error for these tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  describe("ErrorBoundary", () => {
    test("should render children when no error occurs", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>,
      );

      expect(screen.getByText("No error")).toBeInTheDocument();
    });

    test("should render fallback UI when error occurs", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.getByText(/try refreshing the page/i)).toBeInTheDocument();
    });

    test("should display custom fallback component", () => {
      const CustomFallback = () => <div>Custom error message</div>;

      render(
        <ErrorBoundary fallback={CustomFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      expect(screen.getByText("Custom error message")).toBeInTheDocument();
    });

    test("should include error details in development mode", () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      expect(screen.getByText(/error details/i)).toBeInTheDocument();

      process.env.NODE_ENV = originalNodeEnv;
    });
  });

  describe("DogCardErrorBoundary", () => {
    test("should render dog card when no error occurs", () => {
      render(
        <DogCardErrorBoundary>
          <div data-testid="dog-card">Dog Card Content</div>
        </DogCardErrorBoundary>,
      );

      expect(screen.getByTestId("dog-card")).toBeInTheDocument();
    });

    test("should render fallback dog card when error occurs", () => {
      render(
        <DogCardErrorBoundary>
          <ThrowError shouldThrow={true} />
        </DogCardErrorBoundary>,
      );

      expect(screen.getByText(/error loading dog/i)).toBeInTheDocument();
      expect(screen.getByText(/please try again later/i)).toBeInTheDocument();
    });

    test("should maintain card layout when error occurs", () => {
      render(
        <DogCardErrorBoundary>
          <ThrowError shouldThrow={true} />
        </DogCardErrorBoundary>,
      );

      const errorCard = screen.getByTestId("error-dog-card");
      expect(errorCard).toHaveClass("bg-red-50");
    });
  });

  describe("Error Reporting", () => {
    test("should report errors in production", () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      // Mock error reporting
      const mockReportError = jest.fn();
      jest.doMock("../../utils/logger", () => ({
        reportError: mockReportError,
      }));

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      process.env.NODE_ENV = originalNodeEnv;
    });
  });
});

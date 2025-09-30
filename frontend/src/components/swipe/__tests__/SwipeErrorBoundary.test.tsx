import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import SwipeErrorBoundary from "../SwipeErrorBoundary";
import * as Sentry from "@sentry/nextjs";

jest.mock("@sentry/nextjs", () => ({
  captureException: jest.fn(),
  withScope: jest.fn((callback) => {
    callback({
      setContext: jest.fn(),
      setTag: jest.fn(),
    });
  }),
}));

const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error("Test error");
  }
  return <div>No error</div>;
};

describe("SwipeErrorBoundary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  it("should render children when there is no error", () => {
    render(
      <SwipeErrorBoundary>
        <div>Test content</div>
      </SwipeErrorBoundary>,
    );

    expect(screen.getByText("Test content")).toBeInTheDocument();
  });

  it("should catch errors and display fallback UI", () => {
    render(
      <SwipeErrorBoundary>
        <ThrowError shouldThrow={true} />
      </SwipeErrorBoundary>,
    );

    expect(screen.getByText(/Oops! Something went wrong/)).toBeInTheDocument();
    expect(
      screen.getByText(/having trouble with the swipe feature/),
    ).toBeInTheDocument();
  });

  it("should report errors to Sentry with context", () => {
    render(
      <SwipeErrorBoundary>
        <ThrowError shouldThrow={true} />
      </SwipeErrorBoundary>,
    );

    expect(Sentry.withScope).toHaveBeenCalled();
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Test error",
      }),
    );
  });

  it("should allow retrying after an error", () => {
    let shouldThrow = true;

    const TestComponent = () => {
      if (shouldThrow) {
        throw new Error("Test error");
      }
      return <div>No error</div>;
    };

    const { rerender } = render(
      <SwipeErrorBoundary>
        <TestComponent />
      </SwipeErrorBoundary>,
    );

    expect(screen.getByText(/Oops! Something went wrong/)).toBeInTheDocument();

    const retryButton = screen.getByText("Try Again");

    // Change the condition before clicking retry
    shouldThrow = false;
    fireEvent.click(retryButton);

    // After clicking retry, the error boundary should reset and re-render children
    expect(screen.getByText("No error")).toBeInTheDocument();
  });

  it("should provide option to go back to main page", () => {
    render(
      <SwipeErrorBoundary>
        <ThrowError shouldThrow={true} />
      </SwipeErrorBoundary>,
    );

    const backButton = screen.getByText("Go to Browse");
    expect(backButton).toBeInTheDocument();
    expect(backButton).toHaveAttribute("href", "/");
  });

  it("should handle errors during component lifecycle", () => {
    const ErrorComponent = () => {
      React.useEffect(() => {
        throw new Error("Lifecycle error");
      }, []);
      return <div>Component</div>;
    };

    render(
      <SwipeErrorBoundary>
        <ErrorComponent />
      </SwipeErrorBoundary>,
    );

    expect(screen.getByText(/Oops! Something went wrong/)).toBeInTheDocument();
    expect(Sentry.captureException).toHaveBeenCalled();
  });

  it("should reset error state when receiving new props", () => {
    const { rerender } = render(
      <SwipeErrorBoundary resetKeys={["key1"]}>
        <ThrowError shouldThrow={true} />
      </SwipeErrorBoundary>,
    );

    expect(screen.getByText(/Oops! Something went wrong/)).toBeInTheDocument();

    rerender(
      <SwipeErrorBoundary resetKeys={["key2"]}>
        <ThrowError shouldThrow={false} />
      </SwipeErrorBoundary>,
    );

    expect(screen.getByText("No error")).toBeInTheDocument();
  });

  it("should include error details in development mode", () => {
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "development",
      writable: true,
      configurable: true,
    });

    render(
      <SwipeErrorBoundary>
        <ThrowError shouldThrow={true} />
      </SwipeErrorBoundary>,
    );

    expect(screen.getByText(/Error details:/)).toBeInTheDocument();
    expect(screen.getByText(/Test error/)).toBeInTheDocument();

    Object.defineProperty(process.env, "NODE_ENV", {
      value: originalEnv,
      writable: true,
      configurable: true,
    });
  });

  it("should not include error details in production mode", () => {
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "production",
      writable: true,
      configurable: true,
    });

    render(
      <SwipeErrorBoundary>
        <ThrowError shouldThrow={true} />
      </SwipeErrorBoundary>,
    );

    expect(screen.queryByText(/Error details:/)).not.toBeInTheDocument();

    Object.defineProperty(process.env, "NODE_ENV", {
      value: originalEnv,
      writable: true,
      configurable: true,
    });
  });

  it("should handle async errors", async () => {
    const AsyncErrorComponent = () => {
      React.useEffect(() => {
        setTimeout(() => {
          throw new Error("Async error");
        }, 0);
      }, []);
      return <div>Async component</div>;
    };

    render(
      <SwipeErrorBoundary>
        <AsyncErrorComponent />
      </SwipeErrorBoundary>,
    );

    // Note: Async errors thrown in setTimeout won't be caught by error boundary
    // This test documents this limitation
    expect(screen.getByText("Async component")).toBeInTheDocument();
  });
});

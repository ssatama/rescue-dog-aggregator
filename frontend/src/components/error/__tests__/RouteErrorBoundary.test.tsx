import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { RouteErrorBoundary } from "../RouteErrorBoundary";
import * as Sentry from "@sentry/nextjs";

jest.mock("@sentry/nextjs", () => ({
  captureException: jest.fn(),
}));

describe("RouteErrorBoundary", () => {
  const mockReset = jest.fn();
  const defaultProps = {
    error: Object.assign(new Error("Test error"), { digest: "abc123" }),
    reset: mockReset,
    feature: "test-feature",
    message: "Test error message",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render the error message", () => {
    render(<RouteErrorBoundary {...defaultProps} />);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Test error message")).toBeInTheDocument();
  });

  it("should capture exception to Sentry with correct tags", () => {
    render(<RouteErrorBoundary {...defaultProps} />);

    expect(Sentry.captureException).toHaveBeenCalledWith(defaultProps.error, {
      tags: { feature: "test-feature", errorType: "server-component" },
      extra: { digest: "abc123" },
    });
  });

  it("should capture exception to Sentry only once on mount", () => {
    const { rerender } = render(<RouteErrorBoundary {...defaultProps} />);

    expect(Sentry.captureException).toHaveBeenCalledTimes(1);

    // Re-render with same error should not capture again
    rerender(<RouteErrorBoundary {...defaultProps} />);
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });

  it("should capture again when error changes", () => {
    const { rerender } = render(<RouteErrorBoundary {...defaultProps} />);

    expect(Sentry.captureException).toHaveBeenCalledTimes(1);

    // Re-render with different error should capture again
    const newError = Object.assign(new Error("New error"), { digest: "xyz789" });
    rerender(
      <RouteErrorBoundary
        {...defaultProps}
        error={newError}
        feature="new-feature"
      />,
    );

    expect(Sentry.captureException).toHaveBeenCalledTimes(2);
    expect(Sentry.captureException).toHaveBeenLastCalledWith(newError, {
      tags: { feature: "new-feature", errorType: "server-component" },
      extra: { digest: "xyz789" },
    });
  });

  it("should handle error without digest", () => {
    const errorWithoutDigest = new Error("Error without digest");
    render(
      <RouteErrorBoundary
        {...defaultProps}
        error={errorWithoutDigest as Error & { digest?: string }}
      />,
    );

    expect(Sentry.captureException).toHaveBeenCalledWith(errorWithoutDigest, {
      tags: { feature: "test-feature", errorType: "server-component" },
      extra: { digest: undefined },
    });
  });

  it("should call reset function when Try again button is clicked", () => {
    render(<RouteErrorBoundary {...defaultProps} />);

    const retryButton = screen.getByText("Try again");
    fireEvent.click(retryButton);

    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it("should render with correct styling classes", () => {
    render(<RouteErrorBoundary {...defaultProps} />);

    const container = screen.getByText("Something went wrong").closest("div");
    expect(container).toHaveClass("text-center");
  });

  it("should use different feature tags for different pages", () => {
    const { rerender } = render(
      <RouteErrorBoundary
        {...defaultProps}
        feature="dogs-catalog"
        message="Dogs catalog error"
      />,
    );

    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        tags: { feature: "dogs-catalog", errorType: "server-component" },
      }),
    );

    jest.clearAllMocks();

    rerender(
      <RouteErrorBoundary
        {...defaultProps}
        error={Object.assign(new Error("New"), { digest: "new" })}
        feature="favorites"
        message="Favorites error"
      />,
    );

    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        tags: { feature: "favorites", errorType: "server-component" },
      }),
    );
  });
});

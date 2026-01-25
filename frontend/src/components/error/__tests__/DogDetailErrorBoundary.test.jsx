/**
 * Test suite for DogDetailErrorBoundary component
 * Ensures graceful error handling with retry functionality
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "../../../test-utils";
import "@testing-library/jest-dom";
import DogDetailErrorBoundary from "../DogDetailErrorBoundary";

// Mock the logger
jest.mock("../../../utils/logger", () => ({
  reportError: jest.fn(),
}));

// Component that throws an error for testing
const ThrowError = ({ shouldThrow = false }) => {
  if (shouldThrow) {
    throw new Error("Test error");
  }
  return <div data-testid="success-content">Content loaded successfully</div>;
};

// Mock window.history.back
const mockHistoryBack = jest.fn();
Object.defineProperty(window, "history", {
  value: { back: mockHistoryBack },
  writable: true,
});

describe("DogDetailErrorBoundary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error for cleaner test output
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  it("should render children when no error occurs", () => {
    render(
      <DogDetailErrorBoundary dogSlug="test-slug-123">
        <ThrowError shouldThrow={false} />
      </DogDetailErrorBoundary>,
    );

    expect(screen.getByTestId("success-content")).toBeInTheDocument();
    expect(
      screen.queryByTestId("dog-detail-error-boundary"),
    ).not.toBeInTheDocument();
  });

  it("should render error UI when child component throws error", () => {
    render(
      <DogDetailErrorBoundary dogSlug="test-slug-123">
        <ThrowError shouldThrow={true} />
      </DogDetailErrorBoundary>,
    );

    expect(screen.getByTestId("dog-detail-error-boundary")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(
      screen.getByText(/We're having trouble loading this dog's information/),
    ).toBeInTheDocument();
  });

  it("should show retry button when retry count is under limit", () => {
    render(
      <DogDetailErrorBoundary dogSlug="test-slug-123">
        <ThrowError shouldThrow={true} />
      </DogDetailErrorBoundary>,
    );

    const retryButton = screen.getByRole("button", { name: /try again/i });
    expect(retryButton).toBeInTheDocument();
    expect(retryButton).toHaveTextContent("Try Again");
  });

  it("should handle retry functionality", () => {
    render(
      <DogDetailErrorBoundary dogSlug="test-slug-123">
        <ThrowError shouldThrow={true} />
      </DogDetailErrorBoundary>,
    );

    // Initially shows error
    expect(screen.getByTestId("dog-detail-error-boundary")).toBeInTheDocument();

    // Click retry button
    const retryButton = screen.getByRole("button", { name: /try again/i });
    fireEvent.click(retryButton);

    // After retry, should still show error boundary (since component still throws)
    // But retry count should be updated
    expect(screen.getByTestId("dog-detail-error-boundary")).toBeInTheDocument();
  });

  it("should track retry count and show it in button text", () => {
    render(
      <DogDetailErrorBoundary dogSlug="test-slug-123">
        <ThrowError shouldThrow={true} />
      </DogDetailErrorBoundary>,
    );

    const retryButton = screen.getByRole("button", { name: /try again/i });

    // Initial state should show "Try Again" without count
    expect(retryButton).toHaveTextContent("Try Again");

    // After first retry, should show count
    fireEvent.click(retryButton);
    expect(screen.getByText(/try again.*\(1\/3\)/i)).toBeInTheDocument();
  });

  it("should hide retry button after 3 attempts", () => {
    const { rerender } = render(
      <DogDetailErrorBoundary dogSlug="test-slug-123">
        <ThrowError shouldThrow={true} />
      </DogDetailErrorBoundary>,
    );

    // Simulate 3 retry attempts
    const retryButton = screen.getByRole("button", { name: /try again/i });
    fireEvent.click(retryButton);

    rerender(
      <DogDetailErrorBoundary dogSlug="test-slug-123">
        <ThrowError shouldThrow={true} />
      </DogDetailErrorBoundary>,
    );

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    rerender(
      <DogDetailErrorBoundary dogSlug="test-slug-123">
        <ThrowError shouldThrow={true} />
      </DogDetailErrorBoundary>,
    );

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    rerender(
      <DogDetailErrorBoundary dogSlug="test-slug-123">
        <ThrowError shouldThrow={true} />
      </DogDetailErrorBoundary>,
    );

    // After 3 retries, should show max retry message
    expect(screen.getByText(/If this problem persists/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /try again/i }),
    ).not.toBeInTheDocument();
  });

  it("should handle go back button functionality", () => {
    render(
      <DogDetailErrorBoundary dogSlug="test-slug-123">
        <ThrowError shouldThrow={true} />
      </DogDetailErrorBoundary>,
    );

    const goBackButton = screen.getByRole("button", { name: /go back/i });
    fireEvent.click(goBackButton);

    expect(mockHistoryBack).toHaveBeenCalledTimes(1);
  });

  it("should provide browse all dogs link", () => {
    render(
      <DogDetailErrorBoundary dogSlug="test-slug-123">
        <ThrowError shouldThrow={true} />
      </DogDetailErrorBoundary>,
    );

    const browseLink = screen.getByRole("link", { name: /browse all dogs/i });
    expect(browseLink).toBeInTheDocument();
    expect(browseLink).toHaveAttribute("href", "/dogs");
  });

  it("should show helpful suggestions section", () => {
    render(
      <DogDetailErrorBoundary dogSlug="test-slug-123">
        <ThrowError shouldThrow={true} />
      </DogDetailErrorBoundary>,
    );

    expect(screen.getByText("While you're here:")).toBeInTheDocument();
    expect(
      screen.getByText("• Browse other available dogs"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("• Search by breed or location"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("• Learn about our rescue partners"),
    ).toBeInTheDocument();
  });

  it("should log error details for monitoring", () => {
    const { reportError } = require("../../../utils/logger");

    render(
      <DogDetailErrorBoundary dogSlug="test-dog-mixed-breed-123">
        <ThrowError shouldThrow={true} />
      </DogDetailErrorBoundary>,
    );

    expect(reportError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        context: "DogDetailErrorBoundary",
        dogSlug: "test-dog-mixed-breed-123",
        retryCount: 0,
      }),
    );
  });

  it("should include error icon in alert title", () => {
    render(
      <DogDetailErrorBoundary dogSlug="test-slug-123">
        <ThrowError shouldThrow={true} />
      </DogDetailErrorBoundary>,
    );

    const alertTitle = screen.getByText("Something went wrong");
    const icon = alertTitle.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });

  it("should have proper button styling and icons", () => {
    render(
      <DogDetailErrorBoundary dogSlug="test-slug-123">
        <ThrowError shouldThrow={true} />
      </DogDetailErrorBoundary>,
    );

    // Retry button should have refresh icon
    const retryButton = screen.getByRole("button", { name: /try again/i });
    const retryIcon = retryButton.querySelector("svg");
    expect(retryIcon).toBeInTheDocument();

    // Go back button should have arrow icon
    const goBackButton = screen.getByRole("button", { name: /go back/i });
    const backIcon = goBackButton.querySelector("svg");
    expect(backIcon).toBeInTheDocument();

    // Browse all dogs button should have list icon
    const browseButton = screen.getByRole("link", { name: /browse all dogs/i });
    const browseIcon = browseButton.querySelector("svg");
    expect(browseIcon).toBeInTheDocument();
  });
});

describe("DogDetailErrorBoundary accessibility", () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  it("should have proper ARIA labels and roles", () => {
    render(
      <DogDetailErrorBoundary dogSlug="test-slug-123">
        <ThrowError shouldThrow={true} />
      </DogDetailErrorBoundary>,
    );

    // Buttons should have accessible text
    expect(
      screen.getByRole("button", { name: /try again/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /go back/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /browse all dogs/i }),
    ).toBeInTheDocument();
  });

  it("should be keyboard navigable", () => {
    render(
      <DogDetailErrorBoundary dogSlug="test-slug-123">
        <ThrowError shouldThrow={true} />
      </DogDetailErrorBoundary>,
    );

    const retryButton = screen.getByRole("button", { name: /try again/i });
    const goBackButton = screen.getByRole("button", { name: /go back/i });
    const browseLink = screen.getByRole("link", { name: /browse all dogs/i });

    // All interactive elements should be focusable
    expect(retryButton).not.toHaveAttribute("disabled");
    expect(goBackButton).not.toHaveAttribute("disabled");
    expect(browseLink).toHaveAttribute("href");
  });

  it("should provide clear error messaging", () => {
    render(
      <DogDetailErrorBoundary dogSlug="test-slug-123">
        <ThrowError shouldThrow={true} />
      </DogDetailErrorBoundary>,
    );

    // Error message should be clear and actionable
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(
      screen.getByText(/We're having trouble loading this dog's information/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/This might be a temporary issue/),
    ).toBeInTheDocument();
  });
});

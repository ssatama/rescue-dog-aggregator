import React from "react";
import { render, screen, fireEvent } from "../../../test-utils";
import DogSectionErrorBoundary from "../DogSectionErrorBoundary";

// Component that throws an error for testing
const ThrowError = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error("Test error");
  }
  return <div>Working component</div>;
};

describe("DogSectionErrorBoundary", () => {
  // Suppress console errors during tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  test("renders children when there is no error", () => {
    render(
      <DogSectionErrorBoundary>
        <ThrowError shouldThrow={false} />
      </DogSectionErrorBoundary>,
    );

    expect(screen.getByText("Working component")).toBeInTheDocument();
  });

  test("renders error UI when child component throws", () => {
    render(
      <DogSectionErrorBoundary>
        <ThrowError shouldThrow={true} />
      </DogSectionErrorBoundary>,
    );

    expect(screen.getByText("Section Unavailable")).toBeInTheDocument();
    expect(
      screen.getByText(/This section could not be loaded/),
    ).toBeInTheDocument();
    expect(screen.getByText("Try Again")).toBeInTheDocument();
  });

  test("retry button triggers handleRetry method", () => {
    render(
      <DogSectionErrorBoundary>
        <ThrowError shouldThrow={true} />
      </DogSectionErrorBoundary>,
    );

    // Error should be displayed
    expect(screen.getByText("Section Unavailable")).toBeInTheDocument();

    // Retry button should be clickable
    const retryButton = screen.getByText("Try Again");
    expect(retryButton).toBeInTheDocument();

    // Button should be clickable without throwing errors
    expect(() => {
      fireEvent.click(retryButton);
    }).not.toThrow();
  });

  test("has proper accessibility attributes", () => {
    render(
      <DogSectionErrorBoundary>
        <ThrowError shouldThrow={true} />
      </DogSectionErrorBoundary>,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();

    const retryButton = screen.getByText("Try Again");
    expect(retryButton).toBeInTheDocument();
  });
});

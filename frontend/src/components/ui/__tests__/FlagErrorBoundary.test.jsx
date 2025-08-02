import React from "react";
import { render, screen } from "@testing-library/react";
import FlagErrorBoundary from "../FlagErrorBoundary";

// Component that always throws an error
const ErrorThrowingComponent = () => {
  throw new Error("Flag loading failed");
};

// Component that works normally
const WorkingComponent = () => {
  return <div data-testid="working-component">Flag loaded successfully</div>;
};

describe("FlagErrorBoundary", () => {
  // Suppress console.error in tests to avoid noise
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  test("renders children when no error occurs", () => {
    render(
      <FlagErrorBoundary countryCode="TR" countryName="Turkey">
        <WorkingComponent />
      </FlagErrorBoundary>,
    );

    expect(screen.getByTestId("working-component")).toBeInTheDocument();
    expect(screen.getByText("Flag loaded successfully")).toBeInTheDocument();
  });

  test("renders fallback UI when error occurs", () => {
    render(
      <FlagErrorBoundary countryCode="TR" countryName="Turkey">
        <ErrorThrowingComponent />
      </FlagErrorBoundary>,
    );

    // Should show country code and name in fallback
    expect(screen.getByText("TR")).toBeInTheDocument();
    expect(screen.getByText("Turkey")).toBeInTheDocument();

    // Should not show the error component
    expect(screen.queryByTestId("working-component")).not.toBeInTheDocument();
  });

  test("renders fallback with placeholder when no country data", () => {
    render(
      <FlagErrorBoundary>
        <ErrorThrowingComponent />
      </FlagErrorBoundary>,
    );

    // Should show default placeholder
    expect(screen.getByText("??")).toBeInTheDocument();
  });

  test("renders fallback with only country code when no name provided", () => {
    render(
      <FlagErrorBoundary countryCode="DE">
        <ErrorThrowingComponent />
      </FlagErrorBoundary>,
    );

    // Should show country code
    expect(screen.getByText("DE")).toBeInTheDocument();

    // Should not show country name since it wasn't provided
    expect(screen.queryByText("Germany")).not.toBeInTheDocument();
  });

  test("fallback has correct styling classes", () => {
    render(
      <FlagErrorBoundary countryCode="FR" countryName="France">
        <ErrorThrowingComponent />
      </FlagErrorBoundary>,
    );

    const fallbackElement = screen.getByText("FR");
    expect(fallbackElement).toHaveClass(
      "text-xs",
      "text-gray-500",
      "px-1",
      "py-0.5",
      "rounded",
      "bg-gray-100",
    );
  });

  test("logs warning when error occurs", () => {
    const consoleSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    render(
      <FlagErrorBoundary countryCode="TR" countryName="Turkey">
        <ErrorThrowingComponent />
      </FlagErrorBoundary>,
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      "Flag loading error:",
      expect.any(Error),
      expect.any(Object),
    );

    consoleSpy.mockRestore();
  });
});

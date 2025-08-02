import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Toast, ToastProvider, useToast, ToastType } from "../Toast";

// Component to test useToast hook
function TestToastComponent() {
  const { showToast, hideToast } = useToast();

  return (
    <div>
      <button onClick={() => showToast("Test message", "success")}>
        Show Success Toast
      </button>
      <button onClick={() => showToast("Error message", "error")}>
        Show Error Toast
      </button>
      <button onClick={() => showToast("Info message", "info")}>
        Show Info Toast
      </button>
      <button onClick={() => hideToast()}>Hide Toast</button>
    </div>
  );
}

describe("Toast TypeScript Tests", () => {
  test("Toast component accepts properly typed props", () => {
    const mockOnClose = jest.fn();

    render(
      <Toast
        message="Test message"
        type="success"
        isVisible={true}
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByText("Test message")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  test("Toast accepts all valid ToastType values", () => {
    const mockOnClose = jest.fn();
    const types: ToastType[] = ["success", "error", "info"];

    types.forEach((type) => {
      const { unmount } = render(
        <Toast
          message={`${type} message`}
          type={type}
          isVisible={true}
          onClose={mockOnClose}
        />,
      );

      expect(screen.getByText(`${type} message`)).toBeInTheDocument();
      unmount();
    });
  });

  test("ToastProvider properly types children prop", () => {
    render(
      <ToastProvider>
        <div data-testid="child-element">Child content</div>
      </ToastProvider>,
    );

    expect(screen.getByTestId("child-element")).toBeInTheDocument();
  });

  test("useToast hook returns properly typed context", () => {
    render(
      <ToastProvider>
        <TestToastComponent />
      </ToastProvider>,
    );

    const successButton = screen.getByText("Show Success Toast");
    const errorButton = screen.getByText("Show Error Toast");
    const infoButton = screen.getByText("Show Info Toast");

    expect(successButton).toBeInTheDocument();
    expect(errorButton).toBeInTheDocument();
    expect(infoButton).toBeInTheDocument();
  });

  test("showToast function accepts properly typed parameters", async () => {
    render(
      <ToastProvider>
        <TestToastComponent />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText("Show Success Toast"));

    await waitFor(() => {
      expect(screen.getByText("Test message")).toBeInTheDocument();
    });
  });

  test("Toast component handles optional props correctly", () => {
    const mockOnClose = jest.fn();

    render(
      <Toast message="Test message" isVisible={true} onClose={mockOnClose} />,
    );

    expect(screen.getByText("Test message")).toBeInTheDocument();
  });

  test("useToast throws error when used outside provider", () => {
    // Mock console.error to avoid noise in test output
    const originalError = console.error;
    console.error = jest.fn();

    function TestComponent() {
      useToast();
      return <div>Test</div>;
    }

    expect(() => render(<TestComponent />)).toThrow(
      "useToast must be used within a ToastProvider",
    );

    console.error = originalError;
  });
});

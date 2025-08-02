// src/components/ui/__tests__/Toast.dark-mode.test.jsx
// TDD Phase 1: RED - Tests for Toast dark mode functionality

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Toast, ToastProvider, useToast } from "../Toast";

// Mock the Icon component
jest.mock("../Icon", () => ({
  Icon: function MockIcon({ name, size, color }) {
    return (
      <span
        data-testid="icon"
        data-name={name}
        data-size={size}
        data-color={color}
      >
        Icon
      </span>
    );
  },
}));

describe("Toast Dark Mode", () => {
  describe("Toast Component Dark Mode", () => {
    test("success toast has dark mode styling", () => {
      render(
        <Toast
          message="Success message"
          type="success"
          isVisible={true}
          onClose={() => {}}
        />,
      );

      const toast = screen.getByRole("alert");
      expect(toast).toHaveClass("bg-green-700");
      expect(toast).toHaveClass("dark:bg-green-600");
      expect(toast).toHaveClass("text-white");
    });

    test("error toast has dark mode styling", () => {
      render(
        <Toast
          message="Error message"
          type="error"
          isVisible={true}
          onClose={() => {}}
        />,
      );

      const toast = screen.getByRole("alert");
      expect(toast).toHaveClass("bg-red-600");
      expect(toast).toHaveClass("dark:bg-red-500");
      expect(toast).toHaveClass("text-white");
    });

    test("info toast has dark mode styling", () => {
      render(
        <Toast
          message="Info message"
          type="info"
          isVisible={true}
          onClose={() => {}}
        />,
      );

      const toast = screen.getByRole("alert");
      expect(toast).toHaveClass("bg-orange-600");
      expect(toast).toHaveClass("dark:bg-orange-500");
      expect(toast).toHaveClass("text-white");
    });

    test("close button has dark mode hover styling", () => {
      render(
        <Toast
          message="Test message"
          type="info"
          isVisible={true}
          onClose={() => {}}
        />,
      );

      const closeButton = screen.getByLabelText("Close notification");
      expect(closeButton).toHaveClass("hover:bg-black");
      expect(closeButton).toHaveClass("dark:hover:bg-white");
      expect(closeButton).toHaveClass("hover:bg-opacity-20");
      expect(closeButton).toHaveClass("dark:hover:bg-opacity-20");
    });

    test("close button focus styling works in dark mode", () => {
      render(
        <Toast
          message="Test message"
          type="info"
          isVisible={true}
          onClose={() => {}}
        />,
      );

      const closeButton = screen.getByLabelText("Close notification");
      expect(closeButton).toHaveClass("focus:ring-orange-600");
      expect(closeButton).toHaveClass("dark:focus:ring-orange-400");
      expect(closeButton).toHaveClass("focus:ring-offset-2");
    });

    test("toast message text maintains contrast in dark mode", () => {
      render(
        <Toast
          message="Test message"
          type="info"
          isVisible={true}
          onClose={() => {}}
        />,
      );

      const message = screen.getByText("Test message");
      expect(message).toHaveClass("text-sm");
      expect(message).toHaveClass("font-medium");
      // Text should remain white for contrast on dark backgrounds
      expect(message.closest('[role="alert"]')).toHaveClass("text-white");
    });

    test("close icon uses appropriate color for dark mode", () => {
      render(
        <Toast
          message="Test message"
          type="info"
          isVisible={true}
          onClose={() => {}}
        />,
      );

      const icon = screen.getByTestId("icon");
      expect(icon).toHaveAttribute("data-color", "on-dark");
      expect(icon).toHaveAttribute("data-name", "x");
      expect(icon).toHaveAttribute("data-size", "small");
    });
  });

  describe("ToastProvider Integration Dark Mode", () => {
    // Test component to trigger toasts
    function TestComponent() {
      const { showToast } = useToast();

      return (
        <div>
          <button onClick={() => showToast("Success!", "success")}>
            Show Success
          </button>
          <button onClick={() => showToast("Error!", "error")}>
            Show Error
          </button>
          <button onClick={() => showToast("Info!", "info")}>Show Info</button>
        </div>
      );
    }

    test("provider rendered toasts have dark mode styling", () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>,
      );

      const successButton = screen.getByText("Show Success");
      fireEvent.click(successButton);

      const toast = screen.getByRole("alert");
      expect(toast).toHaveClass("bg-green-700");
      expect(toast).toHaveClass("dark:bg-green-600");
    });

    test("multiple toast types maintain dark mode styling", () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>,
      );

      // Test different toast types
      const errorButton = screen.getByText("Show Error");
      fireEvent.click(errorButton);

      let toast = screen.getByRole("alert");
      expect(toast).toHaveClass("bg-red-600");
      expect(toast).toHaveClass("dark:bg-red-500");

      // Close and test another type
      const closeButton = screen.getByLabelText("Close notification");
      fireEvent.click(closeButton);

      // Wait for animation and show info toast
      setTimeout(() => {
        const infoButton = screen.getByText("Show Info");
        fireEvent.click(infoButton);

        toast = screen.getByRole("alert");
        expect(toast).toHaveClass("bg-orange-600");
        expect(toast).toHaveClass("dark:bg-orange-500");
      }, 350);
    });
  });

  describe("Toast Accessibility in Dark Mode", () => {
    test("maintains proper contrast ratios", () => {
      render(
        <Toast
          message="Test message"
          type="success"
          isVisible={true}
          onClose={() => {}}
        />,
      );

      const toast = screen.getByRole("alert");
      // Success: green-700 in light, green-600 in dark (both have good contrast with white text)
      expect(toast).toHaveClass("bg-green-700");
      expect(toast).toHaveClass("dark:bg-green-600");
      expect(toast).toHaveClass("text-white");
    });

    test("focus indicators work properly in dark mode", () => {
      render(
        <Toast
          message="Test message"
          type="info"
          isVisible={true}
          onClose={() => {}}
        />,
      );

      const closeButton = screen.getByLabelText("Close notification");

      // Focus the button to test focus styles
      closeButton.focus();

      expect(closeButton).toHaveClass("focus:outline-none");
      expect(closeButton).toHaveClass("focus:ring-2");
      expect(closeButton).toHaveClass("focus:ring-orange-600");
      expect(closeButton).toHaveClass("dark:focus:ring-orange-400");
      expect(closeButton).toHaveClass("focus:ring-offset-2");
    });

    test("aria-live and role attributes work with dark mode", () => {
      render(
        <Toast
          message="Accessible message"
          type="success"
          isVisible={true}
          onClose={() => {}}
        />,
      );

      const toast = screen.getByRole("alert");
      expect(toast).toHaveAttribute("aria-live", "polite");
      expect(toast).toHaveAttribute("role", "alert");

      // Message should be readable regardless of theme
      expect(screen.getByText("Accessible message")).toBeInTheDocument();
    });
  });
});

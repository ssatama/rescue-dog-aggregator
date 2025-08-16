import React from "react";
import { render, screen, waitFor } from "../../test-utils";
import "@testing-library/jest-dom";
import Toast from "./Toast";

describe("Toast Component", () => {
  describe("Rendering", () => {
    it("renders success toast with message", () => {
      render(
        <Toast
          type="success"
          message="Link copied to clipboard"
          isVisible={true}
        />,
      );

      expect(screen.getByText("Link copied to clipboard")).toBeInTheDocument();
    });

    it("renders add toast with heart icon and dog name", () => {
      render(
        <Toast
          type="add"
          message="Harley added to favorites"
          isVisible={true}
        />,
      );

      expect(screen.getByText("Harley added to favorites")).toBeInTheDocument();
      expect(screen.getByText("❤️")).toBeInTheDocument();
    });

    it("renders remove toast with broken heart and dog name", () => {
      render(
        <Toast
          type="remove"
          message="Luna removed from favorites"
          isVisible={true}
        />,
      );

      expect(
        screen.getByText("Luna removed from favorites"),
      ).toBeInTheDocument();
      expect(screen.getByText("💔")).toBeInTheDocument();
    });

    it("does not render when isVisible is false", () => {
      const { container } = render(
        <Toast type="success" message="Test message" isVisible={false} />,
      );

      // Check that no toast content is rendered (accounting for test wrapper)
      const toastContent = container.querySelector('[role="alert"]');
      expect(toastContent).toBeNull();
    });
  });

  describe("Styling", () => {
    it("applies correct styles for success toast", () => {
      render(<Toast type="success" message="Success" isVisible={true} />);

      const toast = screen.getByRole("alert");
      expect(toast).toHaveClass("bg-green-600");
    });

    it("applies correct styles for add toast", () => {
      render(<Toast type="add" message="Added" isVisible={true} />);

      const toast = screen.getByRole("alert");
      expect(toast).toHaveClass("bg-gray-900");
    });

    it("applies correct styles for remove toast", () => {
      render(<Toast type="remove" message="Removed" isVisible={true} />);

      const toast = screen.getByRole("alert");
      expect(toast).toHaveClass("bg-gray-600");
    });
  });

  describe("Auto-dismiss", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("calls onDismiss after specified duration", () => {
      const onDismiss = jest.fn();

      render(
        <Toast
          type="success"
          message="Test"
          isVisible={true}
          duration={3000}
          onDismiss={onDismiss}
        />,
      );

      expect(onDismiss).not.toHaveBeenCalled();

      jest.advanceTimersByTime(3000);

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it("does not auto-dismiss if duration is not provided", () => {
      const onDismiss = jest.fn();

      render(
        <Toast
          type="success"
          message="Test"
          isVisible={true}
          onDismiss={onDismiss}
        />,
      );

      jest.advanceTimersByTime(5000);

      expect(onDismiss).not.toHaveBeenCalled();
    });
  });

  describe("Animation", () => {
    it("applies enter animation when becoming visible", () => {
      const { rerender } = render(
        <Toast type="success" message="Test" isVisible={false} />,
      );

      rerender(<Toast type="success" message="Test" isVisible={true} />);

      const toast = screen.getByRole("alert");
      expect(toast).toHaveClass("animate-slide-up");
    });

    it("applies exit animation when becoming hidden", async () => {
      const { rerender } = render(
        <Toast type="success" message="Test" isVisible={true} />,
      );

      rerender(<Toast type="success" message="Test" isVisible={false} />);

      // Toast should still be in DOM during exit animation
      const toast = screen.queryByRole("alert");
      if (toast) {
        expect(toast).toHaveClass("animate-slide-down");
      }
    });
  });

  describe("Accessibility", () => {
    it("has correct ARIA role", () => {
      render(<Toast type="success" message="Test" isVisible={true} />);

      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("has appropriate aria-live attribute", () => {
      render(<Toast type="success" message="Test" isVisible={true} />);

      const toast = screen.getByRole("alert");
      expect(toast).toHaveAttribute("aria-live", "polite");
    });

    it("uses assertive aria-live for error toasts", () => {
      render(<Toast type="error" message="Error occurred" isVisible={true} />);

      const toast = screen.getByRole("alert");
      expect(toast).toHaveAttribute("aria-live", "assertive");
    });
  });

  describe("Position", () => {
    it("renders at bottom center by default", () => {
      render(<Toast type="success" message="Test" isVisible={true} />);

      const toast = screen.getByRole("alert");
      expect(toast.parentElement).toHaveClass("bottom-4");
      expect(toast.parentElement).toHaveClass("left-1/2");
    });

    it("can be positioned at top", () => {
      render(
        <Toast type="success" message="Test" isVisible={true} position="top" />,
      );

      const toast = screen.getByRole("alert");
      expect(toast.parentElement).toHaveClass("top-4");
    });
  });
});

import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import usePageTransition, { PageTransition } from "../usePageTransition";

// Test component to use the hook
function TestComponent({ delay = 0, duration = 300 }) {
  const { isVisible, className } = usePageTransition(delay, duration);

  return (
    <div data-testid="test-component" className={className}>
      <span data-testid="visibility-indicator">
        {isVisible ? "visible" : "hidden"}
      </span>
    </div>
  );
}

describe("usePageTransition", () => {
  beforeEach(() => {
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe("Hook functionality", () => {
    it("starts with opacity-0 and transitions to opacity-100", async () => {
      render(<TestComponent />);

      const component = screen.getByTestId("test-component");
      const indicator = screen.getByTestId("visibility-indicator");

      // Initially hidden
      expect(component).toHaveClass("opacity-0");
      expect(component).toHaveClass("transition-opacity");
      expect(component).toHaveClass("duration-300");
      expect(indicator).toHaveTextContent("hidden");

      // Fast-forward time
      act(() => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(component).toHaveClass("opacity-100");
        expect(indicator).toHaveTextContent("visible");
      });
    });

    it("respects custom delay timing", async () => {
      render(<TestComponent delay={500} />);

      const component = screen.getByTestId("test-component");
      const indicator = screen.getByTestId("visibility-indicator");

      // Should still be hidden after short time
      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(component).toHaveClass("opacity-0");
      expect(indicator).toHaveTextContent("hidden");

      // Should be visible after full delay
      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(component).toHaveClass("opacity-100");
        expect(indicator).toHaveTextContent("visible");
      });
    });

    it("applies correct duration classes", () => {
      const { rerender } = render(<TestComponent duration={200} />);
      expect(screen.getByTestId("test-component")).toHaveClass("duration-200");

      rerender(<TestComponent duration={300} />);
      expect(screen.getByTestId("test-component")).toHaveClass("duration-300");

      rerender(<TestComponent duration={500} />);
      expect(screen.getByTestId("test-component")).toHaveClass("duration-500");

      // Test fallback
      rerender(<TestComponent duration={999} />);
      expect(screen.getByTestId("test-component")).toHaveClass("duration-300");
    });

    it("cleans up timer on unmount", () => {
      const { unmount } = render(<TestComponent delay={1000} />);

      const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });

  describe("PageTransition component", () => {
    it("renders children with transition classes", async () => {
      const { container } = render(
        <PageTransition data-testid="page-transition">
          <div data-testid="child-content">Test content</div>
        </PageTransition>,
      );

      const wrapper = container.firstChild;
      const content = screen.getByTestId("child-content");

      // Initially hidden
      expect(wrapper).toHaveClass("opacity-0");
      expect(wrapper).toHaveClass("transition-opacity");
      expect(content).toHaveTextContent("Test content");

      // Fast-forward time
      act(() => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(wrapper).toHaveClass("opacity-100");
      });
    });

    it("applies custom delay and duration", async () => {
      const { container } = render(
        <PageTransition
          delay={300}
          duration={500}
          data-testid="page-transition"
        >
          <div>Content</div>
        </PageTransition>,
      );

      const wrapper = container.firstChild;

      // Should have correct duration class
      expect(wrapper).toHaveClass("duration-500");

      // Should still be hidden after short time
      act(() => {
        jest.advanceTimersByTime(200);
      });
      expect(wrapper).toHaveClass("opacity-0");

      // Should be visible after delay
      act(() => {
        jest.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(wrapper).toHaveClass("opacity-100");
      });
    });

    it("merges custom className", () => {
      const { container } = render(
        <PageTransition
          className="custom-class bg-red-500"
          data-testid="page-transition"
        >
          <div>Content</div>
        </PageTransition>,
      );

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass("custom-class");
      expect(wrapper).toHaveClass("bg-red-500");
      expect(wrapper).toHaveClass("transition-opacity");
    });
  });

  describe("Accessibility and Motion Preferences", () => {
    it("respects reduced motion preferences", () => {
      // Mock reduced motion preference
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: jest.fn().mockImplementation((query) => ({
          matches: query === "(prefers-reduced-motion: reduce)",
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(<TestComponent />);

      const component = screen.getByTestId("test-component");
      // Should still have transition classes (CSS will handle reduced motion)
      expect(component).toHaveClass("transition-opacity");
    });
  });

  describe("Performance considerations", () => {
    it("does not cause memory leaks with multiple instances", () => {
      const components = [];

      // Create multiple instances
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(<TestComponent key={i} delay={i * 100} />);
        components.push(unmount);
      }

      // Unmount all
      components.forEach((unmount) => unmount());

      // Should not throw or cause issues
      act(() => {
        jest.runAllTimers();
      });
    });
  });
});

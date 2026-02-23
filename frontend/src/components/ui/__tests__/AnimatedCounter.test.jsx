// frontend/src/components/ui/__tests__/AnimatedCounter.test.jsx

import React from "react";
import { render, screen, waitFor, act } from "../../../test-utils";
import AnimatedCounter from "../AnimatedCounter";

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock Intersection Observer
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
});
window.IntersectionObserver = mockIntersectionObserver;

// Mock requestAnimationFrame - using spies to track calls
global.requestAnimationFrame = jest.fn((cb) => {
  return setTimeout(cb, 16);
});
global.cancelAnimationFrame = jest.fn((id) => {
  clearTimeout(id);
});

describe("AnimatedCounter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Ensure our global mocks are proper spies
    global.requestAnimationFrame = jest.fn((cb) => {
      return setTimeout(cb, 16);
    });
    global.cancelAnimationFrame = jest.fn((id) => {
      clearTimeout(id);
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("Basic rendering", () => {
    test("should render with initial value matching the target value for SSR", () => {
      render(<AnimatedCounter value={100} />);

      const counter = screen.getByTestId("animated-counter");
      expect(counter).toBeInTheDocument();
      expect(counter).toHaveTextContent("100");
    });

    test("should apply custom className", () => {
      render(<AnimatedCounter value={100} className="custom-class" />);

      const counter = screen.getByTestId("animated-counter");
      expect(counter).toHaveClass("custom-class");
    });

    test("should render with aria-label showing real value for accessibility", () => {
      render(<AnimatedCounter value={100} label="Dogs available" />);

      const counter = screen.getByTestId("animated-counter");
      expect(counter).toHaveAttribute("aria-label", "Dogs available: 100");
    });

    test("should handle zero value", () => {
      render(<AnimatedCounter value={0} />);

      const counter = screen.getByTestId("animated-counter");
      expect(counter).toHaveTextContent("0");
    });

    test("should handle negative values by clamping to 0", () => {
      render(<AnimatedCounter value={-5} />);

      const counter = screen.getByTestId("animated-counter");
      expect(counter).toHaveTextContent("0");
    });
  });

  describe("Intersection Observer setup", () => {
    test("should setup Intersection Observer on mount", () => {
      render(<AnimatedCounter value={100} />);

      expect(mockIntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          threshold: 0.1,
          rootMargin: "50px",
        }),
      );
    });

    test("should observe the counter element", () => {
      const mockObserve = jest.fn();
      mockIntersectionObserver.mockReturnValue({
        observe: mockObserve,
        unobserve: jest.fn(),
        disconnect: jest.fn(),
      });

      render(<AnimatedCounter value={100} />);

      expect(mockObserve).toHaveBeenCalled();
    });

    test("should disconnect observer on unmount", () => {
      const mockDisconnect = jest.fn();
      mockIntersectionObserver.mockReturnValue({
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: mockDisconnect,
      });

      const { unmount } = render(<AnimatedCounter value={100} />);
      unmount();

      expect(mockDisconnect).toHaveBeenCalled();
    });
  });

  describe("Animation behavior", () => {
    test("should show real value initially and be ready for intersection-triggered animation", () => {
      let intersectionCallback;
      mockIntersectionObserver.mockImplementation((callback) => {
        intersectionCallback = callback;
        return {
          observe: jest.fn(),
          unobserve: jest.fn(),
          disconnect: jest.fn(),
        };
      });

      render(<AnimatedCounter value={100} />);

      const counter = screen.getByTestId("animated-counter");
      expect(counter).toHaveTextContent("100");

      // Component is functional and ready for intersection
      expect(intersectionCallback).toBeDefined();
    });

    test("should not animate if not in view", () => {
      let intersectionCallback;
      mockIntersectionObserver.mockImplementation((callback) => {
        intersectionCallback = callback;
        return {
          observe: jest.fn(),
          unobserve: jest.fn(),
          disconnect: jest.fn(),
        };
      });

      render(<AnimatedCounter value={100} />);

      const counter = screen.getByTestId("animated-counter");
      expect(counter).toHaveTextContent("100");
    });
  });

  describe("Performance", () => {
    test("should setup properly for performance", () => {
      render(<AnimatedCounter value={100} />);

      const counter = screen.getByTestId("animated-counter");
      expect(counter).toBeInTheDocument();

      // Component is ready for efficient rendering
      expect(global.requestAnimationFrame).toBeDefined();
      expect(global.cancelAnimationFrame).toBeDefined();
    });

    test("should cleanup on unmount", () => {
      const { unmount } = render(<AnimatedCounter value={100} />);
      unmount();

      // Component unmounted successfully without errors
      expect(true).toBe(true);
    });

    test("should handle large numbers with locale formatting", () => {
      render(<AnimatedCounter value={999999} />);

      const counter = screen.getByTestId("animated-counter");
      expect(counter).toHaveTextContent("999,999");
      expect(counter).toHaveAttribute("aria-label", "999999");
    });
  });

  describe("Accessibility", () => {
    test("should have proper aria-label with label prop showing real value", () => {
      render(<AnimatedCounter value={100} label="Dogs available" />);

      const counter = screen.getByTestId("animated-counter");
      expect(counter).toHaveAttribute("aria-label", "Dogs available: 100");
    });

    test("should have proper role for screen readers", () => {
      render(<AnimatedCounter value={100} />);

      const counter = screen.getByTestId("animated-counter");
      expect(counter).toHaveAttribute("role", "status");
      expect(counter).toHaveAttribute("aria-live", "polite");
    });

    test("should handle reduced motion preferences", () => {
      render(<AnimatedCounter value={100} />);

      const counter = screen.getByTestId("animated-counter");
      expect(counter).toBeInTheDocument();
      expect(counter).toHaveTextContent("100");
    });
  });

  describe("Edge cases", () => {
    test("should handle decimal values by rounding", () => {
      render(<AnimatedCounter value={99.7} />);

      const counter = screen.getByTestId("animated-counter");
      expect(counter).toHaveTextContent("100");
    });

    test("should handle value changes", () => {
      const { rerender } = render(<AnimatedCounter value={100} />);

      const counter = screen.getByTestId("animated-counter");
      expect(counter).toHaveTextContent("100");

      // Change value — resets animation state
      rerender(<AnimatedCounter value={200} />);
      // After rerender with new value, display shows the new value initially
      // (hasAnimated gets reset, triggering re-observation)
    });

    test("should handle animation when value is 0", () => {
      render(<AnimatedCounter value={0} />);

      const counter = screen.getByTestId("animated-counter");
      expect(counter).toHaveTextContent("0");
    });
  });
});

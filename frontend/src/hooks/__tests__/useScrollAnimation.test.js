/**
 * Simplified test suite for useScrollAnimation hook
 * Tests essential functionality only - E2E tests cover interaction behavior
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useScrollAnimation, useReducedMotion } from "../useScrollAnimation";

describe("useScrollAnimation", () => {
  it("should return ref and visibility state (visible in test environment)", () => {
    const TestComponent = () => {
      const [ref, isVisible] = useScrollAnimation();
      return (
        <div ref={ref} data-testid="test-element">
          {isVisible ? "Visible" : "Hidden"}
        </div>
      );
    };

    render(<TestComponent />);
    // In test environment, the hook sets isVisible to true immediately to avoid IntersectionObserver issues
    expect(screen.getByTestId("test-element")).toHaveTextContent("Visible");
  });

  it("should handle options parameter without errors", () => {
    const TestComponent = () => {
      const [ref, isVisible] = useScrollAnimation({
        threshold: 0.5,
        rootMargin: "100px",
        triggerOnce: false,
      });
      return (
        <div ref={ref} data-testid="test-element">
          Test
        </div>
      );
    };

    render(<TestComponent />);
    expect(screen.getByTestId("test-element")).toBeInTheDocument();
  });
});

describe("useReducedMotion", () => {
  it("should return boolean value", () => {
    const TestComponent = () => {
      const prefersReducedMotion = useReducedMotion();
      return (
        <div data-testid="motion-state">{String(prefersReducedMotion)}</div>
      );
    };

    render(<TestComponent />);
    const result = screen.getByTestId("motion-state").textContent;
    expect(["true", "false"]).toContain(result);
  });
});

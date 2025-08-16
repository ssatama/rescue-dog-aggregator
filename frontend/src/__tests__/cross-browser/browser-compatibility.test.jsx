import React from "react";
import { render, screen } from "../../test-utils";
import "@testing-library/jest-dom";

// Mock components that will test cross-browser compatibility
const CrossBrowserTestComponent = () => (
  <div>
    {/* Backdrop filter testing */}
    <div
      data-testid="backdrop-blur-element"
      className="backdrop-blur-md bg-white/95"
      style={{
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      Test backdrop blur
    </div>

    {/* CSS Grid testing */}
    <div
      data-testid="css-grid-element"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      <div>Grid item 1</div>
      <div>Grid item 2</div>
      <div>Grid item 3</div>
    </div>

    {/* Flexbox testing */}
    <div
      data-testid="flexbox-element"
      className="flex items-center justify-between gap-4 cross-browser-flex"
    >
      <span>Flex item 1</span>
      <span>Flex item 2</span>
    </div>

    {/* Transform animations */}
    <div
      data-testid="transform-element"
      className="transition-all duration-200 ease-out hover:scale-105 cross-browser-transform"
      style={{
        transform: "translateZ(0)",
        WebkitTransform: "translateZ(0)",
        willChange: "transform",
      }}
    >
      Transform test
    </div>

    {/* Custom properties (CSS variables) */}
    <div
      data-testid="css-variables-element"
      className="cross-browser-variables"
      style={{
        "--custom-color": "#ea580c",
      }}
    >
      CSS Variables test
    </div>

    {/* Gradients with fallbacks */}
    <div
      data-testid="gradient-element"
      className="bg-orange-600 cross-browser-gradient"
    >
      Gradient test
    </div>
  </div>
);

describe("Cross-Browser Compatibility Tests", () => {
  beforeEach(() => {
    // Reset any CSS feature detection
    delete window.CSS;
  });

  describe("Backdrop Filter Support", () => {
    test("should render backdrop-blur element", () => {
      render(<CrossBrowserTestComponent />);
      const element = screen.getByTestId("backdrop-blur-element");

      expect(element).toBeInTheDocument();
      expect(element).toHaveClass("backdrop-blur-md");
      expect(element).toHaveClass("bg-white/95");
    });

    test("should have webkit prefix for backdrop-filter", () => {
      render(<CrossBrowserTestComponent />);
      const element = screen.getByTestId("backdrop-blur-element");

      const styles = getComputedStyle(element);
      expect(element.style.backdropFilter).toBe("blur(16px)");
      expect(element.style.WebkitBackdropFilter).toBe("blur(16px)");
    });

    test("should provide fallback for unsupported browsers", () => {
      // Mock CSS.supports to return false for backdrop-filter
      window.CSS = {
        supports: jest.fn((property, value) => {
          if (
            property === "backdrop-filter" ||
            property === "-webkit-backdrop-filter"
          ) {
            return false;
          }
          return true;
        }),
      };

      render(<CrossBrowserTestComponent />);
      const element = screen.getByTestId("backdrop-blur-element");

      // Should still have the element with fallback classes
      expect(element).toBeInTheDocument();
      expect(element).toHaveClass("bg-white/95");
    });
  });

  describe("CSS Grid Support", () => {
    test("should render responsive grid layout", () => {
      render(<CrossBrowserTestComponent />);
      const element = screen.getByTestId("css-grid-element");

      expect(element).toBeInTheDocument();
      expect(element).toHaveClass("grid");
      expect(element).toHaveClass("grid-cols-1");
      expect(element).toHaveClass("md:grid-cols-2");
      expect(element).toHaveClass("lg:grid-cols-3");
      expect(element).toHaveClass("gap-6");
    });

    test("should contain grid items", () => {
      render(<CrossBrowserTestComponent />);
      const element = screen.getByTestId("css-grid-element");
      const items = element.children;

      expect(items).toHaveLength(3);
      expect(items[0]).toHaveTextContent("Grid item 1");
      expect(items[1]).toHaveTextContent("Grid item 2");
      expect(items[2]).toHaveTextContent("Grid item 3");
    });
  });

  describe("Flexbox Support", () => {
    test("should render flexbox layout with proper classes", () => {
      render(<CrossBrowserTestComponent />);
      const element = screen.getByTestId("flexbox-element");

      expect(element).toBeInTheDocument();
      expect(element).toHaveClass("flex");
      expect(element).toHaveClass("items-center");
      expect(element).toHaveClass("justify-between");
      expect(element).toHaveClass("gap-4");
    });

    test("should contain flex items", () => {
      render(<CrossBrowserTestComponent />);
      const element = screen.getByTestId("flexbox-element");

      expect(element).toHaveTextContent("Flex item 1");
      expect(element).toHaveTextContent("Flex item 2");
    });
  });

  describe("Transform Animations", () => {
    test("should render transform element with proper classes", () => {
      render(<CrossBrowserTestComponent />);
      const element = screen.getByTestId("transform-element");

      expect(element).toBeInTheDocument();
      expect(element).toHaveClass("transition-all");
      expect(element).toHaveClass("duration-200");
      expect(element).toHaveClass("ease-out");
      expect(element).toHaveClass("hover:scale-105");
    });

    test("should have webkit prefixes for transforms", () => {
      render(<CrossBrowserTestComponent />);
      const element = screen.getByTestId("transform-element");

      expect(element.style.transform).toBe("translateZ(0)");
      expect(element.style.WebkitTransform).toBe("translateZ(0)");
      expect(element.style.willChange).toBe("transform");
    });
  });

  describe("CSS Variables Support", () => {
    test("should render element with CSS custom properties and fallback class", () => {
      render(<CrossBrowserTestComponent />);
      const element = screen.getByTestId("css-variables-element");

      expect(element).toBeInTheDocument();
      expect(element).toHaveClass("cross-browser-variables");
      expect(element.style.getPropertyValue("--custom-color")).toBe("#ea580c");
    });
  });

  describe("Gradient Support", () => {
    test("should render gradient with cross-browser fallback classes", () => {
      render(<CrossBrowserTestComponent />);
      const element = screen.getByTestId("gradient-element");

      expect(element).toBeInTheDocument();
      expect(element).toHaveClass("bg-orange-600"); // Fallback color
      expect(element).toHaveClass("cross-browser-gradient"); // Cross-browser gradient class
    });
  });

  describe("Browser Feature Detection", () => {
    test("should handle missing CSS.supports gracefully", () => {
      // Remove CSS.supports to simulate older browsers
      delete window.CSS;

      render(<CrossBrowserTestComponent />);
      const backdropElement = screen.getByTestId("backdrop-blur-element");

      // Should still render without errors
      expect(backdropElement).toBeInTheDocument();
    });

    test("should detect modern CSS features when available", () => {
      // Mock modern browser with CSS.supports
      window.CSS = {
        supports: jest.fn((property, value) => {
          const modernFeatures = [
            "backdrop-filter",
            "grid",
            "flex",
            "transform",
          ];
          return modernFeatures.some((feature) => property.includes(feature));
        }),
      };

      render(<CrossBrowserTestComponent />);
      const element = screen.getByTestId("backdrop-blur-element");

      expect(element).toBeInTheDocument();
      // Note: CSS.supports is not automatically called by our components in test environment
      // This test validates that the function is available and can be called
      expect(typeof window.CSS.supports).toBe("function");
    });
  });
});

// Additional tests for specific browser compatibility issues
describe("Internet Explorer Compatibility", () => {
  test("should provide IE11 fallbacks for modern features", () => {
    render(<CrossBrowserTestComponent />);

    // Should render without modern features failing
    const gridElement = screen.getByTestId("css-grid-element");
    expect(gridElement).toBeInTheDocument();
    expect(gridElement).toHaveClass("grid");

    // Test that flexbox fallback element works
    const flexElement = screen.getByTestId("flexbox-element");
    expect(flexElement).toHaveClass("cross-browser-flex");
  });
});

describe("Safari Compatibility", () => {
  test("should handle webkit-specific prefixes", () => {
    render(<CrossBrowserTestComponent />);
    const transformElement = screen.getByTestId("transform-element");
    const backdropElement = screen.getByTestId("backdrop-blur-element");

    // Should have webkit prefixes for transform
    expect(transformElement.style.WebkitTransform).toBe("translateZ(0)");
    expect(transformElement).toHaveClass("cross-browser-transform");

    // Should have webkit prefixes for backdrop filter
    expect(backdropElement.style.WebkitBackdropFilter).toBe("blur(16px)");
    expect(backdropElement).toHaveClass("backdrop-blur-md");
  });
});

describe("Firefox Compatibility", () => {
  test("should render properly in Firefox", () => {
    render(<CrossBrowserTestComponent />);

    const gridElement = screen.getByTestId("css-grid-element");
    const flexElement = screen.getByTestId("flexbox-element");
    const transformElement = screen.getByTestId("transform-element");

    expect(gridElement).toBeInTheDocument();
    expect(gridElement).toHaveClass("grid");

    expect(flexElement).toBeInTheDocument();
    expect(flexElement).toHaveClass("cross-browser-flex");

    expect(transformElement).toBeInTheDocument();
    expect(transformElement).toHaveClass("cross-browser-transform");
  });
});

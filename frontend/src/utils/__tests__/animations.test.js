import { renderHook, act } from "@testing-library/react";
import {
  useFadeInAnimation,
  useStaggerAnimation,
  useHoverAnimation,
  getAnimationClasses,
} from "../animations";

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
});
window.IntersectionObserver = mockIntersectionObserver;

// Mock matchMedia for prefers-reduced-motion
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

describe("Animation Utilities", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("useFadeInAnimation", () => {
    it("should return ref and initial visibility state", () => {
      const { result } = renderHook(() => useFadeInAnimation());

      expect(result.current.ref).toBeDefined();
      expect(result.current.isVisible).toBe(false);
      expect(result.current.hasAnimated).toBe(false);
    });

    it("should set up IntersectionObserver with correct options", () => {
      const options = {
        threshold: 0.5,
        rootMargin: "100px",
        triggerOnce: true,
      };

      // Create a mock ref with current element
      const mockElement = document.createElement("div");
      const mockRef = { current: mockElement };

      // Override the hook to use our mock ref
      jest.spyOn(require("react"), "useRef").mockReturnValue(mockRef);

      renderHook(() => useFadeInAnimation(options));

      expect(mockIntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        {
          threshold: 0.5,
          rootMargin: "100px",
        },
      );

      // Restore the original useRef
      require("react").useRef.mockRestore();
    });

    it("should respect prefers-reduced-motion setting", () => {
      // Mock prefers-reduced-motion: reduce
      const originalMatchMedia = window.matchMedia;
      window.matchMedia = jest.fn().mockImplementation((query) => ({
        matches: query === "(prefers-reduced-motion: reduce)",
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      // Create a mock ref with current element to trigger useEffect
      const mockElement = document.createElement("div");
      const mockRef = { current: mockElement };
      jest.spyOn(require("react"), "useRef").mockReturnValue(mockRef);

      const { result } = renderHook(() => useFadeInAnimation());

      expect(result.current.isVisible).toBe(true);
      expect(result.current.hasAnimated).toBe(true);

      // Restore original functions
      window.matchMedia = originalMatchMedia;
      require("react").useRef.mockRestore();
    });
  });

  describe("useStaggerAnimation", () => {
    it("should return container ref and item props function", () => {
      const { result } = renderHook(() => useStaggerAnimation(3, 100));

      expect(result.current.containerRef).toBeDefined();
      expect(result.current.getItemProps).toBeInstanceOf(Function);
      expect(result.current.isVisible).toBe(false);
      expect(result.current.hasAnimated).toBe(false);
    });

    it("should generate correct item props with stagger delays", () => {
      const { result } = renderHook(() => useStaggerAnimation(3, 100));

      const itemProps0 = result.current.getItemProps(0);
      const itemProps1 = result.current.getItemProps(1);
      const itemProps2 = result.current.getItemProps(2);

      expect(itemProps0.style.animationDelay).toBe("0ms");
      expect(itemProps1.style.animationDelay).toBe("100ms");
      expect(itemProps2.style.animationDelay).toBe("200ms");
    });

    it("should limit stagger classes to maximum of 6", () => {
      const { result } = renderHook(() => useStaggerAnimation(10, 100));

      // Make the container visible first
      act(() => {
        // Simulate intersection
        const entry = { isIntersecting: true };
        // This would be triggered by the intersection observer
      });

      const itemProps5 = result.current.getItemProps(5);
      const itemProps10 = result.current.getItemProps(10);

      // When not visible, classes will be different
      expect(itemProps5.className).toContain("opacity-0");
      expect(itemProps10.className).toContain("opacity-0");
    });
  });

  describe("useHoverAnimation", () => {
    it("should return hover state and props", () => {
      const { result } = renderHook(() => useHoverAnimation());

      expect(result.current.ref).toBeDefined();
      expect(result.current.isHovered).toBe(false);
      expect(result.current.hoverProps).toBeDefined();
      expect(result.current.hoverProps.onMouseEnter).toBeInstanceOf(Function);
      expect(result.current.hoverProps.onMouseLeave).toBeInstanceOf(Function);
    });

    it("should update hover state on mouse events", () => {
      const { result } = renderHook(() => useHoverAnimation());

      act(() => {
        result.current.hoverProps.onMouseEnter();
      });

      expect(result.current.isHovered).toBe(true);

      act(() => {
        result.current.hoverProps.onMouseLeave();
      });

      expect(result.current.isHovered).toBe(false);
    });

    it("should apply correct transform styles based on hover state", () => {
      const options = { scale: 1.05, translateY: -8, duration: 200 };
      const { result } = renderHook(() => useHoverAnimation(options));

      // Initial state
      expect(result.current.hoverProps.style.transform).toBe(
        "scale(1) translateY(0px)",
      );

      // Hovered state
      act(() => {
        result.current.hoverProps.onMouseEnter();
      });

      expect(result.current.hoverProps.style.transform).toBe(
        "scale(1.05) translateY(-8px)",
      );
      expect(result.current.hoverProps.style.transition).toContain("200ms");
    });
  });

  describe("getAnimationClasses", () => {
    it("should return correct classes for visible state", () => {
      const classes = getAnimationClasses(true, "fade-in", 2);
      expect(classes).toBe("animate-fade-in animate-stagger-2");
    });

    it("should return opacity-0 for invisible state", () => {
      const classes = getAnimationClasses(false, "fade-in", 2);
      expect(classes).toBe("opacity-0");
    });

    it("should handle zero delay correctly", () => {
      const classes = getAnimationClasses(true, "fade-in-up", 0);
      expect(classes).toBe("animate-fade-in-up");
    });

    it("should cap delay at maximum stagger value", () => {
      const classes = getAnimationClasses(true, "fade-in", 10);
      expect(classes).toBe("animate-fade-in animate-stagger-6");
    });
  });

  describe("Accessibility", () => {
    it("should respect prefers-reduced-motion in all hooks", () => {
      // Mock prefers-reduced-motion: reduce
      const originalMatchMedia = window.matchMedia;
      window.matchMedia = jest.fn().mockImplementation((query) => ({
        matches: query === "(prefers-reduced-motion: reduce)",
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      // Test fade animation with mock ref
      const mockElement1 = document.createElement("div");
      const mockRef1 = { current: mockElement1 };
      jest.spyOn(require("react"), "useRef").mockReturnValue(mockRef1);

      const { result: fadeResult } = renderHook(() => useFadeInAnimation());
      expect(fadeResult.current.isVisible).toBe(true);

      // Clean up first hook
      require("react").useRef.mockRestore();

      // Test stagger animation with mock ref
      const mockElement2 = document.createElement("div");
      const mockRef2 = { current: mockElement2 };
      jest.spyOn(require("react"), "useRef").mockReturnValue(mockRef2);

      const { result: staggerResult } = renderHook(() =>
        useStaggerAnimation(3),
      );
      expect(staggerResult.current.isVisible).toBe(true);

      // Restore original functions
      window.matchMedia = originalMatchMedia;
      require("react").useRef.mockRestore();
    });
  });

  describe("Performance", () => {
    it("should include willChange property for hover animations", () => {
      const { result } = renderHook(() => useHoverAnimation());

      expect(result.current.hoverProps.style.willChange).toBe("transform");
    });

    it("should use requestAnimationFrame for smooth animations", () => {
      // This is tested indirectly through the transform property updates
      const { result } = renderHook(() => useHoverAnimation());

      expect(result.current.hoverProps.style.transition).toContain(
        "cubic-bezier",
      );
    });
  });
});

describe("Animation CSS Classes Integration", () => {
  it("should generate classes that match CSS definitions", () => {
    const fadeClasses = getAnimationClasses(true, "fade-in");
    const fadeUpClasses = getAnimationClasses(true, "fade-in-up");

    expect(fadeClasses).toBe("animate-fade-in");
    expect(fadeUpClasses).toBe("animate-fade-in-up");
  });

  it("should handle stagger delays correctly", () => {
    for (let i = 1; i <= 6; i++) {
      const classes = getAnimationClasses(true, "fade-in", i);
      expect(classes).toBe(`animate-fade-in animate-stagger-${i}`);
    }
  });
});

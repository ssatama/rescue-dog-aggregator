import { renderHook } from "@testing-library/react";
import { useViewport, useGridColumns, useModalBehavior } from "./useViewport";

// Mock the useMediaQuery hook
jest.mock("./useMediaQuery", () => ({
  useMediaQuery: jest.fn(),
}));

const { useMediaQuery } = require("./useMediaQuery");

describe("useViewport", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Mobile viewport (375-767px)", () => {
    beforeEach(() => {
      useMediaQuery.mockImplementation((query: string) => {
        if (query === "(min-width: 768px)") return false;
        if (query === "(min-width: 1024px)") return false;
        if (query === "(min-width: 375px)") return true;
        return false;
      });
    });

    it("should detect mobile viewport correctly", () => {
      const { result } = renderHook(() => useViewport());

      expect(result.current.isMobile).toBe(true);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isDesktop).toBe(false);
      expect(result.current.isMobileOrTablet).toBe(true);
      expect(result.current.isAbove375).toBe(true);
    });

    it("should return 2 columns for mobile", () => {
      const { result } = renderHook(() => useGridColumns());
      expect(result.current).toBe(2);
    });

    it("should enable modal behavior for mobile", () => {
      const { result } = renderHook(() => useModalBehavior());
      expect(result.current).toBe(true);
    });
  });

  describe("Tablet viewport (768-1023px)", () => {
    beforeEach(() => {
      useMediaQuery.mockImplementation((query: string) => {
        if (query === "(min-width: 768px)") return true;
        if (query === "(min-width: 1024px)") return false;
        if (query === "(min-width: 375px)") return true;
        return false;
      });
    });

    it("should detect tablet viewport correctly", () => {
      const { result } = renderHook(() => useViewport());

      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(true);
      expect(result.current.isDesktop).toBe(false);
      expect(result.current.isMobileOrTablet).toBe(true);
      expect(result.current.isAbove375).toBe(true);
    });

    it("should return 3 columns for tablet", () => {
      const { result } = renderHook(() => useGridColumns());
      expect(result.current).toBe(3);
    });

    it("should enable modal behavior for tablet", () => {
      const { result } = renderHook(() => useModalBehavior());
      expect(result.current).toBe(true);
    });
  });

  describe("Desktop viewport (1024px+)", () => {
    beforeEach(() => {
      useMediaQuery.mockImplementation((query: string) => {
        if (query === "(min-width: 768px)") return true;
        if (query === "(min-width: 1024px)") return true;
        if (query === "(min-width: 375px)") return true;
        return false;
      });
    });

    it("should detect desktop viewport correctly", () => {
      const { result } = renderHook(() => useViewport());

      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isDesktop).toBe(true);
      expect(result.current.isMobileOrTablet).toBe(false);
      expect(result.current.isAbove375).toBe(true);
    });

    it("should return 4 columns for desktop (existing behavior)", () => {
      const { result } = renderHook(() => useGridColumns());
      expect(result.current).toBe(4);
    });

    it("should disable modal behavior for desktop (use separate pages)", () => {
      const { result } = renderHook(() => useModalBehavior());
      expect(result.current).toBe(false);
    });
  });

  describe("Edge cases", () => {
    it("should handle viewport below 375px as mobile", () => {
      useMediaQuery.mockImplementation((query: string) => {
        if (query === "(min-width: 768px)") return false;
        if (query === "(min-width: 1024px)") return false;
        if (query === "(min-width: 375px)") return false;
        return false;
      });

      const { result } = renderHook(() => useViewport());

      expect(result.current.isMobile).toBe(true);
      expect(result.current.isAbove375).toBe(false);
    });
  });
});

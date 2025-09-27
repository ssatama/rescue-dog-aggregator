import { renderHook } from "@testing-library/react";
import { useSwipeDevice } from "../useSwipeDevice";

// Mock the useMediaQuery hook
jest.mock("../useMediaQuery", () => ({
  useMediaQuery: jest.fn(),
}));

import { useMediaQuery } from "../useMediaQuery";

describe("useSwipeDevice", () => {
  const mockUseMediaQuery = useMediaQuery as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return true for mobile devices (width < 768px)", () => {
    mockUseMediaQuery.mockImplementation((query: string) => {
      if (query === "(max-width: 767px)") return true;
      if (query === "(min-width: 768px) and (max-width: 1279px)") return false;
      if (query === "(pointer: coarse)") return true;
      if (query === "(pointer: fine)") return false;
      return false;
    });

    const { result } = renderHook(() => useSwipeDevice());
    expect(result.current).toBe(true);
  });

  it("should return true for tablets (768px <= width <= 1279px)", () => {
    mockUseMediaQuery.mockImplementation((query: string) => {
      if (query === "(max-width: 767px)") return false;
      if (query === "(min-width: 768px) and (max-width: 1279px)") return true;
      if (query === "(pointer: coarse)") return false;
      if (query === "(pointer: fine)") return true;
      return false;
    });

    const { result } = renderHook(() => useSwipeDevice());
    expect(result.current).toBe(true);
  });

  it("should return true for touch devices regardless of size", () => {
    mockUseMediaQuery.mockImplementation((query: string) => {
      if (query === "(max-width: 767px)") return false;
      if (query === "(min-width: 768px) and (max-width: 1279px)") return false;
      if (query === "(pointer: coarse)") return true;
      if (query === "(pointer: fine)") return false;
      return false;
    });

    const { result } = renderHook(() => useSwipeDevice());
    expect(result.current).toBe(true);
  });

  it("should return false for desktop devices without touch", () => {
    mockUseMediaQuery.mockImplementation((query: string) => {
      if (query === "(max-width: 767px)") return false;
      if (query === "(min-width: 768px) and (max-width: 1279px)") return false;
      if (query === "(pointer: coarse)") return false;
      if (query === "(pointer: fine)") return true;
      return false;
    });

    const { result } = renderHook(() => useSwipeDevice());
    expect(result.current).toBe(false);
  });

  it("should handle devices with both touch and mouse (hybrid devices)", () => {
    // Tablet with both touch and fine pointer
    mockUseMediaQuery.mockImplementation((query: string) => {
      if (query === "(max-width: 767px)") return false;
      if (query === "(min-width: 768px) and (max-width: 1279px)") return true;
      if (query === "(pointer: coarse)") return true;
      if (query === "(pointer: fine)") return true;
      return false;
    });

    const { result } = renderHook(() => useSwipeDevice());
    expect(result.current).toBe(true);
  });

  it("should return true for iPad-sized devices (768px-1024px)", () => {
    mockUseMediaQuery.mockImplementation((query: string) => {
      if (query === "(max-width: 767px)") return false;
      if (query === "(min-width: 768px) and (max-width: 1279px)") return true;
      if (query === "(pointer: coarse)") return true;
      if (query === "(pointer: fine)") return false;
      return false;
    });

    const { result } = renderHook(() => useSwipeDevice());
    expect(result.current).toBe(true);
  });

  it("should return true for devices without fine pointer even if not explicitly touch", () => {
    mockUseMediaQuery.mockImplementation((query: string) => {
      if (query === "(max-width: 767px)") return true;
      if (query === "(min-width: 768px) and (max-width: 1279px)") return false;
      if (query === "(pointer: coarse)") return false;
      if (query === "(pointer: fine)") return false;
      return false;
    });

    const { result } = renderHook(() => useSwipeDevice());
    expect(result.current).toBe(true);
  });
});

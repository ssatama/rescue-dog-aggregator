import { renderHook, act, waitFor } from "@testing-library/react";
import { useMediaQuery } from "./useMediaQuery";

describe("useMediaQuery", () => {
  // Store original window.matchMedia
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    // Clear any mocked functions
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original matchMedia
    window.matchMedia = originalMatchMedia;
  });

  it("should return true when media query matches", () => {
    // Mock matchMedia to return matching state
    const mockMatchMedia = jest.fn().mockImplementation((query) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
    window.matchMedia = mockMatchMedia;

    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));

    expect(result.current).toBe(true);
    expect(mockMatchMedia).toHaveBeenCalledWith("(min-width: 768px)");
  });

  it("should return false when media query does not match", () => {
    // Mock matchMedia to return non-matching state
    const mockMatchMedia = jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
    window.matchMedia = mockMatchMedia;

    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));

    expect(result.current).toBe(false);
  });

  it("should update when media query changes", async () => {
    let listeners: { [key: string]: (() => void)[] } = {};
    let currentMatches = false;

    const mockMatchMedia = jest.fn().mockImplementation((query) => {
      const mediaQueryList = {
        get matches() {
          return currentMatches;
        },
        media: query,
        onchange: null,
        addEventListener: jest.fn((event: string, handler: () => void) => {
          if (!listeners[event]) listeners[event] = [];
          listeners[event].push(handler);
        }),
        removeEventListener: jest.fn((event: string, handler: () => void) => {
          if (listeners[event]) {
            listeners[event] = listeners[event].filter((h) => h !== handler);
          }
        }),
        dispatchEvent: jest.fn(),
      };
      return mediaQueryList;
    });
    window.matchMedia = mockMatchMedia;

    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));

    expect(result.current).toBe(false);

    act(() => {
      currentMatches = true;
      listeners["change"]?.forEach((handler) => handler());
    });

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it("should clean up event listeners on unmount", () => {
    const removeEventListenerMock = jest.fn();
    const mockMatchMedia = jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: removeEventListenerMock,
      dispatchEvent: jest.fn(),
    }));
    window.matchMedia = mockMatchMedia;

    const { unmount } = renderHook(() => useMediaQuery("(min-width: 768px)"));

    unmount();

    expect(removeEventListenerMock).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    );
  });

  it("should handle SSR gracefully", () => {
    // Temporarily remove window.matchMedia to simulate SSR
    const windowWithOptionalMatchMedia = window as Window & { matchMedia?: typeof window.matchMedia };
    const savedMatchMedia = windowWithOptionalMatchMedia.matchMedia;
    Object.defineProperty(window, "matchMedia", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));

    expect(result.current).toBe(false);

    // Restore matchMedia
    Object.defineProperty(window, "matchMedia", {
      value: savedMatchMedia,
      writable: true,
      configurable: true,
    });
  });
});

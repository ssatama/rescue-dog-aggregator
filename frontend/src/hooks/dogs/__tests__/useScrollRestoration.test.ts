import { renderHook, act } from "@testing-library/react";
import useScrollRestoration from "../useScrollRestoration";

describe("useScrollRestoration", () => {
  let replaceStateSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    replaceStateSpy = jest.spyOn(window.history, "replaceState").mockImplementation(() => {});
    Object.defineProperty(window, "scrollY", { value: 0, writable: true, configurable: true });
    window.scrollTo = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
    replaceStateSpy.mockRestore();
  });

  it("should initialize scrollPositionRef from URL scroll param", () => {
    const searchParams = new URLSearchParams("scroll=500");
    const { result } = renderHook(() =>
      useScrollRestoration({ searchParams, pathname: "/dogs" }),
    );

    expect(result.current.scrollPositionRef.current).toBe(500);
  });

  it("should initialize scrollPositionRef to 0 when no scroll param", () => {
    const searchParams = new URLSearchParams();
    const { result } = renderHook(() =>
      useScrollRestoration({ searchParams, pathname: "/dogs" }),
    );

    expect(result.current.scrollPositionRef.current).toBe(0);
  });

  it("should attach and detach scroll event listener", () => {
    const addSpy = jest.spyOn(window, "addEventListener");
    const removeSpy = jest.spyOn(window, "removeEventListener");

    const searchParams = new URLSearchParams();
    const { unmount } = renderHook(() =>
      useScrollRestoration({ searchParams, pathname: "/dogs" }),
    );

    expect(addSpy).toHaveBeenCalledWith("scroll", expect.any(Function), { passive: true });

    unmount();

    expect(removeSpy).toHaveBeenCalledWith("scroll", expect.any(Function));

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it("should save scroll position to URL via history.replaceState on scroll", () => {
    const searchParams = new URLSearchParams();

    renderHook(() =>
      useScrollRestoration({ searchParams, pathname: "/dogs" }),
    );

    Object.defineProperty(window, "scrollY", { value: 300, writable: true, configurable: true });

    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });

    // Advance debounce timer
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(replaceStateSpy).toHaveBeenCalledWith(
      null,
      "",
      "/dogs?scroll=300",
    );
  });

  it("should remove scroll param from URL when scrolled to top", () => {
    const searchParams = new URLSearchParams("size=Small");

    renderHook(() =>
      useScrollRestoration({ searchParams, pathname: "/dogs" }),
    );

    // scrollY is 0 by default
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(replaceStateSpy).toHaveBeenCalledWith(
      null,
      "",
      "/dogs?size=Small",
    );
  });

  it("should restore scroll position on mount when URL has scroll param", () => {
    const searchParams = new URLSearchParams("scroll=800");

    renderHook(() =>
      useScrollRestoration({ searchParams, pathname: "/dogs" }),
    );

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(window.scrollTo).toHaveBeenCalledWith(0, 800);
  });

  it("should not restore scroll position when no scroll param", () => {
    const searchParams = new URLSearchParams();

    renderHook(() =>
      useScrollRestoration({ searchParams, pathname: "/dogs" }),
    );

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it("should cancel debounced save on unmount", () => {
    const searchParams = new URLSearchParams();
    const { result, unmount } = renderHook(() =>
      useScrollRestoration({ searchParams, pathname: "/dogs" }),
    );

    const cancelSpy = jest.spyOn(result.current.saveScrollPosition, "cancel");

    unmount();

    expect(cancelSpy).toHaveBeenCalled();
  });
});

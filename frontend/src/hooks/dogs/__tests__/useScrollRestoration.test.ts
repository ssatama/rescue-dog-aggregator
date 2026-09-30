import { renderHook, act } from "@testing-library/react";
import useScrollRestoration, { replaceUrlKeepingScroll } from "../useScrollRestoration";

function setScrollY(value: number) {
  Object.defineProperty(window, "scrollY", { value, writable: true, configurable: true });
}

describe("useScrollRestoration (#670)", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    window.history.replaceState(null, "", "/dogs");
    setScrollY(0);
    window.scrollTo = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("saves the scroll position in the history entry, not the URL", () => {
    window.history.replaceState({ __NA: true }, "", "/breeds/border-collie");
    renderHook(() => useScrollRestoration({ searchParams: new URLSearchParams(), pathname: "/breeds/border-collie" }));

    setScrollY(540.5);
    act(() => {
      window.dispatchEvent(new Event("scroll"));
      jest.advanceTimersByTime(300);
    });

    expect(window.history.state).toEqual({ __NA: true, catalogScroll: 541 });
    expect(window.location.search).toBe("");
  });

  it("restores the position saved in the history entry, as on back and forward", () => {
    window.history.replaceState({ catalogScroll: 800 }, "", "/dogs?size=Small");
    renderHook(() => useScrollRestoration({ searchParams: new URLSearchParams("size=Small"), pathname: "/dogs" }));

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(window.scrollTo).toHaveBeenCalledWith(0, 800);
  });

  it("starts at the top on a fresh visit", () => {
    renderHook(() => useScrollRestoration({ searchParams: new URLSearchParams(), pathname: "/dogs" }));

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it("restores an old ?scroll= link once and drops it from the URL", () => {
    window.history.replaceState(null, "", "/dogs?size=Small&scroll=2466");
    renderHook(() =>
      useScrollRestoration({ searchParams: new URLSearchParams("size=Small&scroll=2466"), pathname: "/dogs" }),
    );

    expect(window.location.search).toBe("?size=Small");
    expect(window.history.state).toEqual({ catalogScroll: 2466 });

    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(window.scrollTo).toHaveBeenCalledWith(0, 2466);
  });

  it("reads a fractional old ?scroll= value as whole pixels", () => {
    window.history.replaceState(null, "", "/breeds/border-collie?scroll=540.5");
    renderHook(() =>
      useScrollRestoration({ searchParams: new URLSearchParams("scroll=540.5"), pathname: "/breeds/border-collie" }),
    );

    expect(window.location.pathname + window.location.search).toBe("/breeds/border-collie");
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(window.scrollTo).toHaveBeenCalledWith(0, 540);
  });

  it("saves the top of the page over an older position", () => {
    window.history.replaceState({ catalogScroll: 1500 }, "", "/dogs");
    renderHook(() => useScrollRestoration({ searchParams: new URLSearchParams(), pathname: "/dogs" }));

    setScrollY(0);
    act(() => {
      window.dispatchEvent(new Event("scroll"));
      jest.advanceTimersByTime(300);
    });

    expect(window.history.state).toEqual({ catalogScroll: 0 });
  });

  it("stops saving once unmounted", () => {
    const { unmount } = renderHook(() =>
      useScrollRestoration({ searchParams: new URLSearchParams(), pathname: "/dogs" }),
    );

    setScrollY(300);
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    unmount();
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(window.history.state).toBeNull();
  });
});

describe("replaceUrlKeepingScroll", () => {
  it("changes the URL and keeps the saved position", () => {
    window.history.replaceState({ catalogScroll: 1200 }, "", "/dogs");

    replaceUrlKeepingScroll("/dogs?page=2");

    expect(window.location.search).toBe("?page=2");
    expect(window.history.state).toEqual({ catalogScroll: 1200 });
  });
});

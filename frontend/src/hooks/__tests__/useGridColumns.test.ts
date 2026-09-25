import { renderHook } from "@testing-library/react";
import { useGridColumns } from "../useGridColumns";

// The dog grid's columns follow its CSS breakpoints (#496)
function atWidth(width: number) {
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches: width >= Number(query.match(/min-width: (\d+)px/)?.[1] ?? Infinity),
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }));
}

describe("useGridColumns", () => {
  const original = window.matchMedia;
  afterEach(() => {
    window.matchMedia = original;
  });

  it.each([
    [390, 2],
    [820, 3],
    [1024, 3],
    [1180, 3],
    [1280, 4],
    [1440, 4],
  ])("shows %ipx as %i columns", (width, columns) => {
    atWidth(width);
    expect(renderHook(() => useGridColumns()).result.current).toBe(columns);
  });

  it("follows the window when it crosses a breakpoint", () => {
    const listeners: (() => void)[] = [];
    let width = 820;
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      get matches() {
        return width >= Number(query.match(/min-width: (\d+)px/)?.[1]);
      },
      media: query,
      addEventListener: (_: string, listener: () => void) => listeners.push(listener),
      removeEventListener: jest.fn(),
    }));
    const { result, rerender } = renderHook(() => useGridColumns());
    expect(result.current).toBe(3);

    width = 1300;
    listeners.forEach((listener) => listener());
    rerender();
    expect(result.current).toBe(4);
  });
});

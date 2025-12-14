import {
  isChunkLoadError,
  isPromiseRejectionChunkError,
  clearBrowserCaches,
  handleChunkLoadError,
  setupChunkErrorHandler,
} from "../chunkLoadError";

describe("isChunkLoadError", () => {
  it("returns true for ChunkLoadError name", () => {
    const error = new Error("Something failed");
    error.name = "ChunkLoadError";
    expect(isChunkLoadError(error)).toBe(true);
  });

  it("returns true for ScriptExternalLoadError name", () => {
    const error = new Error("Script failed");
    error.name = "ScriptExternalLoadError";
    expect(isChunkLoadError(error)).toBe(true);
  });

  it("returns true for 'Loading chunk' message", () => {
    const error = new Error("Loading chunk 123 failed");
    expect(isChunkLoadError(error)).toBe(true);
  });

  it("returns true for webpack e[n].call pattern", () => {
    const error = new Error(
      "TypeError: undefined is not an object (evaluating 'e[n].call')",
    );
    expect(isChunkLoadError(error)).toBe(true);
  });

  it("returns true for e[n] is not a function pattern", () => {
    const error = new Error("e[n] is not a function");
    expect(isChunkLoadError(error)).toBe(true);
  });

  it("returns true for CSS chunk loading error", () => {
    const error = new Error("Loading CSS chunk styles failed");
    expect(isChunkLoadError(error)).toBe(true);
  });

  it("returns true for string error message", () => {
    expect(isChunkLoadError("Loading chunk 5 failed")).toBe(true);
  });

  it("returns false for regular errors", () => {
    const error = new Error("Something went wrong");
    expect(isChunkLoadError(error)).toBe(false);
  });

  it("returns false for null/undefined", () => {
    expect(isChunkLoadError(null)).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
  });

  it("returns false for TypeError without chunk pattern", () => {
    const error = new TypeError("Cannot read property 'foo' of undefined");
    expect(isChunkLoadError(error)).toBe(false);
  });

  it("returns true for actual Sentry-reported error pattern", () => {
    const error = new Error(
      "TypeError: undefined is not an object (evaluating 'e[n].call')",
    );
    expect(isChunkLoadError(error)).toBe(true);
  });
});

describe("isPromiseRejectionChunkError", () => {
  it("returns true for Error chunk rejection", () => {
    const error = new Error("Loading chunk 123 failed");
    const event = { reason: error } as PromiseRejectionEvent;
    expect(isPromiseRejectionChunkError(event)).toBe(true);
  });

  it("returns true for string chunk rejection", () => {
    const event = {
      reason: "Loading chunk 456 failed",
    } as PromiseRejectionEvent;
    expect(isPromiseRejectionChunkError(event)).toBe(true);
  });

  it("returns true for object with message property", () => {
    const event = {
      reason: { message: "ChunkLoadError: Loading chunk failed" },
    } as PromiseRejectionEvent;
    expect(isPromiseRejectionChunkError(event)).toBe(true);
  });

  it("returns false for non-chunk errors", () => {
    const event = {
      reason: new Error("Network error"),
    } as PromiseRejectionEvent;
    expect(isPromiseRejectionChunkError(event)).toBe(false);
  });
});

describe("clearBrowserCaches", () => {
  const originalCaches = global.caches;
  const originalNavigator = global.navigator;

  beforeEach(() => {
    // Reset mocks
    (global as unknown as Record<string, unknown>).caches = undefined;
  });

  afterEach(() => {
    (global as unknown as Record<string, unknown>).caches = originalCaches;
    (global as unknown as Record<string, unknown>).navigator = originalNavigator;
  });

  it("handles missing caches API gracefully", async () => {
    await expect(clearBrowserCaches()).resolves.toBeUndefined();
  });

  it("clears caches when available", async () => {
    const mockDelete = jest.fn().mockResolvedValue(true);
    (global as unknown as Record<string, unknown>).caches = {
      keys: jest.fn().mockResolvedValue(["cache1", "cache2"]),
      delete: mockDelete,
    };

    await clearBrowserCaches();

    expect(mockDelete).toHaveBeenCalledWith("cache1");
    expect(mockDelete).toHaveBeenCalledWith("cache2");
  });
});

describe("handleChunkLoadError", () => {
  let mockGetItem: jest.Mock;
  let mockSetItem: jest.Mock;
  let mockRemoveItem: jest.Mock;

  beforeEach(() => {
    mockGetItem = jest.fn().mockReturnValue(null);
    mockSetItem = jest.fn();
    mockRemoveItem = jest.fn();

    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: mockGetItem,
        setItem: mockSetItem,
        removeItem: mockRemoveItem,
      },
      writable: true,
    });
  });

  it("returns false for non-chunk errors", () => {
    const error = new Error("Regular error");
    expect(handleChunkLoadError(error)).toBe(false);
  });

  it("returns true and sets reload timestamp for first chunk error", () => {
    const error = new Error("Loading chunk 123 failed");
    const result = handleChunkLoadError(error);
    expect(result).toBe(true);
    expect(mockSetItem).toHaveBeenCalledWith(
      "chunk_error_reload",
      expect.any(String),
    );
  });

  it("prevents infinite reload loop when reloaded within 10 seconds", () => {
    // Simulate recent reload (5 seconds ago)
    const fiveSecondsAgo = String(Date.now() - 5000);
    mockGetItem.mockReturnValue(fiveSecondsAgo);

    const error = new Error("Loading chunk 123 failed");
    const result = handleChunkLoadError(error);

    expect(result).toBe(false);
    expect(mockRemoveItem).toHaveBeenCalledWith("chunk_error_reload");
  });

  it("allows reload after 10 second cooldown", () => {
    // Simulate old reload (15 seconds ago)
    const fifteenSecondsAgo = String(Date.now() - 15000);
    mockGetItem.mockReturnValue(fifteenSecondsAgo);

    const error = new Error("Loading chunk 123 failed");
    const result = handleChunkLoadError(error);

    expect(result).toBe(true);
    expect(mockSetItem).toHaveBeenCalled();
  });

  it("handles localStorage failure gracefully and reloads", () => {
    mockGetItem.mockImplementation(() => {
      throw new Error("localStorage is disabled");
    });

    const error = new Error("Loading chunk 123 failed");
    const result = handleChunkLoadError(error);

    expect(result).toBe(true);
  });
});

describe("setupChunkErrorHandler", () => {
  const originalWindow = global.window;
  let addEventListenerSpy: jest.SpyInstance;
  let removeEventListenerSpy: jest.SpyInstance;

  beforeEach(() => {
    addEventListenerSpy = jest.spyOn(window, "addEventListener");
    removeEventListenerSpy = jest.spyOn(window, "removeEventListener");
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
    (global as unknown as Record<string, unknown>).window = originalWindow;
  });

  it("adds event listeners for unhandledrejection and error", () => {
    setupChunkErrorHandler();

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "unhandledrejection",
      expect.any(Function),
    );
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "error",
      expect.any(Function),
    );
  });

  it("returns cleanup function that removes listeners", () => {
    const cleanup = setupChunkErrorHandler();

    cleanup();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "unhandledrejection",
      expect.any(Function),
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "error",
      expect.any(Function),
    );
  });
});
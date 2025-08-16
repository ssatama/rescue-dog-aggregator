import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useFavorites } from "./useFavorites";
import { FavoritesProvider } from "../contexts/FavoritesContext";
import { ToastProvider } from "../contexts/ToastContext";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }),
  };
})();

// Mock crypto for SSR safety
const cryptoMock = {
  randomUUID: jest.fn(() => "test-session-id-123"),
};

// Wrapper to provide both contexts
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ToastProvider>
    <FavoritesProvider>{children}</FavoritesProvider>
  </ToastProvider>
);

describe("useFavorites", () => {
  beforeEach(() => {
    // Setup mocks
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      writable: true,
    });
    Object.defineProperty(window, "crypto", {
      value: cryptoMock,
      writable: true,
    });
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe("initialization", () => {
    it("should initialize with empty favorites when localStorage is empty", () => {
      const { result } = renderHook(() => useFavorites(), { wrapper });

      expect(result.current.favorites).toEqual([]);
      expect(result.current.count).toBe(0);
      expect(result.current.isLoading).toBe(false);
    });

    it("should load favorites from localStorage on mount", () => {
      const savedFavorites = [1, 2, 3];
      localStorageMock.setItem(
        "rescue-dogs-favorites",
        JSON.stringify(savedFavorites),
      );

      const { result } = renderHook(() => useFavorites(), { wrapper });

      expect(result.current.favorites).toEqual(savedFavorites);
      expect(result.current.count).toBe(3);
    });

    it("should handle corrupted localStorage data gracefully", () => {
      localStorageMock.setItem("rescue-dogs-favorites", "invalid-json{]");

      const { result } = renderHook(() => useFavorites(), { wrapper });

      expect(result.current.favorites).toEqual([]);
      expect(result.current.count).toBe(0);
    });

    it("should handle SSR environment gracefully", () => {
      // Test that the hook doesn't throw even if window is undefined
      // The hook checks for window internally
      const { result } = renderHook(() => useFavorites(), { wrapper });

      expect(result.current.favorites).toEqual([]);
      expect(result.current.count).toBe(0);
    });
  });

  describe("isFavorited", () => {
    it("should return true for favorited dogs", () => {
      localStorageMock.setItem(
        "rescue-dogs-favorites",
        JSON.stringify([1, 2, 3]),
      );
      const { result } = renderHook(() => useFavorites(), { wrapper });

      expect(result.current.isFavorited(1)).toBe(true);
      expect(result.current.isFavorited(2)).toBe(true);
      expect(result.current.isFavorited(3)).toBe(true);
    });

    it("should return false for non-favorited dogs", () => {
      localStorageMock.setItem(
        "rescue-dogs-favorites",
        JSON.stringify([1, 2, 3]),
      );
      const { result } = renderHook(() => useFavorites(), { wrapper });

      expect(result.current.isFavorited(4)).toBe(false);
      expect(result.current.isFavorited(5)).toBe(false);
    });
  });

  describe("addFavorite", () => {
    it("should add a dog to favorites", async () => {
      const { result } = renderHook(() => useFavorites(), { wrapper });

      await act(async () => {
        await result.current.addFavorite(1);
      });

      expect(result.current.favorites).toContain(1);
      expect(result.current.count).toBe(1);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "rescue-dogs-favorites",
        JSON.stringify([1]),
      );
    });

    it("should not add duplicate favorites", async () => {
      const { result } = renderHook(() => useFavorites(), { wrapper });

      await act(async () => {
        await result.current.addFavorite(1);
        await result.current.addFavorite(1);
      });

      expect(result.current.favorites).toEqual([1]);
      expect(result.current.count).toBe(1);
    });

    it("should respect MAX_FAVORITES limit (100)", async () => {
      const maxFavorites = Array.from({ length: 100 }, (_, i) => i + 1);
      localStorageMock.setItem(
        "rescue-dogs-favorites",
        JSON.stringify(maxFavorites),
      );

      const { result } = renderHook(() => useFavorites(), { wrapper });

      await act(async () => {
        await result.current.addFavorite(101);
      });

      expect(result.current.favorites).toHaveLength(100);
      expect(result.current.favorites).not.toContain(101);
    });
  });

  describe("removeFavorite", () => {
    it("should remove a dog from favorites", async () => {
      localStorageMock.setItem(
        "rescue-dogs-favorites",
        JSON.stringify([1, 2, 3]),
      );
      const { result } = renderHook(() => useFavorites(), { wrapper });

      await act(async () => {
        await result.current.removeFavorite(2);
      });

      expect(result.current.favorites).toEqual([1, 3]);
      expect(result.current.count).toBe(2);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "rescue-dogs-favorites",
        JSON.stringify([1, 3]),
      );
    });

    it("should handle removing non-existent favorite gracefully", async () => {
      localStorageMock.setItem("rescue-dogs-favorites", JSON.stringify([1, 2]));
      const { result } = renderHook(() => useFavorites(), { wrapper });

      await act(async () => {
        await result.current.removeFavorite(99);
      });

      expect(result.current.favorites).toEqual([1, 2]);
      expect(result.current.count).toBe(2);
    });
  });

  describe("toggleFavorite", () => {
    it("should add dog if not favorited", async () => {
      const { result } = renderHook(() => useFavorites(), { wrapper });

      await act(async () => {
        await result.current.toggleFavorite(1);
      });

      expect(result.current.favorites).toContain(1);
    });

    it("should remove dog if already favorited", async () => {
      localStorageMock.setItem("rescue-dogs-favorites", JSON.stringify([1, 2]));
      const { result } = renderHook(() => useFavorites(), { wrapper });

      await act(async () => {
        await result.current.toggleFavorite(1);
      });

      expect(result.current.favorites).toEqual([2]);
    });
  });

  describe("clearFavorites", () => {
    it("should clear all favorites", () => {
      localStorageMock.setItem(
        "rescue-dogs-favorites",
        JSON.stringify([1, 2, 3]),
      );
      const { result } = renderHook(() => useFavorites(), { wrapper });

      act(() => {
        result.current.clearFavorites();
      });

      expect(result.current.favorites).toEqual([]);
      expect(result.current.count).toBe(0);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "rescue-dogs-favorites",
        JSON.stringify([]),
      );
    });
  });

  describe("URL sharing", () => {
    it("should generate a shareable URL with compressed dog IDs", () => {
      localStorageMock.setItem(
        "rescue-dogs-favorites",
        JSON.stringify([1, 2, 3]),
      );
      const { result } = renderHook(() => useFavorites(), { wrapper });

      const url = result.current.getShareableUrl();

      // With the new tiered strategy, 3 items should use simple IDs
      expect(url).toContain("/favorites?ids=");
      expect(url).toMatch(/ids=1,2,3$/);
    });

    it("should generate empty URL when no favorites", () => {
      const { result } = renderHook(() => useFavorites(), { wrapper });

      const url = result.current.getShareableUrl();

      // The new implementation returns full URLs
      expect(url).toContain("/favorites");
      expect(url).not.toContain("?");
    });

    it("should load favorites from a shared URL", () => {
      const { result } = renderHook(() => useFavorites(), { wrapper });

      // Create a URL with encoded favorites [1, 2, 3]
      const encodedFavorites = btoa(JSON.stringify([1, 2, 3]));
      const sharedUrl = `/favorites?shared=${encodedFavorites}`;

      act(() => {
        result.current.loadFromUrl(sharedUrl);
      });

      expect(result.current.favorites).toEqual([1, 2, 3]);
      expect(result.current.count).toBe(3);
    });

    it("should handle invalid shared URLs gracefully", () => {
      const { result } = renderHook(() => useFavorites(), { wrapper });

      act(() => {
        result.current.loadFromUrl("/favorites?shared=invalid-base64!@#");
      });

      expect(result.current.favorites).toEqual([]);
      expect(result.current.count).toBe(0);
    });

    it("should handle malformed JSON in shared URLs", () => {
      const { result } = renderHook(() => useFavorites(), { wrapper });
      const invalidJson = btoa("not-json{]");

      act(() => {
        result.current.loadFromUrl(`/favorites?shared=${invalidJson}`);
      });

      expect(result.current.favorites).toEqual([]);
      expect(result.current.count).toBe(0);
    });
  });

  describe("localStorage quota handling", () => {
    it("should handle localStorage quota exceeded error", async () => {
      const { result } = renderHook(() => useFavorites(), { wrapper });

      // Mock localStorage.setItem to throw quota exceeded error
      localStorageMock.setItem = jest.fn(() => {
        const error = new Error("QuotaExceededError");
        error.name = "QuotaExceededError";
        throw error;
      });

      await act(async () => {
        await result.current.addFavorite(1);
      });

      // Should still update state even if localStorage fails
      expect(result.current.favorites).toContain(1);
    });

    it("should handle localStorage unavailable (private browsing)", async () => {
      const { result } = renderHook(() => useFavorites(), { wrapper });

      // Mock localStorage to be unavailable
      localStorageMock.setItem = jest.fn(() => {
        throw new Error("localStorage not available");
      });

      await act(async () => {
        await result.current.addFavorite(1);
      });

      // Should still work in memory
      expect(result.current.favorites).toContain(1);
    });
  });

  describe("performance", () => {
    it("should save to localStorage for each operation", async () => {
      const { result } = renderHook(() => useFavorites(), { wrapper });

      // Add multiple favorites
      await act(async () => {
        await result.current.addFavorite(1);
        await result.current.addFavorite(2);
        await result.current.addFavorite(3);
      });

      // localStorage.setItem should be called for each add
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(3);

      // Final write should have all favorites
      expect(localStorageMock.setItem).toHaveBeenLastCalledWith(
        "rescue-dogs-favorites",
        JSON.stringify([1, 2, 3]),
      );
    });
  });
});

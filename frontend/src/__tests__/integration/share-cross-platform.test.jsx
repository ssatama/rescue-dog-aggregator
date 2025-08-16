import React from "react";
import { render, screen, fireEvent, waitFor, renderHook, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import ShareButton from "../../components/ui/ShareButton";
import { useFavorites } from "../../hooks/useFavorites";
import { FavoritesProvider } from "../../contexts/FavoritesContext";
import { ToastProvider } from "../../contexts/ToastContext";
import { generateFavoritesUrl, parseSharedUrl, isMobile } from "../../utils/sharing";

// Mock the useShare hook
jest.mock("../../hooks/useShare", () => ({
  useShare: jest.fn(() => ({
    copied: false,
    hasNativeShare: false,
    handleNativeShare: jest.fn(),
    handleCopyLink: jest.fn(() => {
      navigator.clipboard.writeText("https://rescuedogs.me/favorites?ids=1,2,3");
    }),
    handleSocialShare: jest.fn(),
    safeUrl: "https://rescuedogs.me/favorites?ids=1,2,3",
    safeTitle: "My Favorites",
    safeText: "Check out my favorites",
  })),
}));

// Mock clipboard API
const mockWriteText = jest.fn();
Object.defineProperty(navigator, "clipboard", {
  value: {
    writeText: mockWriteText,
  },
  writable: true,
});

// Mock share API
const mockShare = jest.fn();
const mockCanShare = jest.fn();

const wrapper = ({ children }) => (
  <ToastProvider>
    <FavoritesProvider>{children}</FavoritesProvider>
  </ToastProvider>
);

describe("Share Functionality Cross-Platform", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWriteText.mockResolvedValue(undefined);
    mockShare.mockResolvedValue(undefined);
    mockCanShare.mockReturnValue(true);
  });

  describe("URL Generation Strategy", () => {
    test("generates correct URL for empty favorites", () => {
      const url = generateFavoritesUrl([]);
      expect(url).toContain("/favorites");
      expect(url).not.toContain("?");
      expect(parseSharedUrl(url)).toEqual([]);
    });

    test("generates simple comma-separated for ≤10 dogs", () => {
      const ids = [1, 2, 3, 4, 5];
      const url = generateFavoritesUrl(ids);
      expect(url).toContain("/favorites?ids=1,2,3,4,5");
      expect(url.length).toBeLessThan(50);
      expect(parseSharedUrl(url)).toEqual(ids);
    });

    test("generates compressed format for 11-30 dogs", () => {
      const ids = Array.from({ length: 15 }, (_, i) => i + 1);
      const url = generateFavoritesUrl(ids);
      expect(url).toContain("/favorites?c=1-15");
      expect(url.length).toBeLessThan(50);
      expect(parseSharedUrl(url)).toEqual(ids);
    });

    test("handles non-sequential IDs correctly", () => {
      const ids = [1, 3, 5, 7, 10, 11, 12, 15];
      const url = generateFavoritesUrl(ids);
      expect(url).toContain("/favorites?ids=");
      expect(parseSharedUrl(url)).toEqual(ids);
    });

    test("falls back to base64 for large collections", () => {
      const ids = Array.from({ length: 50 }, (_, i) => i + 1);
      const url = generateFavoritesUrl(ids);
      expect(url).toContain("/favorites?shared=");
      expect(parseSharedUrl(url)).toEqual(ids);
    });

    test("maintains backward compatibility with old base64 URLs", () => {
      const ids = [10, 20, 30];
      const legacyUrl = `/favorites?shared=${btoa(JSON.stringify(ids))}`;
      expect(parseSharedUrl(legacyUrl)).toEqual(ids);
    });
  });

  describe("Mobile Platform Behavior", () => {
    beforeEach(() => {
      // Mock mobile environment
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)",
        writable: true,
        configurable: true,
      });
      Object.defineProperty(window, "innerWidth", {
        value: 375,
        writable: true,
        configurable: true,
      });
    });

    test("detects mobile platform correctly", () => {
      expect(isMobile()).toBe(true);
    });

    test("uses native share when available on mobile", async () => {
      const { useShare } = require("../../hooks/useShare");
      const mockHandleNativeShare = jest.fn();
      
      useShare.mockReturnValue({
        copied: false,
        hasNativeShare: true,
        handleNativeShare: mockHandleNativeShare,
        handleCopyLink: jest.fn(),
        handleSocialShare: jest.fn(),
        safeUrl: "https://rescuedogs.me/favorites?ids=1,2,3",
        safeTitle: "My Favorites",
        safeText: "Check out my favorites",
      });

      render(
        <ToastProvider>
          <ShareButton
            url="https://rescuedogs.me/favorites?ids=1,2,3"
            title="My Favorites"
            text="Check out my favorites"
          />
        </ToastProvider>
      );

      const button = screen.getByRole("button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockHandleNativeShare).toHaveBeenCalled();
      });
    });

    test("falls back to clipboard on mobile without native share", async () => {
      const { useShare } = require("../../hooks/useShare");
      
      // Mobile without native share should still have a way to copy
      useShare.mockReturnValue({
        copied: false,
        hasNativeShare: false,
        handleNativeShare: jest.fn(),
        handleCopyLink: jest.fn(),
        handleSocialShare: jest.fn(),
        safeUrl: "https://rescuedogs.me/favorites?ids=1,2,3",
        safeTitle: "My Favorites",
        safeText: "Check out my favorites",
      });

      const { container } = render(
        <ToastProvider>
          <ShareButton
            url="https://rescuedogs.me/favorites?ids=1,2,3"
            title="My Favorites"
            text="Check out my favorites"
          />
        </ToastProvider>
      );

      // Verify the share button renders without native share
      const button = container.querySelector('[data-testid="share-button"]');
      expect(button).toBeInTheDocument();
      
      // Verify it's not using native share mode
      expect(button).not.toHaveAttribute('data-share-mode', 'native');
    });

    test("handles share cancellation gracefully on mobile", async () => {
      const { useShare } = require("../../hooks/useShare");
      const mockHandleNativeShare = jest.fn().mockRejectedValue(
        new DOMException("User cancelled", "AbortError")
      );
      
      useShare.mockReturnValue({
        copied: false,
        hasNativeShare: true,
        handleNativeShare: mockHandleNativeShare,
        handleCopyLink: jest.fn(),
        handleSocialShare: jest.fn(),
        safeUrl: "https://rescuedogs.me/favorites?ids=1,2,3",
        safeTitle: "My Favorites",
        safeText: "Check out my favorites",
      });

      render(
        <ToastProvider>
          <ShareButton
            url="https://rescuedogs.me/favorites?ids=1,2,3"
            title="My Favorites"
          />
        </ToastProvider>
      );

      const button = screen.getByRole("button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockHandleNativeShare).toHaveBeenCalled();
      });
      // Should not show error for user cancellation
    });
  });

  describe("Desktop Platform Behavior", () => {
    beforeEach(() => {
      // Mock desktop environment
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0",
        writable: true,
        configurable: true,
      });
      Object.defineProperty(window, "innerWidth", {
        value: 1920,
        writable: true,
        configurable: true,
      });
      // Desktop typically doesn't have native share
      delete navigator.share;
      delete navigator.canShare;
    });

    test("detects desktop platform correctly", () => {
      expect(isMobile()).toBe(false);
    });

    test("uses clipboard on desktop", async () => {
      const { useShare } = require("../../hooks/useShare");
      const mockHandleCopyLink = jest.fn(() => {
        mockWriteText("https://rescuedogs.me/favorites?ids=1,2,3");
      });
      
      useShare.mockReturnValue({
        copied: false,
        hasNativeShare: false,
        handleNativeShare: jest.fn(),
        handleCopyLink: mockHandleCopyLink,
        handleSocialShare: jest.fn(),
        safeUrl: "https://rescuedogs.me/favorites?ids=1,2,3",
        safeTitle: "My Favorites",
        safeText: "Check out my favorites",
      });

      render(
        <ToastProvider>
          <ShareButton
            url="https://rescuedogs.me/favorites?ids=1,2,3"
            title="My Favorites"
            text="Check out my favorites"
          />
        </ToastProvider>
      );

      // Desktop shows dropdown
      const button = screen.getByTestId("share-button");
      fireEvent.click(button);
      
      // Find and click copy link in dropdown
      const copyButton = await screen.findByText(/copy link/i);
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(mockHandleCopyLink).toHaveBeenCalled();
      });
    });

    test("handles clipboard permission denied on desktop", async () => {
      const { useShare } = require("../../hooks/useShare");
      const mockHandleCopyLink = jest.fn(() => {
        throw new DOMException("Permission denied", "NotAllowedError");
      });
      
      useShare.mockReturnValue({
        copied: false,
        hasNativeShare: false,
        handleNativeShare: jest.fn(),
        handleCopyLink: mockHandleCopyLink,
        handleSocialShare: jest.fn(),
        safeUrl: "https://rescuedogs.me/favorites?ids=1,2,3",
        safeTitle: "My Favorites",
        safeText: "Check out my favorites",
      });

      render(
        <ToastProvider>
          <ShareButton
            url="https://rescuedogs.me/favorites?ids=1,2,3"
            title="My Favorites"
          />
        </ToastProvider>
      );

      const button = screen.getByTestId("share-button");
      fireEvent.click(button);
      
      const copyButton = await screen.findByText(/copy link/i);
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(mockHandleCopyLink).toHaveBeenCalled();
      });
    });
  });

  describe("Tablet/iPad Behavior", () => {
    beforeEach(() => {
      // Mock iPad environment
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)",
        writable: true,
        configurable: true,
      });
      Object.defineProperty(window, "innerWidth", {
        value: 768,
        writable: true,
        configurable: true,
      });
    });

    test("handles iPad as mobile device", () => {
      // iPad has mobile user agent
      expect(isMobile()).toBe(true);
    });

    test("uses native share on iPad when available", async () => {
      Object.defineProperty(navigator, "share", {
        value: mockShare,
        writable: true,
        configurable: true,
      });

      render(
        <ToastProvider>
          <ShareButton
            url="https://rescuedogs.me/favorites?ids=1,2,3"
            title="My Favorites"
          />
        </ToastProvider>
      );

      const button = screen.getByRole("button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockShare).toHaveBeenCalled();
      });
    });
  });

  describe("Favorites Context Integration", () => {
    test("generates correct URL from favorites context", () => {
      const { result } = renderHook(() => useFavorites(), { wrapper });

      act(() => {
        result.current.addFavorite(1);
        result.current.addFavorite(2);
        result.current.addFavorite(3);
      });

      const url = result.current.getShareableUrl();
      expect(url).toContain("/favorites?ids=1,2,3");
    });

    test("loads favorites from shared URL correctly", () => {
      const { result } = renderHook(() => useFavorites(), { wrapper });

      // Test new format
      act(() => {
        result.current.loadFromUrl("/favorites?ids=10,20,30");
      });
      expect(result.current.favorites).toEqual([10, 20, 30]);

      // Test compressed format
      act(() => {
        result.current.loadFromUrl("/favorites?c=1-5");
      });
      expect(result.current.favorites).toEqual([1, 2, 3, 4, 5]);

      // Test legacy format
      const encoded = btoa(JSON.stringify([100, 200]));
      act(() => {
        result.current.loadFromUrl(`/favorites?shared=${encoded}`);
      });
      expect(result.current.favorites).toEqual([100, 200]);
    });
  });

  describe("Edge Cases", () => {
    test("handles empty URL gracefully", () => {
      expect(parseSharedUrl("")).toEqual([]);
    });

    test("handles malformed URLs gracefully", () => {
      expect(parseSharedUrl("not-a-url")).toEqual([]);
      expect(parseSharedUrl("/favorites?invalid=param")).toEqual([]);
    });

    test("handles invalid base64 gracefully", () => {
      expect(parseSharedUrl("/favorites?shared=invalid!@#")).toEqual([]);
    });

    test("handles non-numeric IDs gracefully", () => {
      expect(parseSharedUrl("/favorites?ids=a,b,c")).toEqual([]);
      expect(parseSharedUrl("/favorites?ids=1,abc,3")).toEqual([1, 3]);
    });

    test("handles very long URLs appropriately", () => {
      const manyIds = Array.from({ length: 100 }, (_, i) => i + 1);
      const url = generateFavoritesUrl(manyIds);
      expect(url.length).toBeLessThan(2500); // Well within browser limits
      expect(parseSharedUrl(url)).toEqual(manyIds);
    });
  });
});
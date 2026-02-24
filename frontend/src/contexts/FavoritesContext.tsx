"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useToast } from "./ToastContext";
import { generateFavoritesUrl, parseSharedUrl } from "../utils/sharing";

interface FavoritesContextType {
  favorites: number[];
  count: number;
  isFavorited: (dogId: number | string) => boolean;
  addFavorite: (dogId: number | string, dogName?: string) => Promise<void>;
  removeFavorite: (dogId: number | string, dogName?: string) => Promise<void>;
  removeFavoritesBatch: (dogIds: number[]) => void;
  toggleFavorite: (dogId: number | string, dogName?: string) => Promise<void>;
  clearFavorites: () => void;
  getShareableUrl: () => string;
  loadFromUrl: (url: string) => void;
  isLoading: boolean;
  isHydrated: boolean;
}

const toNumericId = (dogId: number | string): number => {
  if (typeof dogId === "number") return dogId;
  const parsed = parseInt(dogId, 10);
  if (Number.isNaN(parsed)) {
    console.error(`[Favorites] Invalid non-numeric dog ID: ${dogId}`);
    return -1;
  }
  return parsed;
};

const STORAGE_VERSION = "v1";
const STORAGE_KEY = `rescue-dogs-favorites:${STORAGE_VERSION}`;
const MAX_FAVORITES = 100;

const FavoritesContext = createContext<FavoritesContextType | undefined>(
  undefined,
);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { showToast } = useToast();
  const [toastMessage, setToastMessage] = useState<{
    type: "add" | "remove" | "error" | "success";
    message: string;
  } | null>(null);

  // Cleanup function to be called on unmount
  useEffect(() => {
    return () => {
      // Clear any pending timeouts on unmount
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, []);

  // Show toast messages after state updates
  useEffect(() => {
    if (toastMessage) {
      showToast(toastMessage.type, toastMessage.message);
      setToastMessage(null);
    }
  }, [toastMessage, showToast]);

  // Load favorites from localStorage on mount (SSR safe)
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);

        // Validate loaded data
        if (!Array.isArray(parsed)) {
          throw new Error("Stored data is not an array");
        }

        // Validate each item is a valid dog ID
        const isValidDogIds = parsed.every(
          (id) =>
            typeof id === "number" &&
            Number.isInteger(id) &&
            id > 0 &&
            id <= Number.MAX_SAFE_INTEGER,
        );

        if (!isValidDogIds) {
          throw new Error("Stored data contains invalid dog IDs");
        }

        // Limit check for stored data
        if (parsed.length > MAX_FAVORITES) {
          // Truncate to limit and show warning
          const truncated = parsed.slice(0, MAX_FAVORITES);
          setFavorites(truncated);
          // Save truncated data back to localStorage
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(truncated));
          } catch (saveError) {
            // Silently handle storage error
          }
          setToastMessage({
            type: "error",
            message: `Favorites list truncated to ${MAX_FAVORITES} items due to limit`,
          });
          return;
        }

        setFavorites(parsed);
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to load favorites from localStorage:", error);
      }

      // Clear corrupted data and reset to empty array
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (clearError) {
        // Ignore errors when clearing corrupted data
      }

      setFavorites([]);
      setToastMessage({
        type: "error",
        message: "Favorites data was corrupted and has been reset",
      });
    } finally {
      setIsHydrated(true);
    }
  }, []); // This only runs on mount, no dependencies needed

  // Listen for storage events to sync across tabs/windows
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);

          // Strict validation for cross-tab sync data
          if (!Array.isArray(parsed)) {
            throw new Error("Storage sync data is not an array");
          }

          // Validate each item is a valid dog ID (positive integer)
          const isValidDogIds = parsed.every(
            (id) =>
              typeof id === "number" &&
              Number.isInteger(id) &&
              id > 0 &&
              id <= Number.MAX_SAFE_INTEGER,
          );

          if (!isValidDogIds) {
            throw new Error("Storage sync contains invalid dog IDs");
          }

          // Limit to prevent abuse
          if (parsed.length > MAX_FAVORITES) {
            throw new Error(
              `Storage sync exceeds favorites limit: ${parsed.length}`,
            );
          }

          setFavorites(parsed);
        } catch (error) {
          if (process.env.NODE_ENV === "development") {
            console.error(
              "Failed to sync favorites from storage event:",
              error,
            );
          }
          // Don't show user error for cross-tab sync issues - just ignore invalid data
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Broadcast changes to other components via custom event
  useEffect(() => {
    if (typeof window === "undefined") return;

    const event = new CustomEvent("favoritesChanged", {
      detail: { favorites, count: favorites.length },
    });
    window.dispatchEvent(event);
  }, [favorites]);

  // Save to localStorage with comprehensive error handling
  const saveToLocalStorage = useCallback((newFavorites: number[]) => {
    if (typeof window === "undefined") return;

    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    // Save immediately with comprehensive error handling
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newFavorites));
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to save favorites to localStorage:", error);
      }

      // Handle specific storage errors
      if (error instanceof DOMException) {
        if (error.name === "QuotaExceededError") {
          setToastMessage({
            type: "error",
            message:
              "Storage limit reached. Please remove some favorites to continue.",
          });
        } else if (error.name === "SecurityError") {
          setToastMessage({
            type: "error",
            message:
              "Unable to save favorites. Please check your browser privacy settings.",
          });
        } else {
          setToastMessage({
            type: "error",
            message: "Failed to save favorites. Please try again.",
          });
        }
      } else {
        setToastMessage({
          type: "error",
          message: "Failed to save favorites. Please try again.",
        });
      }
    }
  }, []);

  const isFavorited = useCallback(
    (dogId: number | string): boolean => {
      return favorites.includes(toNumericId(dogId));
    },
    [favorites],
  );

  const addFavorite = useCallback(
    async (dogId: number | string, dogName?: string): Promise<void> => {
      const numId = toNumericId(dogId);
      setFavorites((prev) => {
        if (prev.includes(numId)) {
          return prev;
        }

        if (prev.length >= MAX_FAVORITES) {
          if (process.env.NODE_ENV === "development") {
            console.warn(`Maximum favorites limit (${MAX_FAVORITES}) reached`);
          }
          setToastMessage({
            type: "error",
            message: `Maximum ${MAX_FAVORITES} favorites reached`,
          });
          return prev;
        }

        const newFavorites = [...prev, numId];
        saveToLocalStorage(newFavorites);

        const message = dogName
          ? `${dogName} added to favorites`
          : "Added to favorites";
        setToastMessage({ type: "add", message });

        return newFavorites;
      });
    },
    [saveToLocalStorage],
  );

  const removeFavorite = useCallback(
    async (dogId: number | string, dogName?: string): Promise<void> => {
      const numId = toNumericId(dogId);
      setFavorites((prev) => {
        const newFavorites = prev.filter((id) => id !== numId);
        saveToLocalStorage(newFavorites);

        // Show remove toast
        const message = dogName
          ? `${dogName} removed from favorites`
          : "Removed from favorites";
        setToastMessage({ type: "remove", message });

        return newFavorites;
      });
    },
    [saveToLocalStorage],
  );

  const removeFavoritesBatch = useCallback(
    (dogIds: number[]): void => {
      if (dogIds.length === 0) return;
      const idsToRemove = new Set(dogIds);
      setFavorites((prev) => {
        const newFavorites = prev.filter((id) => !idsToRemove.has(id));
        saveToLocalStorage(newFavorites);
        return newFavorites;
      });
      setToastMessage({
        type: "remove",
        message: `Removed ${dogIds.length} unavailable dog${dogIds.length !== 1 ? "s" : ""} from favorites`,
      });
    },
    [saveToLocalStorage],
  );

  const toggleFavorite = useCallback(
    async (dogId: number | string, dogName?: string): Promise<void> => {
      if (isFavorited(dogId)) {
        await removeFavorite(dogId, dogName);
      } else {
        await addFavorite(dogId, dogName);
      }
    },
    [isFavorited, addFavorite, removeFavorite],
  );

  const clearFavorites = useCallback(() => {
    setFavorites([]);
    saveToLocalStorage([]);
  }, [saveToLocalStorage]);

  const getShareableUrl = useCallback((): string => {
    // Use the new tiered URL generation strategy
    return generateFavoritesUrl(favorites);
  }, [favorites]);

  const loadFromUrl = useCallback(
    (url: string): void => {
      try {
        const parsed = parseSharedUrl(url);

        if (parsed.length === 0) {
          return;
        }

        const isValidDogIds = parsed.every(
          (id) =>
            typeof id === "number" &&
            Number.isInteger(id) &&
            id > 0 &&
            id <= Number.MAX_SAFE_INTEGER,
        );

        if (!isValidDogIds) {
          throw new Error("Invalid shared data: contains invalid dog IDs");
        }

        // Read current state from localStorage (source of truth) to merge
        let current: number[] = [];
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) current = JSON.parse(raw) as number[];
        } catch {
          // If localStorage read fails, merge with empty
        }

        const merged = [...new Set([...current, ...parsed])].slice(
          0,
          MAX_FAVORITES,
        );
        const newCount = merged.length - current.length;

        setFavorites(merged);
        saveToLocalStorage(merged);

        if (newCount > 0) {
          setToastMessage({
            type: "success",
            message: `Added ${newCount} new dog${newCount !== 1 ? "s" : ""} to your favorites`,
          });
        } else {
          setToastMessage({
            type: "success",
            message: "All shared dogs were already in your favorites",
          });
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("Failed to load favorites from URL:", error);
        }

        setToastMessage({
          type: "error",
          message: "Invalid shared link. Please check the URL and try again.",
        });
      }
    },
    [saveToLocalStorage],
  );

  const value: FavoritesContextType = {
    favorites,
    count: favorites.length,
    isFavorited,
    addFavorite,
    removeFavorite,
    removeFavoritesBatch,
    toggleFavorite,
    clearFavorites,
    getShareableUrl,
    loadFromUrl,
    isLoading,
    isHydrated,
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return context;
}

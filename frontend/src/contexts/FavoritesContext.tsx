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
  isFavorited: (dogId: number) => boolean;
  addFavorite: (dogId: number, dogName?: string) => Promise<void>;
  removeFavorite: (dogId: number, dogName?: string) => Promise<void>;
  toggleFavorite: (dogId: number, dogName?: string) => Promise<void>;
  clearFavorites: () => void;
  getShareableUrl: () => string;
  loadFromUrl: (url: string) => void;
  isLoading: boolean;
}

const STORAGE_KEY = "rescue-dogs-favorites";
const MAX_FAVORITES = 100;

const FavoritesContext = createContext<FavoritesContextType | undefined>(
  undefined,
);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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
    (dogId: number): boolean => {
      return favorites.includes(dogId);
    },
    [favorites],
  );

  const addFavorite = useCallback(
    async (dogId: number, dogName?: string): Promise<void> => {
      setFavorites((prev) => {
        // Check if already favorited
        if (prev.includes(dogId)) {
          return prev;
        }

        // Check max favorites limit
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

        const newFavorites = [...prev, dogId];
        saveToLocalStorage(newFavorites);

        // Show success toast
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
    async (dogId: number, dogName?: string): Promise<void> => {
      setFavorites((prev) => {
        const newFavorites = prev.filter((id) => id !== dogId);
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

  const toggleFavorite = useCallback(
    async (dogId: number, dogName?: string): Promise<void> => {
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
        // Use the new parsing utility that handles all URL formats
        const parsed = parseSharedUrl(url);

        if (parsed.length === 0) {
          // No favorites in URL
          return;
        }

        // Validate parsed IDs
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

        // Limit the number of shared favorites to prevent abuse
        if (parsed.length > MAX_FAVORITES) {
          throw new Error(
            `Too many shared favorites: ${parsed.length} exceeds limit of ${MAX_FAVORITES}`,
          );
        }

        setFavorites(parsed);
        saveToLocalStorage(parsed);

        // Show success feedback to user
        setToastMessage({
          type: "success",
          message: `Loaded ${parsed.length} shared favorite${parsed.length !== 1 ? "s" : ""}`,
        });
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("Failed to load favorites from URL:", error);
        }

        // Show error feedback to user for invalid shared URLs
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
    toggleFavorite,
    clearFavorites,
    getShareableUrl,
    loadFromUrl,
    isLoading,
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

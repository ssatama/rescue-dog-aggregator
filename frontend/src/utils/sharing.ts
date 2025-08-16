/**
 * Enhanced sharing utilities for cross-platform compatibility
 * Handles both individual dogs and collections with smart URL generation
 */

interface ShareOptions {
  title: string;
  text: string;
  url?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

// Configuration for URL generation
const SHARE_CONFIG = {
  maxUrlLength: 2000, // Safe URL length limit
  directThreshold: 10, // Use direct IDs for ≤10 items
  compressionThreshold: 30, // Use compression for ≤30 items
  get baseUrl() {
    if (typeof window === "undefined") return "";
    // Ensure proper URL formation even with IP addresses
    const origin = window.location.origin;
    // Remove any trailing slashes
    return origin.replace(/\/$/, "");
  },
};

/**
 * Check if running on mobile device
 */
export function isMobile(): boolean {
  if (typeof window === "undefined") return false;

  // Check for mobile user agent
  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = [
    "mobile",
    "android",
    "iphone",
    "ipad",
    "ipod",
    "blackberry",
    "windows phone",
  ];
  const isMobileUserAgent = mobileKeywords.some((keyword) =>
    userAgent.includes(keyword),
  );

  // Also check viewport width
  const isMobileViewport = window.innerWidth < 768;

  return isMobileUserAgent || isMobileViewport;
}

/**
 * Generate optimized shareable URL for favorites
 */
export function generateFavoritesUrl(favoriteIds: number[]): string {
  const baseUrl = `${SHARE_CONFIG.baseUrl}/favorites`;

  if (favoriteIds.length === 0) {
    return baseUrl;
  }

  // Small collections: use simple comma-separated IDs
  if (favoriteIds.length <= SHARE_CONFIG.directThreshold) {
    return `${baseUrl}?ids=${favoriteIds.join(",")}`;
  }

  // Medium collections: use compressed encoding
  if (favoriteIds.length <= SHARE_CONFIG.compressionThreshold) {
    const compressed = compressIds(favoriteIds);
    const url = `${baseUrl}?c=${compressed}`;

    // Check URL length and fall back if too long
    if (url.length <= SHARE_CONFIG.maxUrlLength) {
      return url;
    }
  }

  // Large collections or long URLs: use base64 as fallback
  // In production, this would create a server-side session
  try {
    const encoded = btoa(JSON.stringify(favoriteIds));
    return `${baseUrl}?shared=${encoded}`;
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Failed to encode favorites:", error);
    }
    return baseUrl;
  }
}

/**
 * Compress array of IDs to a shorter string
 */
function compressIds(ids: number[]): string {
  // Sort and find ranges for better compression
  const sorted = [...ids].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let end = sorted[0];

  for (let i = 1; i <= sorted.length; i++) {
    if (i === sorted.length || sorted[i] !== end + 1) {
      // End of a range
      if (start === end) {
        ranges.push(String(start));
      } else if (end === start + 1) {
        ranges.push(`${start},${end}`);
      } else {
        ranges.push(`${start}-${end}`);
      }

      if (i < sorted.length) {
        start = sorted[i];
        end = sorted[i];
      }
    } else {
      end = sorted[i];
    }
  }

  return ranges.join(".");
}

/**
 * Decompress string back to array of IDs
 */
export function decompressIds(compressed: string): number[] {
  const ids: number[] = [];
  const ranges = compressed.split(".");

  for (const range of ranges) {
    if (range.includes("-")) {
      const [start, end] = range.split("-").map(Number);
      for (let i = start; i <= end; i++) {
        ids.push(i);
      }
    } else if (range.includes(",")) {
      ids.push(...range.split(",").map(Number));
    } else {
      ids.push(Number(range));
    }
  }

  return ids;
}

/**
 * Generate share text based on collection size
 */
export function generateShareText(
  count: number,
  type: "favorites" | "dog" = "favorites",
): string {
  if (type === "dog") {
    return "Check out this rescue dog looking for a home!";
  }

  if (count === 1) {
    return "Check out my favorite rescue dog!";
  } else if (count <= 5) {
    return `Check out my ${count} favorite rescue dogs!`;
  } else {
    return `I've found ${count} amazing rescue dogs looking for homes!`;
  }
}

/**
 * Share favorites collection with smart handling
 */
export async function shareFavorites(
  favoriteIds: number[],
  options?: Partial<ShareOptions>,
): Promise<{ success: boolean; method?: string; message?: string }> {
  const shareUrl = generateFavoritesUrl(favoriteIds);
  const shareText = generateShareText(favoriteIds.length);

  const shareData: ShareOptions = {
    title: options?.title || "My Rescue Dog Favorites",
    text: options?.text || shareText,
    url: shareUrl,
    ...options,
  };

  try {
    // Mobile: Try native share first
    if (navigator.share && isMobile()) {
      // Check if the browser can share this data
      const canShare = navigator.canShare
        ? navigator.canShare({
            title: shareData.title,
            text: shareData.text,
            url: shareData.url,
          })
        : true;

      if (canShare) {
        await navigator.share({
          title: shareData.title,
          text: shareData.text,
          url: shareData.url,
        });
        shareData.onSuccess?.();
        return { success: true, method: "native" };
      }
    }

    // Fallback: Copy to clipboard
    if (shareData.url) {
      await navigator.clipboard.writeText(shareData.url);
      shareData.onSuccess?.();
      return {
        success: true,
        method: "clipboard",
        message: "Link copied to clipboard!",
      };
    }

    throw new Error("No sharing method available");
  } catch (error) {
    // User cancelled or error occurred
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        // User cancelled, not an error
        return { success: false, method: "cancelled" };
      }

      if (process.env.NODE_ENV === "development") {
        console.error("Share failed:", error);
      }
      shareData.onError?.(error);

      // Try fallback for clipboard errors
      if (
        error.name === "NotAllowedError" ||
        error.message.includes("clipboard")
      ) {
        // Fallback: Show share modal or use alternative method
        return {
          success: false,
          method: "error",
          message:
            "Unable to copy link. Please try again or use the share buttons below.",
        };
      }
    }

    return { success: false, method: "error" };
  }
}

/**
 * Share individual dog with enhanced metadata
 */
export async function shareDog(
  dog: {
    id: number;
    name: string;
    breed?: string;
    organization_name?: string;
  },
  options?: Partial<ShareOptions>,
): Promise<{ success: boolean; method?: string; message?: string }> {
  const shareUrl = `${SHARE_CONFIG.baseUrl}/dogs/${dog.id}`;
  const shareText = `${dog.name} - ${dog.breed || "Rescue Dog"} at ${dog.organization_name || "Rescue Organization"}`;

  const shareData: ShareOptions = {
    title: options?.title || dog.name,
    text: options?.text || shareText,
    url: shareUrl,
    ...options,
  };

  try {
    // Mobile: Try native share first
    if (navigator.share && isMobile()) {
      await navigator.share({
        title: shareData.title,
        text: shareData.text,
        url: shareData.url,
      });
      shareData.onSuccess?.();
      return { success: true, method: "native" };
    }

    // Desktop: Copy to clipboard
    await navigator.clipboard.writeText(shareData.url || "");
    shareData.onSuccess?.();
    return {
      success: true,
      method: "clipboard",
      message: "Link copied to clipboard!",
    };
  } catch (error) {
    if (error instanceof Error && error.name !== "AbortError") {
      if (process.env.NODE_ENV === "development") {
        console.error("Share failed:", error);
      }
      shareData.onError?.(error);
    }
    return { success: false, method: "error" };
  }
}

/**
 * Parse shared URL to extract favorite IDs
 */
export function parseSharedUrl(url: string): number[] {
  try {
    // Handle relative URLs by constructing a full URL
    const urlObj = url.startsWith("http")
      ? new URL(url)
      : new URL(
          url,
          typeof window !== "undefined"
            ? window.location.origin
            : "http://localhost",
        );

    // Check for direct IDs
    const ids = urlObj.searchParams.get("ids");
    if (ids) {
      return ids
        .split(",")
        .map(Number)
        .filter((n) => !isNaN(n));
    }

    // Check for compressed format
    const compressed = urlObj.searchParams.get("c");
    if (compressed) {
      return decompressIds(compressed);
    }

    // Check for base64 format (backward compatibility)
    const shared = urlObj.searchParams.get("shared");
    if (shared) {
      try {
        const decoded = atob(shared);
        const parsed = JSON.parse(decoded);
        if (Array.isArray(parsed)) {
          return parsed.filter((id) => typeof id === "number");
        }
      } catch (e) {
        if (process.env.NODE_ENV === "development") {
          console.error("Failed to parse base64 shared data:", e);
        }
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Failed to parse shared URL:", error);
    }
  }

  return [];
}

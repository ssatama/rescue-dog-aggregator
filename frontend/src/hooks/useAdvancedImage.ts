import { useState, useEffect, useRef, useCallback } from "react";
import {
  getDetailHeroImageWithPosition,
  trackImageLoad,
  handleImageError,
} from "../utils/imageUtils";
import { getLoadingStrategy, onNetworkChange } from "../utils/networkUtils";
import { logger } from "../utils/logger";

// Network strategy type from networkUtils.js
interface NetworkStrategy {
  loading: "eager" | "lazy";
  useProgressive: boolean;
  quality: string;
  dimensions: { width: number; height: number };
  timeout: number;
  retry: {
    maxRetries: number;
    baseDelay: number;
    backoffMultiplier: number;
  };
  skipOptimizations: boolean;
}

// Base configuration constants
const BASE_RETRY_DELAY = 1000; // 1 second base delay between retries

// Test-aware state update utility
const safeSetState = <T>(setState: (value: T) => void, value: T) => {
  if (process.env.NODE_ENV === "test") {
    queueMicrotask(() => setState(value));
  } else {
    setState(value);
  }
};

export interface UseAdvancedImageOptions {
  onError?: () => void;
  onLoad?: () => void;
  useGradientFallback?: boolean;
  type?: "hero" | "standard";
}

export interface UseAdvancedImageReturn {
  imageLoaded: boolean;
  hasError: boolean;
  isLoading: boolean;
  isRetrying: boolean;
  retryCount: number;
  currentSrc: string;
  position: string;
  isReady: boolean;
  networkStrategy: NetworkStrategy;
  handleRetry: () => void;
  hydrated: boolean;
}

export function useAdvancedImage(
  src: string,
  options: UseAdvancedImageOptions = {},
): UseAdvancedImageReturn {
  const {
    onError = () => {},
    onLoad = () => {},
    useGradientFallback = false,
    type = "hero",
  } = options;

  const [hydrated, setHydrated] = useState(false);
  const isSSR = typeof window === "undefined";

  const [imageLoaded, setImageLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [currentSrc, setCurrentSrc] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [networkStrategy, setNetworkStrategy] = useState<NetworkStrategy>(() =>
    getLoadingStrategy(type) as NetworkStrategy,
  );

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loadStartTimeRef = useRef<number | null>(null);
  const imageLoaderRef = useRef<HTMLImageElement | null>(null);

  const { src: optimizedSrc, position } = getDetailHeroImageWithPosition(
    src,
    true,
  );

  // Hydration effect
  useEffect(() => {
    if (!isSSR && !hydrated) {
      const handleHydration = () => {
        setHydrated(true);
        setIsReady(document.readyState === "complete");
      };

      if (document.readyState === "complete") {
        handleHydration();
      } else {
        window.addEventListener("load", handleHydration);
        return () => window.removeEventListener("load", handleHydration);
      }
    }
  }, [isSSR, hydrated]);

  // Network strategy updates
  useEffect(() => {
    const handleNetworkChange = () => {
      setNetworkStrategy(getLoadingStrategy(type) as NetworkStrategy);
    };

    if (typeof window !== "undefined" && "connection" in navigator) {
      navigator.connection?.addEventListener("change", handleNetworkChange);
      return () => {
        navigator.connection?.removeEventListener("change", handleNetworkChange);
      };
    }
  }, [type]);

  // Effect 1: Reset state and trigger loading when src changes.
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (imageLoaderRef.current) imageLoaderRef.current.src = ""; // Abort ongoing load

    /* eslint-disable react-hooks/set-state-in-effect -- Resetting image state when src changes */
    setImageLoaded(false);
    setHasError(false);
    setIsRetrying(false);
    setRetryCount(0);
    setCurrentSrc("");
    /* eslint-enable react-hooks/set-state-in-effect */

    // Start loading only if we have a valid src and the document is ready.
    if (src && isReady && hydrated) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  }, [src, isReady, hydrated]);

  // Effect 2: Perform the image loading side-effect.
  useEffect(() => {
    if (!isLoading || !optimizedSrc) {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      };
    }

    let isCancelled = false;
    const img = new Image();
    imageLoaderRef.current = img;
    loadStartTimeRef.current = Date.now();

    const timeoutDuration = networkStrategy.timeout || 10000;
    timeoutRef.current = setTimeout(() => {
      if (!isCancelled) {
        setHasError(true);
        setIsLoading(false);
        onError();
      }
    }, timeoutDuration);

    img.onload = () => {
      if (!isCancelled) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        const loadTime = Date.now() - (loadStartTimeRef.current || 0);
        trackImageLoad(optimizedSrc, loadTime, type, retryCount);

        // CRITICAL FIX: Set the currentSrc so the <img> tag can render the image.
        setCurrentSrc(optimizedSrc);
        setImageLoaded(true);
        setHasError(false);
        setIsLoading(false);
        onLoad();
      }
    };

    img.onerror = () => {
      if (!isCancelled) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        setHasError(true);
        setIsLoading(false);
        logger.error("[useAdvancedImage] Image failed to load:", optimizedSrc);
        onError();
      }
    };

    img.src = optimizedSrc;

    return () => {
      isCancelled = true;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [
    isLoading,
    optimizedSrc,
    networkStrategy,
    onLoad,
    onError,
    retryCount,
    type,
  ]);

  // Manual retry function
  const handleRetry = useCallback(() => {
    if (optimizedSrc) {
      // Reset state to trigger a new loading attempt
      setHasError(false);
      setImageLoaded(false);
      setIsRetrying(true);
      setRetryCount((prev) => prev + 1);
      setIsLoading(true); // This will re-trigger the loading effect
    }
  }, [optimizedSrc]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  return {
    imageLoaded,
    hasError,
    isLoading,
    isRetrying,
    retryCount,
    currentSrc,
    position,
    isReady,
    networkStrategy,
    handleRetry,
    hydrated,
  };
}

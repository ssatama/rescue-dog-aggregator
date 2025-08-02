/**
 * @fileoverview Image Utilities for Cloudflare R2 and Image Transformations
 *
 * This module provides comprehensive image optimization and transformation utilities
 * for the rescue dog aggregator frontend. It handles:
 * - Cloudflare R2 image transformations using the new Cloudflare Images API
 * - Security validation to prevent path traversal attacks
 * - Performance optimizations including memoization and network-aware quality
 * - Error handling and fallback strategies
 * - Image preloading and smart positioning
 *
 * Architecture:
 * - Uses Cloudflare's modern parameter format (w=X,h=Y,fit=Z,quality=N)
 * - Implements comprehensive security validation before URL processing
 * - Provides memoized transformation functions for performance
 * - Includes monitoring and analytics for image loading performance
 *
 * @author Claude Code
 * @version 2.0.0 - Cloudflare Images Migration
 * @since 1.0.0
 */

import { logger } from "./logger";
import {
  getAdaptiveImageQuality,
  getAdaptiveImageDimensions,
  isSlowConnection,
} from "./networkUtils";

// Configuration constants
const R2_CUSTOM_DOMAIN =
  process.env.NEXT_PUBLIC_R2_CUSTOM_DOMAIN || "images.rescuedogs.me";
const USE_R2_IMAGES = true; // Enable R2 transformations using Cloudflare Image Resizing
const PLACEHOLDER_IMAGE = "/placeholder_dog.svg";

/**
 * Helper function to determine whether to use transformed or original URL
 * @private
 * @param {string} originalUrl - The original image URL
 * @param {string} transformedUrl - The transformed image URL
 * @returns {string} The URL to use based on configuration
 */
function getOriginalOrTransformed(originalUrl, transformedUrl) {
  return USE_R2_IMAGES ? transformedUrl : originalUrl;
}

// Memoization cache for performance optimization
const imageUrlCache = new Map();

/**
 * Validate image URL for security
 * @param {string} url - Image URL to validate
 * @returns {boolean} True if URL is safe
 */
export function validateImageUrl(url) {
  if (!url || typeof url !== "string") {
    return false;
  }

  // Check original URL string for traversal patterns BEFORE URL normalization
  const dangerousPatterns = [
    "../",
    "..\\",
    "..\\\\",
    "/./",
    "/\\", // Only match at path boundaries to avoid false positives with organization names
    "%2E%2E/",
    "%2E%2E%2F",
    "%2E%2E%5C",
    "%2F%2E%2E",
    "%5C%2E%2E",
    "etc/passwd",
    "etc\\passwd",
    "windows\\system32",
    "winnt\\system32",
    "%2E%2F",
    "%2E%5C", // encoded ./ and .\
  ];

  for (const pattern of dangerousPatterns) {
    if (url.includes(pattern)) {
      return false;
    }
  }

  try {
    const urlObj = new URL(url);

    // Only allow R2 URLs
    if (!urlObj.hostname.includes(R2_CUSTOM_DOMAIN)) {
      return false;
    }

    // Check the normalized path as well
    const path = urlObj.pathname;
    const decodedPath = decodeURIComponent(path);

    for (const pattern of dangerousPatterns) {
      if (path.includes(pattern) || decodedPath.includes(pattern)) {
        return false;
      }
    }

    // Special check for current directory reference at path boundaries
    if (path === "/." || path.includes("/./")) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Create transformation parameters in Cloudflare format
 * @param {string} preset - Preset name (catalog, hero, thumbnail, mobile)
 * @param {Object} options - Custom options override
 * @param {boolean} isSlowConnection - Whether connection is slow
 * @returns {string} Cloudflare transformation parameters
 */
export function createTransformationParams(
  preset = "catalog",
  options = {},
  isSlowConnection = false,
) {
  const presets = {
    catalog: { width: 400, height: 300, fit: "cover", quality: "auto" },
    hero: { width: 800, height: 600, fit: "contain", quality: "auto" },
    thumbnail: { width: 200, height: 200, fit: "cover", quality: 60 },
    mobile: { width: 320, height: 240, fit: "cover", quality: 70 },
  };

  const config = presets[preset] || presets.catalog;
  const finalConfig = { ...config, ...options };

  // Adjust quality for slow connections
  if (isSlowConnection && finalConfig.quality === "auto") {
    finalConfig.quality = 60;
  }

  return `w=${finalConfig.width},h=${finalConfig.height},fit=${finalConfig.fit},quality=${finalConfig.quality}`;
}

/**
 * Build secure Cloudflare transformation URL
 * @param {string} imageUrl - Original image URL
 * @param {string} params - Transformation parameters
 * @returns {string} Secure Cloudflare URL
 */
export function buildSecureCloudflareUrl(imageUrl, params) {
  if (!imageUrl || !isR2Url(imageUrl)) {
    return imageUrl;
  }

  // Validate URL for security
  if (!validateImageUrl(imageUrl)) {
    throw new Error("Invalid image path");
  }

  // Validate parameters for security - strict validation
  if (params) {
    // Allow only specific Cloudflare parameters
    const allowedParams =
      /^[wh]=\d+|fit=(cover|contain|crop|scale-down|fill|pad)|quality=(auto|\d+)$/;
    const paramsList = params.split(",");

    for (const param of paramsList) {
      if (!allowedParams.test(param.trim())) {
        throw new Error("Invalid transformation parameters");
      }
    }

    // Check for dangerous characters
    if (
      params.includes(";") ||
      params.includes("&") ||
      params.includes("script") ||
      params.includes("redirect")
    ) {
      throw new Error("Invalid transformation parameters");
    }
  }

  if (!params) {
    return imageUrl;
  }

  const imagePath = imageUrl.replace(`https://${R2_CUSTOM_DOMAIN}/`, "");
  return `https://${R2_CUSTOM_DOMAIN}/cdn-cgi/image/${params}/${imagePath}`;
}

/**
 * Get optimized image with memoization
 * @param {string} url - Original image URL
 * @param {string} preset - Preset name
 * @param {Object} options - Custom options
 * @param {boolean} isSlowConnection - Whether connection is slow
 * @returns {string} Optimized image URL
 */
export function getOptimizedImage(
  url,
  preset = "catalog",
  options = {},
  isSlowConnection = false,
) {
  if (!url) {
    return PLACEHOLDER_IMAGE;
  }

  if (!isR2Url(url)) {
    return url;
  }

  // Create cache key
  const cacheKey = `${url}:${preset}:${JSON.stringify(options)}:${isSlowConnection}`;

  if (imageUrlCache.has(cacheKey)) {
    return imageUrlCache.get(cacheKey);
  }

  try {
    const params = createTransformationParams(
      preset,
      options,
      isSlowConnection,
    );
    const result = buildSecureCloudflareUrl(url, params);

    // Cache result immediately
    imageUrlCache.set(cacheKey, result);

    // Prevent cache from growing too large
    if (imageUrlCache.size > 1000) {
      const firstKey = imageUrlCache.keys().next().value;
      imageUrlCache.delete(firstKey);
    }

    return result;
  } catch (error) {
    logger.warn("Failed to create optimized image URL", {
      url,
      error: error.message,
    });
    return url;
  }
}

// Add cache clearing method for testing
getOptimizedImage.clearCache = () => {
  imageUrlCache.clear();
};

/**
 * Validate R2 configuration on startup
 */
function validateR2Config() {
  if (!R2_CUSTOM_DOMAIN) {
    if (process.env.NODE_ENV !== "production")
      console.error("❌ NEXT_PUBLIC_R2_CUSTOM_DOMAIN is not configured!");
    return false;
  }

  // Validate domain format
  if (!R2_CUSTOM_DOMAIN.match(/^[a-zA-Z0-9.-]+$/)) {
    if (process.env.NODE_ENV !== "production")
      console.error("❌ R2 custom domain contains invalid characters");
    return false;
  }

  return true;
}

// Run validation in development
if (process.env.NODE_ENV === "development") {
  validateR2Config();
}

/**
 * Check if URL is from R2 custom domain
 */
export function isR2Url(url) {
  return !!(url && url.includes(R2_CUSTOM_DOMAIN));
}

/**
 * Build Cloudflare Images transformation URL
 * @param {string} imageUrl - Original R2 image URL
 * @param {string} transformations - Transformation string (e.g., 'w_320,h_240,c_fill,q_70')
 * @returns {string} Cloudflare Images URL with transformations
 */
function buildCloudflareImagesUrl(imageUrl, transformations) {
  if (!imageUrl || !transformations) return imageUrl;

  // Handle complex R2 URLs with proper domain extraction
  const imagePath = imageUrl.replace(`https://${R2_CUSTOM_DOMAIN}/`, "");
  return `https://${R2_CUSTOM_DOMAIN}/cdn-cgi/image/${transformations}/${imagePath}`;
}

/**
 * Get mobile-optimized image URL with network-aware quality
 * @param {string} url - Original image URL
 * @returns {string} Mobile-optimized image URL
 */
export function getMobileOptimizedImage(url) {
  if (!url || !isR2Url(url)) {
    return url || PLACEHOLDER_IMAGE;
  }

  if (!USE_R2_IMAGES || !validateR2Config()) {
    return url;
  }

  try {
    const quality = isSlowConnection() ? "q_50" : "q_70";
    const transformations = `w_320,h_240,c_fill,${quality}`;
    return buildCloudflareImagesUrl(url, transformations);
  } catch (error) {
    logger.warn("Failed to create mobile optimized image URL", {
      url,
      error: error.message,
    });
    return url;
  }
}

/**
 * Get optimized image URL for home page featured dog cards (4:3 aspect ratio)
 */
export function getHomeCardImage(originalUrl) {
  if (!originalUrl) {
    return PLACEHOLDER_IMAGE;
  }

  return getOptimizedImage(originalUrl, "catalog", {}, isSlowConnection());
}

/**
 * Get optimized image URL for catalog grid cards with responsive breakpoints
 * Enhanced for mobile performance and retina displays
 */
export function getCatalogCardImage(originalUrl) {
  if (!originalUrl) {
    return PLACEHOLDER_IMAGE;
  }

  return getOptimizedImage(originalUrl, "catalog", {}, isSlowConnection());
}

/**
 * Get optimized image URL for dog cards (square thumbnails) - LEGACY - use getCatalogCardImage for new implementations
 */
export function getDogThumbnail(originalUrl) {
  if (!originalUrl) {
    return PLACEHOLDER_IMAGE;
  }

  return getOptimizedImage(
    originalUrl,
    "catalog",
    { width: 300, height: 300 },
    isSlowConnection(),
  );
}

/**
 * Get optimized image URL for dog detail hero images with responsive breakpoints
 * Optimized for mobile-first loading with progressive enhancement
 */
export function getDetailHeroImage(originalUrl) {
  if (!originalUrl) {
    return PLACEHOLDER_IMAGE;
  }

  return getOptimizedImage(originalUrl, "hero", {}, isSlowConnection());
}

/**
 * Get network-adaptive optimized image URL for dog detail hero images
 * Automatically adjusts dimensions and quality based on network conditions
 */
export function getDetailHeroImageAdaptive(originalUrl) {
  if (!originalUrl) {
    return PLACEHOLDER_IMAGE;
  }

  const { width, height } = getAdaptiveImageDimensions("hero");
  const quality = getAdaptiveImageQuality().replace("q_", "");

  return getOptimizedImage(
    originalUrl,
    "hero",
    { width, height, quality },
    isSlowConnection(),
  );
}

/**
 * Get optimized image URL for dog detail pages - LEGACY - use getDetailHeroImage for new implementations
 */
export function getDogDetailImage(originalUrl) {
  if (!originalUrl) {
    return PLACEHOLDER_IMAGE;
  }

  return getOptimizedImage(originalUrl, "hero", {}, isSlowConnection());
}

/**
 * Get optimized image URL for gallery thumbnails with performance optimization
 * Optimized for fast loading and bandwidth efficiency
 */
export function getThumbnailImage(originalUrl) {
  if (!originalUrl) {
    return PLACEHOLDER_IMAGE;
  }

  return getOptimizedImage(originalUrl, "thumbnail", {}, isSlowConnection());
}

/**
 * Get image URL for smaller thumbnails (like in additional images) - LEGACY - use getThumbnailImage for new implementations
 */
export function getDogSmallThumbnail(originalUrl) {
  if (!originalUrl) {
    return PLACEHOLDER_IMAGE;
  }

  return getOptimizedImage(
    originalUrl,
    "thumbnail",
    { width: 150, height: 150, fit: "contain" },
    isSlowConnection(),
  );
}

/**
 * Enhanced error handling with monitoring and progressive fallback
 */
export function handleImageError(event, originalUrl, context = "unknown") {
  // Defensive check for event and target
  if (!event || !event.target) {
    if (process.env.NODE_ENV !== "production")
      console.error(
        "handleImageError called with invalid event object:",
        event,
      );
    return;
  }

  const currentSrc = event.target.src;

  // Track image loading failures for monitoring
  trackImageError(currentSrc, originalUrl, context);

  // Progressive fallback strategy
  if (isR2Url(currentSrc) && originalUrl && !isR2Url(originalUrl)) {
    // Try original URL if R2 transformation failed
    logger.warn("R2 image failed, trying original:", originalUrl);
    event.target.src = originalUrl;
    event.target.onerror = (e) =>
      handleImageError(e, originalUrl, `${context}-fallback`);
    return;
  }

  // If current URL contains transformations, try without transformations
  if (isR2Url(currentSrc) && currentSrc.includes("/cdn-cgi/image/")) {
    const parts = currentSrc.split("/cdn-cgi/image/");
    if (parts.length > 1) {
      // Remove transformation parameters
      const baseUrl = parts[0] + "/";
      const imagePath = parts[1].split("/").slice(1).join("/");
      const simpleUrl = baseUrl + imagePath;

      if (simpleUrl !== currentSrc) {
        logger.warn("Trying image without transformations:", simpleUrl);
        event.target.src = simpleUrl;
        event.target.onerror = (e) =>
          handleImageError(e, originalUrl, `${context}-notransform`);
        return;
      }
    }
  }

  // Final fallback to placeholder
  if (currentSrc !== PLACEHOLDER_IMAGE) {
    logger.error("All image loading attempts failed, using placeholder");
    event.target.src = PLACEHOLDER_IMAGE;
  }

  // Prevent infinite error loops
  event.target.onerror = null;
}

/**
 * Track image loading errors and performance for monitoring
 */
let imageErrorStats = {
  total: 0,
  r2: 0,
  external: 0,
  lastErrors: [],
};

let imageLoadStats = {
  total: 0,
  heroImages: 0,
  catalogImages: 0,
  averageLoadTime: 0,
  loadTimes: [],
  networkConditions: [],
  retryAttempts: 0,
};

function trackImageError(failedUrl, originalUrl, context) {
  imageErrorStats.total++;

  if (isR2Url(failedUrl)) {
    imageErrorStats.r2++;
  } else {
    imageErrorStats.external++;
  }

  const errorInfo = {
    timestamp: new Date().toISOString(),
    failedUrl,
    originalUrl,
    context,
    userAgent:
      typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
  };

  imageErrorStats.lastErrors.push(errorInfo);

  // Keep only last 10 errors
  if (imageErrorStats.lastErrors.length > 10) {
    imageErrorStats.lastErrors.shift();
  }

  // Log error in development with more details
  if (process.env.NODE_ENV !== "production")
    console.warn("Image loading error details:", {
      failedUrl,
      originalUrl,
      context,
      timestamp: errorInfo.timestamp,
    });

  // In production, you might want to send this to an analytics service
  if (
    process.env.NODE_ENV === "production" &&
    imageErrorStats.total % 10 === 0
  ) {
    // Report every 10th error to avoid spam
    reportImageErrorBatch();
  }
}

/**
 * Get image loading error statistics
 */
export function getImageErrorStats() {
  return { ...imageErrorStats };
}

/**
 * Track successful image load for performance monitoring
 * @param {string} imageUrl - The image URL that loaded successfully
 * @param {number} loadTime - Load time in milliseconds
 * @param {string} context - Image context ('hero', 'catalog', 'thumbnail')
 * @param {number} retryCount - Number of retries that occurred
 */
export function trackImageLoad(
  imageUrl,
  loadTime,
  context = "unknown",
  retryCount = 0,
) {
  imageLoadStats.total++;
  imageLoadStats.retryAttempts += retryCount;

  // Track by context
  if (context === "hero") {
    imageLoadStats.heroImages++;
  } else if (context === "catalog") {
    imageLoadStats.catalogImages++;
  }

  // Track load times
  if (loadTime > 0) {
    imageLoadStats.loadTimes.push(loadTime);

    // Update rolling average (keep last 100 measurements)
    if (imageLoadStats.loadTimes.length > 100) {
      imageLoadStats.loadTimes.shift();
    }

    const sum = imageLoadStats.loadTimes.reduce((a, b) => a + b, 0);
    imageLoadStats.averageLoadTime = Math.round(
      sum / imageLoadStats.loadTimes.length,
    );
  }

  // Track network conditions
  if (typeof navigator !== "undefined" && navigator.connection) {
    const networkInfo = {
      effectiveType: navigator.connection.effectiveType,
      downlink: navigator.connection.downlink,
      saveData: navigator.connection.saveData,
      timestamp: Date.now(),
    };

    imageLoadStats.networkConditions.push(networkInfo);

    // Keep only last 50 network samples
    if (imageLoadStats.networkConditions.length > 50) {
      imageLoadStats.networkConditions.shift();
    }
  }
}

/**
 * Get image loading performance statistics
 */
export function getImageLoadStats() {
  return {
    ...imageLoadStats,
    errorStats: { ...imageErrorStats },
  };
}

/**
 * Reset image error statistics
 */
export function resetImageErrorStats() {
  imageErrorStats = {
    total: 0,
    r2: 0,
    external: 0,
    lastErrors: [],
  };
}

/**
 * Reset image loading statistics
 */
export function resetImageLoadStats() {
  imageLoadStats = {
    total: 0,
    heroImages: 0,
    catalogImages: 0,
    averageLoadTime: 0,
    loadTimes: [],
    networkConditions: [],
    retryAttempts: 0,
  };
}

/**
 * Report image errors to monitoring service (placeholder for production)
 */
function reportImageErrorBatch() {
  if (typeof window === "undefined") return;

  // In a real implementation, you would send this to your analytics/monitoring service
  // For now, just log aggregate stats in development only
  if (process.env.NODE_ENV !== "production")
    console.warn("Image loading error rate:", {
      total: imageErrorStats.total,
      r2Failures: imageErrorStats.r2,
      externalFailures: imageErrorStats.external,
      recentErrors: imageErrorStats.lastErrors.slice(-3),
    });
}

/**
 * Get smart object positioning based on image characteristics
 * @param {string} imageUrl - Image URL to analyze
 * @param {string} context - Context where image is used ('card', 'hero', 'thumbnail')
 * @returns {string} CSS object-position value
 */
export function getSmartObjectPosition(imageUrl, context = "card") {
  // Default positioning strategies based on context
  const positionStrategies = {
    card: "center 40%", // Focus on upper body/face for cards
    hero: "center center", // Centered for hero images
    thumbnail: "center center", // Centered for small thumbnails
  };

  // For now, return context-based positioning
  // Future enhancement: analyze image dimensions or add manual hints
  return positionStrategies[context] || "center center";
}

/**
 * Enhanced card image with smart positioning for standing dogs - Updated for 4:3 ratio
 */
export function getCatalogCardImageWithPosition(originalUrl) {
  if (!originalUrl) {
    return { src: PLACEHOLDER_IMAGE, position: "center center" };
  }

  const src = getOptimizedImage(originalUrl, "catalog", {}, isSlowConnection());
  const position = getSmartObjectPosition(originalUrl, "card");

  return { src, position };
}

/**
 * Add cache-busting parameter to image URL for fresh navigation
 */
export function addCacheBusting(url, context = "navigation") {
  if (!url || typeof url !== "string") return url;

  try {
    const urlObj = new URL(url);
    // Use a timestamp for cache busting
    urlObj.searchParams.set("cb", Date.now().toString());
    return urlObj.toString();
  } catch {
    // If URL parsing fails, use simpler approach
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}cb=${Date.now()}`;
  }
}

/**
 * Enhanced hero image with smart positioning and preloading
 * Optimized for Core Web Vitals (LCP) performance with network adaptivity
 */
export function getDetailHeroImageWithPosition(originalUrl, bustCache = false) {
  if (!originalUrl) {
    return { src: PLACEHOLDER_IMAGE, position: "center center" };
  }

  // Use standard hero image generation
  let src = getDetailHeroImage(originalUrl);
  const position = getSmartObjectPosition(originalUrl, "hero");

  // Add cache-busting for navigation if requested
  if (bustCache) {
    src = addCacheBusting(src, "hero");
  }

  // Preload hero image for better LCP scores only on fast connections
  if (
    typeof window !== "undefined" &&
    originalUrl &&
    process.env.NODE_ENV === "production"
  ) {
    // Only preload on fast connections to avoid wasting bandwidth
    if (!isSlowConnection()) {
      preloadImages([src], "hero");
    }
  }

  return { src, position };
}

/**
 * Preload critical images to improve perceived performance
 * Enhanced with responsive image preloading and error handling
 * @param {Array<string>} imageUrls - Array of image URLs to preload
 * @param {string} context - Context for optimization ('hero', 'card', 'thumbnail')
 */
export function preloadImages(imageUrls, context = "card") {
  if (!Array.isArray(imageUrls)) return;

  // Limit concurrent preloads on mobile for memory optimization
  const isMobile =
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 768px)").matches;
  const maxPreload = isMobile
    ? Math.min(imageUrls.length, 5)
    : imageUrls.length;

  imageUrls.slice(0, maxPreload).forEach((url) => {
    if (!url || typeof url !== "string") return;

    try {
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";

      // Choose appropriate optimization based on context and device
      switch (context) {
        case "hero":
          link.href = getDetailHeroImage(url);
          break;
        case "thumbnail":
          link.href = getThumbnailImage(url);
          break;
        default:
          link.href = isMobile
            ? getMobileOptimizedImage(url)
            : getCatalogCardImage(url);
      }

      // Add responsive image attributes for better performance
      if (context === "hero") {
        link.setAttribute(
          "imagesizes",
          "(max-width: 768px) 100vw, (max-width: 1024px) 800px, 1200px",
        );
      }

      document.head.appendChild(link);
    } catch (error) {
      // Silently handle preload errors in production
      if (process.env.NODE_ENV === "development") {
        // Development-only logging
      }
    }
  });
}

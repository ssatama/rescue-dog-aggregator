import type React from "react";
import { logger } from "./logger";
import {
  getAdaptiveImageQuality,
  getAdaptiveImageDimensions,
  isSlowConnection,
} from "./networkUtils";

const R2_CUSTOM_DOMAIN =
  process.env.NEXT_PUBLIC_R2_CUSTOM_DOMAIN || "images.rescuedogs.me";
const USE_R2_IMAGES = true;
const PLACEHOLDER_IMAGE = "/placeholder_dog.svg";

function getOriginalOrTransformed(originalUrl: string, transformedUrl: string): string {
  return USE_R2_IMAGES ? transformedUrl : originalUrl;
}

class LRUCache<K, V> {
  private maxSize: number;
  private cache: Map<K, V>;
  private hits: number;
  private misses: number;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
    this.cache = new Map();
    this.hits = 0;
    this.misses = 0;
  }

  get(key: K): V | undefined {
    if (this.cache.has(key)) {
      const value = this.cache.get(key)!;
      this.cache.delete(key);
      this.cache.set(key, value);
      this.hits++;
      return value;
    }
    this.misses++;
    return undefined;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  get size(): number {
    return this.cache.size;
  }

  getStats(): { size: number; maxSize: number; hits: number; misses: number; hitRate: number; has: (key: K) => boolean } {
    const totalRequests = this.hits + this.misses;
    return {
      size: this.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: totalRequests > 0 ? this.hits / totalRequests : 0,
      has: (key: K) => this.has(key),
    };
  }
}

const imageUrlCache = new LRUCache<string, string>(1000);

class ImageUrlRegistry {
  private registry: Map<string, string>;
  private sessionTimestamp: number;

  constructor() {
    this.registry = new Map();
    this.sessionTimestamp = Date.now();
  }

  generateKey(originalUrl: string, context: string): string {
    return `${originalUrl}:${context}`;
  }

  registerUrl(originalUrl: string, context: string, bustCache = false): string {
    const key = this.generateKey(originalUrl, context);

    if (this.registry.has(key)) {
      return this.registry.get(key)!;
    }

    let baseUrl: string;
    switch (context) {
      case "hero":
        baseUrl = getDetailHeroImage(originalUrl);
        break;
      case "catalog":
        baseUrl = getCatalogCardImage(originalUrl);
        break;
      case "thumbnail":
        baseUrl = getThumbnailImage(originalUrl);
        break;
      default:
        baseUrl = getOptimizedImage(originalUrl, context);
    }

    const finalUrl = bustCache ? this.addSessionCacheBusting(baseUrl) : baseUrl;

    this.registry.set(key, finalUrl);
    return finalUrl;
  }

  addSessionCacheBusting(url: string): string {
    if (!url || typeof url !== "string") return url;

    try {
      const urlObj = new URL(url);
      urlObj.searchParams.set("cb", this.sessionTimestamp.toString());
      return urlObj.toString();
    } catch {
      const separator = url.includes("?") ? "&" : "?";
      return `${url}${separator}cb=${this.sessionTimestamp}`;
    }
  }

  getUrl(originalUrl: string, context: string): string | undefined {
    const key = this.generateKey(originalUrl, context);
    return this.registry.get(key);
  }

  clearRegistry(): void {
    this.registry.clear();
    this.sessionTimestamp = Date.now();
  }
}

const urlRegistry = new ImageUrlRegistry();

export function getUnifiedImageUrl(
  originalUrl: string | null | undefined,
  context = "catalog",
  bustCache = false,
): string {
  if (!originalUrl) {
    return PLACEHOLDER_IMAGE;
  }

  return urlRegistry.registerUrl(originalUrl, context, bustCache);
}

export function validateImageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") {
    return false;
  }

  const dangerousPatterns = [
    "../",
    "..\\",
    "..\\\\",
    "/./",
    "/\\",
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
    "%2E%5C",
  ];

  for (const pattern of dangerousPatterns) {
    if (url.includes(pattern)) {
      return false;
    }
  }

  try {
    const urlObj = new URL(url);

    if (!urlObj.hostname.includes(R2_CUSTOM_DOMAIN)) {
      return false;
    }

    const path = urlObj.pathname;
    const decodedPath = decodeURIComponent(path);

    for (const pattern of dangerousPatterns) {
      if (path.includes(pattern) || decodedPath.includes(pattern)) {
        return false;
      }
    }

    if (path === "/." || path.includes("/./")) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function createTransformationParams(
  preset = "catalog",
  options: Record<string, unknown> = {},
  isSlowConn = false,
): string {
  const presets: Record<string, { width: number; height: number; fit: string; quality: string | number }> = {
    catalog: { width: 400, height: 300, fit: "cover", quality: "auto" },
    hero: { width: 800, height: 600, fit: "contain", quality: "auto" },
    thumbnail: { width: 200, height: 200, fit: "cover", quality: 60 },
    mobile: { width: 320, height: 240, fit: "cover", quality: 70 },
  };

  const config = presets[preset] || presets.catalog;
  const finalConfig = { ...config, ...options };

  if (isSlowConn && finalConfig.quality === "auto") {
    finalConfig.quality = 60;
  }

  return `w=${finalConfig.width},h=${finalConfig.height},fit=${finalConfig.fit},quality=${finalConfig.quality}`;
}

export function hasExistingTransformation(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") {
    return false;
  }

  return url.includes("/cdn-cgi/image/");
}

export function extractOriginalPath(url: string | null | undefined): string {
  if (!url || typeof url !== "string") {
    return url ?? "";
  }

  if (!isR2Url(url) || !hasExistingTransformation(url)) {
    return url;
  }

  let currentUrl = url;

  while (hasExistingTransformation(currentUrl)) {
    const cdnPattern = /\/cdn-cgi\/image\/[^/]+\//;
    const match = currentUrl.match(cdnPattern);

    if (match) {
      const domain = currentUrl.substring(
        0,
        currentUrl.indexOf("/cdn-cgi/image/"),
      );
      const imagePath = currentUrl.substring(
        currentUrl.indexOf(match[0]) + match[0].length,
      );
      currentUrl = `${domain}/${imagePath}`;
    } else {
      break;
    }
  }

  return currentUrl;
}

export function buildSecureCloudflareUrl(imageUrl: string | null | undefined, params: string | null | undefined): string {
  if (!imageUrl || typeof imageUrl !== "string") {
    return PLACEHOLDER_IMAGE;
  }

  if (!isR2Url(imageUrl)) {
    return imageUrl;
  }

  if (hasExistingTransformation(imageUrl)) {
    return imageUrl;
  }

  if (!validateImageUrl(imageUrl)) {
    logger.warn("Invalid image URL provided, returning original URL", {
      url: imageUrl,
      context: "buildSecureCloudflareUrl",
    });
    return imageUrl;
  }

  if (params && typeof params === "string") {
    const allowedParams =
      /^[wh]=\d+|fit=(cover|contain|crop|scale-down|fill|pad)|quality=(auto|\d+)$/;
    const paramsList = params.split(",");

    for (const param of paramsList) {
      if (!allowedParams.test(param.trim())) {
        logger.warn(
          "Invalid transformation parameters, returning original URL",
          {
            url: imageUrl,
            params,
            invalidParam: param,
            context: "buildSecureCloudflareUrl",
          },
        );
        return imageUrl;
      }
    }

    if (
      params.includes(";") ||
      params.includes("&") ||
      params.includes("script") ||
      params.includes("redirect")
    ) {
      logger.warn("Dangerous parameters detected, returning original URL", {
        url: imageUrl,
        params,
        context: "buildSecureCloudflareUrl",
      });
      return imageUrl;
    }
  }

  if (!params || typeof params !== "string" || params.trim() === "") {
    return imageUrl;
  }

  try {
    const imagePath = imageUrl.replace(`https://${R2_CUSTOM_DOMAIN}/`, "");
    return `https://${R2_CUSTOM_DOMAIN}/cdn-cgi/image/${params}/${imagePath}`;
  } catch (error) {
    logger.warn("Failed to build Cloudflare URL, returning original", {
      url: imageUrl,
      params,
      error: error instanceof Error ? error.message : String(error),
      context: "buildSecureCloudflareUrl",
    });
    return imageUrl;
  }
}

interface GetOptimizedImageFn {
  (url: string | null | undefined, preset?: string, options?: Record<string, unknown>, isSlowConn?: boolean): string;
  clearCache: () => void;
  getCacheStats: () => ReturnType<LRUCache<string, string>["getStats"]>;
}

export const getOptimizedImage: GetOptimizedImageFn = Object.assign(
  function getOptimizedImage(
    url: string | null | undefined,
    preset = "catalog",
    options: Record<string, unknown> = {},
    isSlowConn = false,
  ): string {
    if (!url) {
      return PLACEHOLDER_IMAGE;
    }

    if (!isR2Url(url)) {
      return url;
    }

    const cacheKey = `${url}:${preset}:${JSON.stringify(options)}:${isSlowConn}`;

    const cachedResult = imageUrlCache.get(cacheKey);
    if (cachedResult !== undefined) {
      return cachedResult;
    }

    try {
      const params = createTransformationParams(
        preset,
        options,
        isSlowConn,
      );
      const result = buildSecureCloudflareUrl(url, params);

      imageUrlCache.set(cacheKey, result);

      return result;
    } catch (error) {
      logger.warn("Failed to create optimized image URL", {
        url,
        error: error instanceof Error ? error.message : String(error),
      });
      return url;
    }
  },
  {
    clearCache: () => {
      imageUrlCache.clear();
    },
    getCacheStats: () => {
      return imageUrlCache.getStats();
    },
  },
);

function validateR2Config(): boolean {
  if (!R2_CUSTOM_DOMAIN) {
    if (process.env.NODE_ENV !== "production") {
      console.error("❌ NEXT_PUBLIC_R2_CUSTOM_DOMAIN is not configured!");
    }
    return false;
  }

  if (!R2_CUSTOM_DOMAIN.match(/^[a-zA-Z0-9.-]+$/)) {
    if (process.env.NODE_ENV !== "production") {
      console.error("❌ R2 custom domain contains invalid characters");
    }
    return false;
  }

  return true;
}

if (process.env.NODE_ENV === "development") {
  validateR2Config();
}

export function isR2Url(url: string | null | undefined): boolean {
  return !!(url && url.includes(R2_CUSTOM_DOMAIN));
}

function buildCloudflareImagesUrl(imageUrl: string | null | undefined, transformations: string | null | undefined): string {
  if (!imageUrl || !transformations) return imageUrl ?? "";

  const imagePath = imageUrl.replace(`https://${R2_CUSTOM_DOMAIN}/`, "");
  return `https://${R2_CUSTOM_DOMAIN}/cdn-cgi/image/${transformations}/${imagePath}`;
}

export function getMobileOptimizedImage(url: string | null | undefined): string {
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
      error: error instanceof Error ? error.message : String(error),
    });
    return url;
  }
}

export function getHomeCardImage(originalUrl: string | null | undefined): string {
  if (!originalUrl) {
    return PLACEHOLDER_IMAGE;
  }

  return getOptimizedImage(originalUrl, "catalog", {}, isSlowConnection());
}

export function getCatalogCardImage(originalUrl: string | null | undefined): string {
  if (!originalUrl) {
    return PLACEHOLDER_IMAGE;
  }

  return getOptimizedImage(originalUrl, "catalog", {}, isSlowConnection());
}

export function getDetailHeroImage(originalUrl: string | null | undefined): string {
  if (!originalUrl) {
    return PLACEHOLDER_IMAGE;
  }

  return getOptimizedImage(originalUrl, "hero", {}, isSlowConnection());
}

export function getDetailHeroImageAdaptive(originalUrl: string | null | undefined): string {
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

export function getThumbnailImage(originalUrl: string | null | undefined): string {
  if (!originalUrl) {
    return PLACEHOLDER_IMAGE;
  }

  return getOptimizedImage(originalUrl, "thumbnail", {}, isSlowConnection());
}

export function handleImageError(event: Event | React.SyntheticEvent<HTMLImageElement>, originalUrl: string | null | undefined, context = "unknown"): void {
  if (!event || !(event.target as HTMLImageElement)) {
    if (process.env.NODE_ENV !== "production") {
      console.error(
        "handleImageError called with invalid event object:",
        event,
      );
    }
    return;
  }

  const target = event.target as HTMLImageElement;
  const currentSrc = target.src;

  trackImageError(currentSrc, originalUrl, context);

  if (isR2Url(currentSrc) && originalUrl && !isR2Url(originalUrl)) {
    logger.warn("R2 image failed, trying original:", originalUrl);
    target.src = originalUrl;
    target.onerror = (e) =>
      handleImageError(e as Event, originalUrl, `${context}-fallback`);
    return;
  }

  if (isR2Url(currentSrc) && currentSrc.includes("/cdn-cgi/image/")) {
    const parts = currentSrc.split("/cdn-cgi/image/");
    if (parts.length > 1) {
      const baseUrl = parts[0] + "/";
      const imagePath = parts[1].split("/").slice(1).join("/");
      const simpleUrl = baseUrl + imagePath;

      if (simpleUrl !== currentSrc) {
        logger.warn("Trying image without transformations:", simpleUrl);
        target.src = simpleUrl;
        target.onerror = (e) =>
          handleImageError(e as Event, originalUrl, `${context}-notransform`);
        return;
      }
    }
  }

  if (currentSrc !== PLACEHOLDER_IMAGE) {
    logger.error("All image loading attempts failed, using placeholder");
    target.src = PLACEHOLDER_IMAGE;
  }

  target.onerror = null;
}

interface ImageErrorStats {
  total: number;
  r2: number;
  external: number;
  lastErrors: { timestamp: string; failedUrl: string; originalUrl: string | null | undefined; context: string; userAgent: string }[];
}

interface ImageLoadStats {
  total: number;
  heroImages: number;
  catalogImages: number;
  averageLoadTime: number;
  loadTimes: number[];
  networkConditions: { effectiveType?: string; downlink?: number; saveData?: boolean; timestamp: number }[];
  retryAttempts: number;
}

let imageErrorStats: ImageErrorStats = {
  total: 0,
  r2: 0,
  external: 0,
  lastErrors: [],
};

let imageLoadStats: ImageLoadStats = {
  total: 0,
  heroImages: 0,
  catalogImages: 0,
  averageLoadTime: 0,
  loadTimes: [],
  networkConditions: [],
  retryAttempts: 0,
};

function trackImageError(failedUrl: string, originalUrl: string | null | undefined, context: string): void {
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

  if (imageErrorStats.lastErrors.length > 10) {
    imageErrorStats.lastErrors.shift();
  }

  if (process.env.NODE_ENV !== "production") {
    console.warn("Image loading error details:", {
      failedUrl,
      originalUrl,
      context,
      timestamp: errorInfo.timestamp,
    });
  }

  if (
    process.env.NODE_ENV === "production" &&
    imageErrorStats.total % 10 === 0
  ) {
    reportImageErrorBatch();
  }
}

export function getImageErrorStats(): ImageErrorStats {
  return { ...imageErrorStats };
}

export function trackImageLoad(
  imageUrl: string,
  loadTime: number,
  context = "unknown",
  retryCount = 0,
): void {
  imageLoadStats.total++;
  imageLoadStats.retryAttempts += retryCount;

  if (context === "hero") {
    imageLoadStats.heroImages++;
  } else if (context === "catalog") {
    imageLoadStats.catalogImages++;
  }

  if (loadTime > 0) {
    imageLoadStats.loadTimes.push(loadTime);

    const MAX_LOAD_TIMES = 100;
    if (imageLoadStats.loadTimes.length > MAX_LOAD_TIMES) {
      const itemsToRemove = imageLoadStats.loadTimes.length - MAX_LOAD_TIMES;
      imageLoadStats.loadTimes.splice(0, itemsToRemove);
    }

    const sum = imageLoadStats.loadTimes.reduce((a, b) => a + b, 0);
    imageLoadStats.averageLoadTime = Math.round(
      sum / imageLoadStats.loadTimes.length,
    );
  }

  if (typeof navigator !== "undefined" && navigator.connection) {
    const networkInfo = {
      effectiveType: navigator.connection.effectiveType,
      downlink: navigator.connection.downlink,
      saveData: navigator.connection.saveData,
      timestamp: Date.now(),
    };

    imageLoadStats.networkConditions.push(networkInfo);

    const MAX_NETWORK_CONDITIONS = 50;
    if (imageLoadStats.networkConditions.length > MAX_NETWORK_CONDITIONS) {
      const itemsToRemove =
        imageLoadStats.networkConditions.length - MAX_NETWORK_CONDITIONS;
      imageLoadStats.networkConditions.splice(0, itemsToRemove);
    }
  }
}

export function getImageLoadStats(): ImageLoadStats & { errorStats: ImageErrorStats; memoryUsage: Record<string, number> } {
  return {
    ...imageLoadStats,
    errorStats: { ...imageErrorStats },
    memoryUsage: {
      loadTimesArraySize: imageLoadStats.loadTimes.length,
      networkConditionsArraySize: imageLoadStats.networkConditions.length,
      maxLoadTimes: 100,
      maxNetworkConditions: 50,
    },
  };
}

export function resetImageErrorStats(): void {
  imageErrorStats = {
    total: 0,
    r2: 0,
    external: 0,
    lastErrors: [],
  };
}

export function resetImageLoadStats(): void {
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

function reportImageErrorBatch(): void {
  if (typeof window === "undefined") return;

  if (process.env.NODE_ENV !== "production") {
    console.warn("Image loading error rate:", {
      total: imageErrorStats.total,
      r2Failures: imageErrorStats.r2,
      externalFailures: imageErrorStats.external,
      recentErrors: imageErrorStats.lastErrors.slice(-3),
    });
  }
}

export function getSmartObjectPosition(imageUrl: string | null | undefined, context = "card"): string {
  const positionStrategies: Record<string, string> = {
    card: "center 40%",
    hero: "center center",
    thumbnail: "center center",
  };

  return positionStrategies[context] || "center center";
}

export function getCatalogCardImageWithPosition(originalUrl: string | null | undefined): { src: string; position: string } {
  if (!originalUrl) {
    return { src: PLACEHOLDER_IMAGE, position: "center center" };
  }

  const src = getOptimizedImage(originalUrl, "catalog", {}, isSlowConnection());
  const position = getSmartObjectPosition(originalUrl, "card");

  return { src, position };
}

export function addCacheBusting(url: string | null | undefined, context = "navigation"): string {
  if (!url || typeof url !== "string") return url ?? "";

  try {
    const urlObj = new URL(url);
    urlObj.searchParams.set("cb", Date.now().toString());
    return urlObj.toString();
  } catch {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}cb=${Date.now()}`;
  }
}

export function getDetailHeroImageWithPosition(originalUrl: string | null | undefined, bustCache = false): { src: string; position: string } {
  if (!originalUrl) {
    return { src: PLACEHOLDER_IMAGE, position: "center center" };
  }

  const src = getUnifiedImageUrl(originalUrl, "hero", bustCache);
  const position = getSmartObjectPosition(originalUrl, "hero");

  if (
    typeof window !== "undefined" &&
    originalUrl &&
    process.env.NODE_ENV === "production"
  ) {
    if (!isSlowConnection()) {
      preloadImages([src], "hero");
    }
  }

  return { src, position };
}

export function preloadImages(imageUrls: string[], context = "card"): void {
  if (!Array.isArray(imageUrls)) return;

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

      const shouldBustCache = context === "hero";
      link.href = getUnifiedImageUrl(url, context, shouldBustCache);

      if (context === "hero") {
        link.setAttribute(
          "imagesizes",
          "(max-width: 768px) 100vw, (max-width: 1024px) 800px, 1200px",
        );
      }

      document.head.appendChild(link);
    } catch {
      if (process.env.NODE_ENV === "development") {
        // Development-only logging
      }
    }
  });
}

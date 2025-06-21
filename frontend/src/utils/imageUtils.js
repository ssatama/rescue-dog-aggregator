// frontend/src/utils/imageUtils.js

import { logger } from './logger';
import { getAdaptiveImageQuality, getAdaptiveImageDimensions, isSlowConnection } from './networkUtils';

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

// Enable Cloudinary now that we have upload flow
const USE_CLOUDINARY = true;

/**
 * Validate Cloudinary configuration on startup
 */
function validateCloudinaryConfig() {
  if (!CLOUDINARY_CLOUD_NAME) {
    if (process.env.NODE_ENV !== 'production') console.error('❌ NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is not configured!');
    return false;
  }
  
  // Validate cloud name format (should be alphanumeric with possible hyphens/underscores)
  if (!CLOUDINARY_CLOUD_NAME.match(/^[a-zA-Z0-9_-]+$/)) {
    if (process.env.NODE_ENV !== 'production') console.error('❌ Cloudinary cloud name contains invalid characters');
    return false;
  }
  
  // Validate minimum length
  if (CLOUDINARY_CLOUD_NAME.length < 3) {
    if (process.env.NODE_ENV !== 'production') console.warn('⚠️ Cloudinary cloud name seems unusually short');
  }
  
  return true;
}

// Run validation in development
if (process.env.NODE_ENV === 'development') {
  validateCloudinaryConfig();
}

const PLACEHOLDER_IMAGE = '/placeholder_dog.svg';

/**
 * Check if URL is from Cloudinary
 */
export function isCloudinaryUrl(url) {
  return !!(url && url.includes('res.cloudinary.com'));
}

/**
 * Get mobile-optimized image URL with network-aware quality
 * @param {string} url - Original image URL
 * @returns {string} Mobile-optimized image URL
 */
export function getMobileOptimizedImage(url) {
  if (!url || !isCloudinaryUrl(url)) {
    return url || PLACEHOLDER_IMAGE;
  }

  if (!USE_CLOUDINARY || !validateCloudinaryConfig()) {
    return url;
  }

  try {
    const quality = isSlowConnection() ? 'q_50' : 'q_70';
    const transformation = `w_320,h_240,c_fill,${quality},f_auto`;
    return url.replace('/upload/', `/upload/${transformation}/`);
  } catch (error) {
    logger.warn('Failed to create mobile optimized image URL', { url, error: error.message });
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
  
  // If it's already a Cloudinary URL, add home card transformations
  if (isCloudinaryUrl(originalUrl)) {
    return originalUrl.replace('/upload/', '/upload/w_400,h_300,c_fill,g_auto:subject,q_auto,f_auto/');
  }
  
  // If Cloudinary is disabled or not configured, use original
  if (!USE_CLOUDINARY || !CLOUDINARY_CLOUD_NAME) {
    return originalUrl;
  }
  
  // Fallback: use Cloudinary fetch
  try {
    const encodedUrl = encodeURIComponent(originalUrl);
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/fetch/w_400,h_300,c_fill,g_auto:subject,q_auto,f_auto/${encodedUrl}`;
  } catch (error) {
    return originalUrl;
  }
}

/**
 * Get optimized image URL for catalog grid cards with responsive breakpoints
 * Enhanced for mobile performance and retina displays
 */
export function getCatalogCardImage(originalUrl) {
  if (!originalUrl) {
    return PLACEHOLDER_IMAGE;
  }
  
  // Debug logging removed for production builds
  
  // If it's already a Cloudinary URL, add enhanced catalog card transformations
  if (isCloudinaryUrl(originalUrl)) {
    // Use fixed dimensions for 4:3 aspect ratio
    // The w_auto syntax doesn't work with this Cloudinary setup
    const transformed = originalUrl.replace('/upload/', '/upload/w_400,h_300,c_fill,g_auto,f_auto,q_auto/');
    // Debug logging removed for production builds
    return transformed;
  }
  
  // If Cloudinary is disabled or not configured, use original
  if (!USE_CLOUDINARY || !CLOUDINARY_CLOUD_NAME) {
    return originalUrl;
  }
  
  // Fallback: use Cloudinary fetch with fixed dimensions for 4:3 aspect ratio
  try {
    const encodedUrl = encodeURIComponent(originalUrl);
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/fetch/w_400,h_300,c_fill,g_auto,f_auto,q_auto/${encodedUrl}`;
  } catch (error) {
    return originalUrl;
  }
}

/**
 * Get optimized image URL for dog cards (square thumbnails) - LEGACY - use getCatalogCardImage for new implementations
 */
export function getDogThumbnail(originalUrl) {
  if (!originalUrl) {
    return PLACEHOLDER_IMAGE;
  }
  
  // If it's already a Cloudinary URL, add thumbnail transformations
  if (isCloudinaryUrl(originalUrl)) {
    // Use c_fill with g_auto for better face/subject detection instead of g_face
    return originalUrl.replace('/upload/', '/upload/w_300,h_300,c_fill,g_auto,q_auto,f_auto/');
  }
  
  // If Cloudinary is disabled or not configured, use original
  if (!USE_CLOUDINARY || !CLOUDINARY_CLOUD_NAME) {
    return originalUrl;
  }
  
  // Fallback: use Cloudinary fetch
  try {
    const encodedUrl = encodeURIComponent(originalUrl);
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/fetch/w_300,h_300,c_fill,g_auto,q_auto,f_auto/${encodedUrl}`;
  } catch (error) {
    return originalUrl;
  }
}

/**
 * Get optimized image URL for dog detail hero images with responsive breakpoints
 * Optimized for mobile-first loading with progressive enhancement
 */
export function getDetailHeroImage(originalUrl) {
  if (!originalUrl) {
    return PLACEHOLDER_IMAGE;
  }
  
  // If it's already a Cloudinary URL, add enhanced hero transformations
  if (isCloudinaryUrl(originalUrl)) {
    // Use optimized dimensions for hero images - reduced from 1200x675 for better loading
    // The responsive w_auto syntax doesn't work with this Cloudinary setup
    return originalUrl.replace('/upload/', '/upload/w_800,h_450,c_fill,g_auto,f_auto,q_auto/');
  }
  
  if (!USE_CLOUDINARY || !CLOUDINARY_CLOUD_NAME) {
    return originalUrl;
  }
  
  // Fallback: use Cloudinary fetch with responsive settings
  try {
    const encodedUrl = encodeURIComponent(originalUrl);
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/fetch/w_800,h_450,c_fill,g_auto:subject,f_auto,q_auto:good/${encodedUrl}`;
  } catch (error) {
    return originalUrl;
  }
}

/**
 * Get network-adaptive optimized image URL for dog detail hero images
 * Automatically adjusts dimensions and quality based on network conditions
 */
export function getDetailHeroImageAdaptive(originalUrl) {
  if (!originalUrl) {
    return PLACEHOLDER_IMAGE;
  }
  
  // Get adaptive parameters based on network conditions
  const adaptiveQuality = getAdaptiveImageQuality();
  const { width, height } = getAdaptiveImageDimensions('hero');
  
  // If it's already a Cloudinary URL, add network-adaptive hero transformations
  if (isCloudinaryUrl(originalUrl)) {
    const transformations = `w_${width},h_${height},c_fill,g_auto,f_auto,${adaptiveQuality}`;
    return originalUrl.replace('/upload/', `/upload/${transformations}/`);
  }
  
  if (!USE_CLOUDINARY || !CLOUDINARY_CLOUD_NAME) {
    return originalUrl;
  }
  
  // Fallback: use Cloudinary fetch with adaptive settings
  try {
    const encodedUrl = encodeURIComponent(originalUrl);
    const transformations = `w_${width},h_${height},c_fill,g_auto:subject,f_auto,${adaptiveQuality}`;
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/fetch/${transformations}/${encodedUrl}`;
  } catch (error) {
    return originalUrl;
  }
}

/**
 * Get optimized image URL for dog detail pages - LEGACY - use getDetailHeroImage for new implementations
 */
export function getDogDetailImage(originalUrl) {
  if (!originalUrl) {
    return PLACEHOLDER_IMAGE;
  }
  
  // If it's already a Cloudinary URL, add detail transformations
  if (isCloudinaryUrl(originalUrl)) {
    // Use c_fit instead of c_fill to maintain aspect ratio and show full image
    return originalUrl.replace('/upload/', '/upload/w_800,h_600,c_fit,q_auto,f_auto/');
  }
  
  if (!USE_CLOUDINARY || !CLOUDINARY_CLOUD_NAME) {
    return originalUrl;
  }
  
  // Fallback: use Cloudinary fetch
  try {
    const encodedUrl = encodeURIComponent(originalUrl);
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/fetch/w_800,h_600,c_fit,q_auto,f_auto/${encodedUrl}`;
  } catch (error) {
    return originalUrl;
  }
}

/**
 * Get optimized image URL for gallery thumbnails with performance optimization
 * Optimized for fast loading and bandwidth efficiency
 */
export function getThumbnailImage(originalUrl) {
  if (!originalUrl) {
    return PLACEHOLDER_IMAGE;
  }
  
  if (isCloudinaryUrl(originalUrl)) {
    // Square thumbnails with enhanced performance settings
    // Lower quality for thumbnails to improve loading speed
    return originalUrl.replace('/upload/', '/upload/w_200,h_200,c_fill,g_auto,f_auto,q_auto:low/');
  }
  
  if (!USE_CLOUDINARY || !CLOUDINARY_CLOUD_NAME) {
    return originalUrl;
  }
  
  try {
    const encodedUrl = encodeURIComponent(originalUrl);
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/fetch/w_200,h_200,c_fill,g_auto:subject,f_auto,q_auto:low/${encodedUrl}`;
  } catch (error) {
    return originalUrl;
  }
}

/**
 * Get image URL for smaller thumbnails (like in additional images) - LEGACY - use getThumbnailImage for new implementations
 */
export function getDogSmallThumbnail(originalUrl) {
  if (!originalUrl) {
    return PLACEHOLDER_IMAGE;
  }
  
  if (isCloudinaryUrl(originalUrl)) {
    // Small thumbnails with c_fit to avoid weird cropping
    return originalUrl.replace('/upload/', '/upload/w_150,h_150,c_fit,q_auto,f_auto/');
  }
  
  if (!USE_CLOUDINARY || !CLOUDINARY_CLOUD_NAME) {
    return originalUrl;
  }
  
  try {
    const encodedUrl = encodeURIComponent(originalUrl);
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/fetch/w_150,h_150,c_fit,q_auto,f_auto/${encodedUrl}`;
  } catch (error) {
    return originalUrl;
  }
}

/**
 * Enhanced error handling with monitoring and progressive fallback
 */
export function handleImageError(event, originalUrl, context = 'unknown') {
  const currentSrc = event.target.src;
  
  // Track image loading failures for monitoring
  trackImageError(currentSrc, originalUrl, context);
  
  // Progressive fallback strategy
  if (isCloudinaryUrl(currentSrc) && originalUrl && !isCloudinaryUrl(originalUrl)) {
    // Try original URL if Cloudinary transformation failed
    logger.warn('Cloudinary image failed, trying original:', originalUrl);
    event.target.src = originalUrl;
    event.target.onerror = (e) => handleImageError(e, originalUrl, `${context}-fallback`);
    return;
  }
  
  // If current URL contains transformations, try without transformations
  if (isCloudinaryUrl(currentSrc) && currentSrc.includes('/upload/') && currentSrc.split('/upload/').length > 1) {
    const parts = currentSrc.split('/upload/');
    if (parts[1].includes('/')) {
      // Remove transformation parameters
      const baseUrl = parts[0] + '/upload/';
      const imagePath = parts[1].split('/').slice(1).join('/');
      const simpleUrl = baseUrl + imagePath;
      
      if (simpleUrl !== currentSrc) {
        logger.warn('Trying image without transformations:', simpleUrl);
        event.target.src = simpleUrl;
        event.target.onerror = (e) => handleImageError(e, originalUrl, `${context}-notransform`);
        return;
      }
    }
  }
  
  // Final fallback to placeholder
  if (currentSrc !== PLACEHOLDER_IMAGE) {
    logger.error('All image loading attempts failed, using placeholder');
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
  cloudinary: 0,
  external: 0,
  lastErrors: []
};

let imageLoadStats = {
  total: 0,
  heroImages: 0,
  catalogImages: 0,
  averageLoadTime: 0,
  loadTimes: [],
  networkConditions: [],
  retryAttempts: 0
};

function trackImageError(failedUrl, originalUrl, context) {
  imageErrorStats.total++;
  
  if (isCloudinaryUrl(failedUrl)) {
    imageErrorStats.cloudinary++;
  } else {
    imageErrorStats.external++;
  }
  
  const errorInfo = {
    timestamp: new Date().toISOString(),
    failedUrl,
    originalUrl,
    context,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
  };
  
  imageErrorStats.lastErrors.push(errorInfo);
  
  // Keep only last 10 errors
  if (imageErrorStats.lastErrors.length > 10) {
    imageErrorStats.lastErrors.shift();
  }
  
  // Log error in development with more details
  if (process.env.NODE_ENV !== 'production') console.warn('Image loading error details:', {
    failedUrl,
    originalUrl,
    context,
    timestamp: errorInfo.timestamp
  });
  
  // In production, you might want to send this to an analytics service
  if (process.env.NODE_ENV === 'production' && imageErrorStats.total % 10 === 0) {
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
export function trackImageLoad(imageUrl, loadTime, context = 'unknown', retryCount = 0) {
  imageLoadStats.total++;
  imageLoadStats.retryAttempts += retryCount;
  
  // Track by context
  if (context === 'hero') {
    imageLoadStats.heroImages++;
  } else if (context === 'catalog') {
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
    imageLoadStats.averageLoadTime = Math.round(sum / imageLoadStats.loadTimes.length);
  }
  
  // Track network conditions
  if (typeof navigator !== 'undefined' && navigator.connection) {
    const networkInfo = {
      effectiveType: navigator.connection.effectiveType,
      downlink: navigator.connection.downlink,
      saveData: navigator.connection.saveData,
      timestamp: Date.now()
    };
    
    imageLoadStats.networkConditions.push(networkInfo);
    
    // Keep only last 50 network samples
    if (imageLoadStats.networkConditions.length > 50) {
      imageLoadStats.networkConditions.shift();
    }
  }
  
  // Development logging
  if (process.env.NODE_ENV === 'development') {
    // Development-only logging removed for production builds
  }
}

/**
 * Get image loading performance statistics
 */
export function getImageLoadStats() {
  return { 
    ...imageLoadStats,
    errorStats: { ...imageErrorStats }
  };
}

/**
 * Reset image error statistics
 */
export function resetImageErrorStats() {
  imageErrorStats = {
    total: 0,
    cloudinary: 0,
    external: 0,
    lastErrors: []
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
    retryAttempts: 0
  };
}

/**
 * Report image errors to monitoring service (placeholder for production)
 */
function reportImageErrorBatch() {
  if (typeof window === 'undefined') return;
  
  // In a real implementation, you would send this to your analytics/monitoring service
  // For now, just log aggregate stats in development only
  if (process.env.NODE_ENV !== 'production') console.warn('Image loading error rate:', {
    total: imageErrorStats.total,
    cloudinaryFailures: imageErrorStats.cloudinary,
    externalFailures: imageErrorStats.external,
    recentErrors: imageErrorStats.lastErrors.slice(-3)
  });
}

/**
 * Get smart object positioning based on image characteristics
 * @param {string} imageUrl - Image URL to analyze
 * @param {string} context - Context where image is used ('card', 'hero', 'thumbnail')
 * @returns {string} CSS object-position value
 */
export function getSmartObjectPosition(imageUrl, context = 'card') {
  // Default positioning strategies based on context
  const positionStrategies = {
    card: 'center 40%', // Focus on upper body/face for cards
    hero: 'center center', // Centered for hero images
    thumbnail: 'center center' // Centered for small thumbnails
  };
  
  // For now, return context-based positioning
  // Future enhancement: analyze image dimensions or add manual hints
  return positionStrategies[context] || 'center center';
}

/**
 * Enhanced card image with smart positioning for standing dogs - Updated for 4:3 ratio
 */
export function getCatalogCardImageWithPosition(originalUrl) {
  if (!originalUrl) {
    return { src: PLACEHOLDER_IMAGE, position: 'center center' };
  }
  
  // Enhanced transformation for catalog cards with proper 4:3 aspect ratio
  let src = '';
  
  // If it's already a Cloudinary URL, add enhanced catalog card transformations
  if (isCloudinaryUrl(originalUrl)) {
    // Use ar_4:3 aspect ratio with c_fill and g_auto for better catalog display
    src = originalUrl.replace('/upload/', '/upload/ar_4:3,c_fill,g_auto,f_auto,q_auto/');
  } else if (USE_CLOUDINARY && CLOUDINARY_CLOUD_NAME) {
    // Fallback: use Cloudinary fetch with ar_4:3 aspect ratio
    try {
      const encodedUrl = encodeURIComponent(originalUrl);
      src = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/fetch/ar_4:3,c_fill,g_auto,f_auto,q_auto/${encodedUrl}`;
    } catch (error) {
      src = originalUrl;
    }
  } else {
    src = originalUrl;
  }
  
  const position = getSmartObjectPosition(originalUrl, 'card');
  
  return { src, position };
}

/**
 * Add cache-busting parameter to image URL for fresh navigation
 */
export function addCacheBusting(url, context = 'navigation') {
  if (!url || typeof url !== 'string') return url;
  
  try {
    const urlObj = new URL(url);
    // Use a timestamp for cache busting
    urlObj.searchParams.set('cb', Date.now().toString());
    return urlObj.toString();
  } catch {
    // If URL parsing fails, use simpler approach
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}cb=${Date.now()}`;
  }
}

/**
 * Enhanced hero image with smart positioning and preloading
 * Optimized for Core Web Vitals (LCP) performance with network adaptivity
 */
export function getDetailHeroImageWithPosition(originalUrl, bustCache = false) {
  if (!originalUrl) {
    return { src: PLACEHOLDER_IMAGE, position: 'center center' };
  }
  
  // Use adaptive image generation for better network performance
  let src = getDetailHeroImageAdaptive(originalUrl);
  const position = getSmartObjectPosition(originalUrl, 'hero');
  
  // Add cache-busting for navigation if requested
  if (bustCache) {
    src = addCacheBusting(src, 'hero');
  }
  
  // Preload hero image for better LCP scores only on fast connections
  if (typeof window !== 'undefined' && originalUrl && process.env.NODE_ENV === 'production') {
    // Only preload on fast connections to avoid wasting bandwidth
    if (!isSlowConnection()) {
      preloadImages([src], 'hero');
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
export function preloadImages(imageUrls, context = 'card') {
  if (!Array.isArray(imageUrls)) return;
  
  // Limit concurrent preloads on mobile for memory optimization
  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;
  const maxPreload = isMobile ? Math.min(imageUrls.length, 5) : imageUrls.length;
  
  imageUrls.slice(0, maxPreload).forEach(url => {
    if (!url || typeof url !== 'string') return;
    
    try {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      
      // Choose appropriate optimization based on context and device
      switch (context) {
        case 'hero':
          link.href = getDetailHeroImage(url);
          break;
        case 'thumbnail':
          link.href = getThumbnailImage(url);
          break;
        default:
          link.href = isMobile ? getMobileOptimizedImage(url) : getCatalogCardImage(url);
      }
      
      // Add responsive image attributes for better performance
      if (context === 'hero') {
        link.setAttribute('imagesizes', '(max-width: 768px) 100vw, (max-width: 1024px) 800px, 1200px');
      }
      
      document.head.appendChild(link);
    } catch (error) {
      // Silently handle preload errors in production
      if (process.env.NODE_ENV === 'development') {
        // Development-only logging
      }
    }
  });
}
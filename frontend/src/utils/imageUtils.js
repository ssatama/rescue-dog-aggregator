// frontend/src/utils/imageUtils.js

import { logger } from './logger';

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

// Enable Cloudinary now that we have upload flow
const USE_CLOUDINARY = true;

const PLACEHOLDER_IMAGE = '/placeholder_dog.svg';

/**
 * Check if URL is from Cloudinary
 */
function isCloudinaryUrl(url) {
  return url && url.includes('res.cloudinary.com');
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
 * Get optimized image URL for catalog grid cards (4:3 aspect ratio)
 */
export function getCatalogCardImage(originalUrl) {
  if (!originalUrl) {
    return PLACEHOLDER_IMAGE;
  }
  
  // If it's already a Cloudinary URL, add catalog card transformations
  if (isCloudinaryUrl(originalUrl)) {
    return originalUrl.replace('/upload/', '/upload/w_320,h_240,c_fill,g_auto:subject,q_auto,f_auto/');
  }
  
  // If Cloudinary is disabled or not configured, use original
  if (!USE_CLOUDINARY || !CLOUDINARY_CLOUD_NAME) {
    return originalUrl;
  }
  
  // Fallback: use Cloudinary fetch
  try {
    const encodedUrl = encodeURIComponent(originalUrl);
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/fetch/w_320,h_240,c_fill,g_auto:subject,q_auto,f_auto/${encodedUrl}`;
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
 * Get optimized image URL for dog detail hero images (16:9 aspect ratio with background fill)
 */
export function getDetailHeroImage(originalUrl) {
  if (!originalUrl) {
    return PLACEHOLDER_IMAGE;
  }
  
  // If it's already a Cloudinary URL, add hero transformations
  if (isCloudinaryUrl(originalUrl)) {
    // Use c_pad with b_auto:predominant for background fill in 16:9 aspect ratio
    return originalUrl.replace('/upload/', '/upload/w_800,h_450,c_pad,b_auto:predominant,q_auto,f_auto/');
  }
  
  if (!USE_CLOUDINARY || !CLOUDINARY_CLOUD_NAME) {
    return originalUrl;
  }
  
  // Fallback: use Cloudinary fetch
  try {
    const encodedUrl = encodeURIComponent(originalUrl);
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/fetch/w_800,h_450,c_pad,b_auto:predominant,q_auto,f_auto/${encodedUrl}`;
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
 * Get optimized image URL for gallery thumbnails (1:1 square aspect ratio)
 */
export function getThumbnailImage(originalUrl) {
  if (!originalUrl) {
    return PLACEHOLDER_IMAGE;
  }
  
  if (isCloudinaryUrl(originalUrl)) {
    // Square thumbnails with smart cropping for galleries
    return originalUrl.replace('/upload/', '/upload/w_150,h_150,c_fill,g_auto:subject,q_auto,f_auto/');
  }
  
  if (!USE_CLOUDINARY || !CLOUDINARY_CLOUD_NAME) {
    return originalUrl;
  }
  
  try {
    const encodedUrl = encodeURIComponent(originalUrl);
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/fetch/w_150,h_150,c_fill,g_auto:subject,q_auto,f_auto/${encodedUrl}`;
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
 * Enhanced error handling with original URL fallback
 */
export function handleImageError(event, originalUrl) {
  const currentSrc = event.target.src;
  
  // If current source is Cloudinary and we have original URL, try original
  if (isCloudinaryUrl(currentSrc) && originalUrl && !isCloudinaryUrl(originalUrl)) {
    logger.warn('Cloudinary image failed, trying original:', originalUrl);
    event.target.src = originalUrl;
    return;
  }
  
  // If we've tried original or don't have it, use placeholder
  if (currentSrc !== PLACEHOLDER_IMAGE) {
    event.target.src = PLACEHOLDER_IMAGE;
  }
  
  // Prevent infinite error loops
  event.target.onerror = null;
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
 * Enhanced card image with smart positioning for standing dogs
 */
export function getCatalogCardImageWithPosition(originalUrl) {
  if (!originalUrl) {
    return { src: PLACEHOLDER_IMAGE, position: 'center center' };
  }
  
  const src = getCatalogCardImage(originalUrl);
  const position = getSmartObjectPosition(originalUrl, 'card');
  
  return { src, position };
}

/**
 * Enhanced hero image with smart positioning
 */
export function getDetailHeroImageWithPosition(originalUrl) {
  if (!originalUrl) {
    return { src: PLACEHOLDER_IMAGE, position: 'center center' };
  }
  
  const src = getDetailHeroImage(originalUrl);
  const position = getSmartObjectPosition(originalUrl, 'hero');
  
  return { src, position };
}

/**
 * Preload critical images to improve perceived performance
 * @param {Array<string>} imageUrls - Array of image URLs to preload
 */
export function preloadImages(imageUrls) {
  imageUrls.forEach(url => {
    if (!url) return;
    
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = getCatalogCardImage(url); // Use new catalog card image
    document.head.appendChild(link);
  });
}
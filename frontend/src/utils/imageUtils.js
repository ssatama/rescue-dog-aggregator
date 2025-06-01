// frontend/src/utils/imageUtils.js

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

// Temporary: disable Cloudinary until we implement upload flow
const USE_CLOUDINARY = false;

console.log('🔍 DEBUG: CLOUDINARY_CLOUD_NAME =', CLOUDINARY_CLOUD_NAME);

const PLACEHOLDER_IMAGE = '/placeholder-dog.svg';

/**
 * Generate Cloudinary transformation URL for an image
 * @param {string} originalUrl - Original image URL
 * @param {Object} options - Transformation options
 * @returns {string} Transformed image URL or fallback
 */
export function getCloudinaryUrl(originalUrl, options = {}) {
  // Return placeholder if no URL provided
  if (!originalUrl) {
    return PLACEHOLDER_IMAGE;
  }

  // Return original URL if Cloudinary not configured
  if (!CLOUDINARY_CLOUD_NAME) {
    console.warn('Cloudinary not configured, using original image URL');
    return originalUrl;
  }

  // Default transformation options
  const defaultOptions = {
    width: 300,
    height: 300,
    crop: 'fill',
    quality: 'auto',
    format: 'auto',
    gravity: 'face', // Focus on faces (great for dog portraits)
  };

  const transformOptions = { ...defaultOptions, ...options };

  // Build transformation string
  const transformations = Object.entries(transformOptions)
    .map(([key, value]) => {
      // Map common options to Cloudinary parameters
      const paramMap = {
        width: 'w',
        height: 'h',
        crop: 'c',
        quality: 'q',
        format: 'f',
        gravity: 'g',
      };
      const param = paramMap[key] || key;
      return `${param}_${value}`;
    })
    .join(',');

  // Generate Cloudinary fetch URL
  const cloudinaryUrl = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/fetch/${transformations}/${encodeURIComponent(originalUrl)}`;

  return cloudinaryUrl;
}

/**
 * Get optimized image URL for dog cards (square thumbnails)
 * @param {string} originalUrl - Original image URL
 * @returns {string} Optimized thumbnail URL
 */
export function getDogThumbnail(originalUrl) {
  if (!originalUrl) {
    return PLACEHOLDER_IMAGE;
  }
  
  if (!USE_CLOUDINARY || !CLOUDINARY_CLOUD_NAME) {
    return originalUrl; // Use original for now
  }
  
  // Cloudinary code (disabled)
  try {
    const encodedUrl = encodeURIComponent(originalUrl);
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/fetch/w_300,h_300,c_fill,q_auto,f_auto,g_face/${encodedUrl}`;
  } catch (error) {
    return originalUrl;
  }
}

/**
 * Get optimized image URL for dog detail pages (preserve aspect ratio)
 * @param {string} originalUrl - Original image URL
 * @returns {string} Optimized detail image URL
 */
export function getDogDetailImage(originalUrl) {
  if (!originalUrl) {
    return PLACEHOLDER_IMAGE;
  }
  
  if (!USE_CLOUDINARY || !CLOUDINARY_CLOUD_NAME) {
    return originalUrl; // Use original for now
  }
  
  // Cloudinary code (disabled)
  try {
    const encodedUrl = encodeURIComponent(originalUrl);
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/fetch/w_800,h_600,c_fit,q_auto,f_auto/${encodedUrl}`;
  } catch (error) {
    return originalUrl;
  }
}

/**
 * Handle image loading errors with fallback
 * @param {Event} event - Image error event
 * @param {string} originalUrl - Original image URL to try as fallback
 */
export function handleImageError(event, originalUrl) {
  if (event.target.src !== originalUrl && originalUrl) {
    event.target.src = originalUrl;
  } else {
    event.target.src = PLACEHOLDER_IMAGE;
  }
  
  event.target.onerror = (e) => {
    e.target.src = PLACEHOLDER_IMAGE;
    e.target.onerror = null;
  };
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
    link.href = getDogThumbnail(url);
    document.head.appendChild(link);
  });
}
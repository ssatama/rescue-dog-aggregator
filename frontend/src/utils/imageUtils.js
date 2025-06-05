// frontend/src/utils/imageUtils.js

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
 * Get optimized image URL for dog cards (square thumbnails)
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
 * Get optimized image URL for dog detail pages
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
 * Get image URL for smaller thumbnails (like in additional images)
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
    console.warn('Cloudinary image failed, trying original:', originalUrl);
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
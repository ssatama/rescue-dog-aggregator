import { type Dog, type DogImage } from "../types/dog";

/**
 * Gets the main image URL from a dog object, handling all possible field names
 */
export function getMainImage(dog: Dog): string | undefined {
  return (
    dog.primary_image_url ||
    dog.main_image ||
    (dog.photos && dog.photos.length > 0 ? dog.photos[0] : undefined)
  );
}

/**
 * The dog's photo gallery, hero first (#488). The API already falls back to
 * the hero, but a dog cached before galleries existed has no `images`.
 */
export function getGallery(dog: Dog): DogImage[] {
  if (dog.images && dog.images.length > 0) return dog.images;
  const hero = getMainImage(dog);
  return hero ? [{ url: hero }] : [];
}

/**
 * Gets all images from a dog object, including main and additional images
 */
export function getAllImages(dog: Dog): string[] {
  const mainImage = getMainImage(dog);
  const additionalImages = dog.photos || [];

  // Combine and filter out duplicates and undefined values
  const allImages = [mainImage, ...additionalImages].filter(
    (img): img is string => Boolean(img),
  );

  // Remove duplicates
  return Array.from(new Set(allImages));
}

/**
 * Safely converts a dog ID to a number, handling both string and number types
 */
export function safeToNumber(id: string | number | undefined): number | null {
  if (id === undefined || id === null) {
    return null;
  }

  const num = typeof id === "string" ? parseInt(id, 10) : id;

  if (isNaN(num)) {
    return null;
  }

  return num;
}

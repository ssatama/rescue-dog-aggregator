import axios from "axios";
import { IMAGE_BASE_URL, IMAGE_TRANSFORMS } from "../constants.js";
import { cacheService } from "./cache-service.js";
import type { ImagePreset } from "../types.js";

const IMAGE_TIMEOUT = 5000; // 5 seconds

export interface ImageContent {
  type: "image";
  data: string;
  mimeType: "image/jpeg";
}

function buildTransformUrl(
  originalUrl: string,
  preset: ImagePreset
): string | null {
  if (!originalUrl) return null;

  // Extract image path from URL
  // Expected format: https://images.rescuedogs.me/path/to/image.jpg
  // Transform to: https://images.rescuedogs.me/cdn-cgi/image/{transforms}/path/to/image.jpg

  try {
    const url = new URL(originalUrl);

    // Only transform images from our CDN
    if (!url.hostname.includes("rescuedogs.me")) {
      return originalUrl; // Return original for external images
    }

    const imagePath = url.pathname;
    const transforms = IMAGE_TRANSFORMS[preset];

    return `${IMAGE_BASE_URL}/cdn-cgi/image/${transforms}${imagePath}`;
  } catch {
    return originalUrl;
  }
}

export async function fetchDogImage(
  imageUrl: string | null | undefined,
  preset: ImagePreset = "thumbnail"
): Promise<ImageContent | null> {
  if (!imageUrl) return null;

  const cacheKey = `${imageUrl}:${preset}`;

  // Check cache first
  const cached = cacheService.getImage(cacheKey);
  if (cached) {
    return {
      type: "image",
      data: cached,
      mimeType: "image/jpeg",
    };
  }

  const transformedUrl = buildTransformUrl(imageUrl, preset);
  if (!transformedUrl) return null;

  try {
    const response = await axios.get(transformedUrl, {
      responseType: "arraybuffer",
      timeout: IMAGE_TIMEOUT,
      headers: {
        Accept: "image/jpeg,image/png,image/*",
      },
    });

    const base64 = Buffer.from(response.data).toString("base64");

    // Cache the result
    cacheService.setImage(cacheKey, base64);

    return {
      type: "image",
      data: base64,
      mimeType: "image/jpeg",
    };
  } catch (error) {
    // Graceful degradation - just return null if image fetch fails
    console.error(`Failed to fetch image: ${transformedUrl}`, error);
    return null;
  }
}

export async function fetchDogImages(
  imageUrls: (string | null | undefined)[],
  preset: ImagePreset = "thumbnail"
): Promise<(ImageContent | null)[]> {
  // Use Promise.all for parallel fetching
  return Promise.all(imageUrls.map((url) => fetchDogImage(url, preset)));
}

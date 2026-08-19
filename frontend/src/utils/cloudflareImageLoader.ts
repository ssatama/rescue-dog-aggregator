import { extractOriginalPath, isR2Url } from "./imageUtils";

/**
 * next/image loader that resizes via Cloudflare instead of Vercel.
 *
 * Dog images are served from images.rescuedogs.me, a Cloudflare zone with
 * Image Resizing enabled, so /cdn-cgi/image/ already does everything
 * Vercel's metered optimizer would do. Routing R2 images there takes Vercel
 * image transformations to ~zero and keeps the bytes off Vercel entirely.
 *
 * Anything not on R2 — local assets, flag icons, third-party hosts — is
 * returned untouched, so it is served as-is rather than through /_next/image.
 */

const R2_CUSTOM_DOMAIN =
  process.env.NEXT_PUBLIC_R2_CUSTOM_DOMAIN || "images.rescuedogs.me";

const DEFAULT_QUALITY = 75;

interface ImageLoaderParams {
  src: string;
  width: number;
  quality?: number;
}

export default function cloudflareImageLoader({
  src,
  width,
  quality,
}: ImageLoaderParams): string {
  if (!src || !isR2Url(src)) {
    return src;
  }

  // Strip any transform the caller already applied so widths don't stack.
  const original = extractOriginalPath(src);
  const imagePath = original.replace(`https://${R2_CUSTOM_DOMAIN}/`, "");

  // format=auto is required: this zone ignores explicit format=webp/avif and
  // only negotiates from the Accept header when auto is used.
  const transforms = `width=${width},quality=${quality ?? DEFAULT_QUALITY},format=auto`;

  return `https://${R2_CUSTOM_DOMAIN}/cdn-cgi/image/${transforms}/${imagePath}`;
}

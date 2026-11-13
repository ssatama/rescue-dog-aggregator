import { extractOriginalPath, isR2Url } from "./imageUtils";

/**
 * next/image loader that serves pre-generated WebP variants from R2 (#761).
 *
 * Every image on images.rescuedogs.me has 320/640/1200px WebP copies next
 * to it (`<key>_w<width>.webp`, written by utils/image_variants.py at upload
 * and by management/backfill_image_variants.py). Serving those fixed files
 * costs nothing, unlike Cloudflare's /cdn-cgi/image/ (billed per unique
 * transformation) or Vercel's optimizer (metered).
 *
 * The widths and key format must match utils/image_variants.py.
 * Anything not on R2 is returned untouched.
 */

export const VARIANT_WIDTHS = [320, 640, 1200] as const;

interface ImageLoaderParams {
  src: string;
  width: number;
  quality?: number;
}

export function nearestVariantWidth(requested: number): number {
  return VARIANT_WIDTHS.find((w) => w >= requested) ?? VARIANT_WIDTHS[VARIANT_WIDTHS.length - 1];
}

/** https://images.rescuedogs.me/a/rex_1.jpg -> https://images.rescuedogs.me/a/rex_1_w640.webp */
export function r2VariantUrl(src: string, width: number): string {
  if (!src || !isR2Url(src)) return src;
  const original = extractOriginalPath(src).split(/[?#]/)[0];
  const slash = original.lastIndexOf("/");
  const dot = original.lastIndexOf(".");
  const base = dot > slash ? original.slice(0, dot) : original;
  return `${base}_w${nearestVariantWidth(width)}.webp`;
}

export default function r2ImageLoader({ src, width }: ImageLoaderParams): string {
  return r2VariantUrl(src, width);
}

/**
 * @fileoverview Centralized Image Configuration Constants
 *
 * This module provides centralized configuration for image domains and CDN settings
 * used throughout the rescue dog aggregator frontend. It handles:
 * - R2 custom domain configuration with environment variable fallback
 * - Immutable domain constants for consistent usage
 * - Type-safe exports for TypeScript integration
 *
 * Environment Variables:
 * - NEXT_PUBLIC_R2_CUSTOM_DOMAIN: Custom R2 domain (defaults to images.rescuedogs.me)
 *
 * @author Claude Code
 * @version 1.0.0
 * @since 1.0.0
 */

/**
 * R2 Custom Domain - Primary domain for image serving
 * Uses environment variable with fallback to production domain
 */
export const R2_CUSTOM_DOMAIN =
  process.env.NEXT_PUBLIC_R2_CUSTOM_DOMAIN || "images.rescuedogs.me";

/**
 * Centralized image domain configuration
 * Provides consistent domain references across the application
 */
export const IMAGE_DOMAINS = {
  R2_CUSTOM: R2_CUSTOM_DOMAIN,
} as const;

/**
 * Image CDN configuration constants
 */
export const IMAGE_CONFIG = {
  PLACEHOLDER_IMAGE: "/placeholder_dog.svg",
  CDN_PATH_PREFIX: "/cdn-cgi/image/",
  TRANSFORMATION_QUALITY: {
    LOW: 20,
    MEDIUM: 60,
    HIGH: 80,
    AUTO: "auto" as const,
  },
} as const;

/**
 * Helper function to check if URL is from R2 custom domain
 * @param url - URL to check
 * @returns True if URL is from R2 custom domain
 */
export function isR2Domain(url: string): boolean {
  return !!(url && url.includes(R2_CUSTOM_DOMAIN));
}

/**
 * Type definitions for image configuration
 */
export type ImageDomain = (typeof IMAGE_DOMAINS)[keyof typeof IMAGE_DOMAINS];
export type TransformationQuality =
  (typeof IMAGE_CONFIG.TRANSFORMATION_QUALITY)[keyof typeof IMAGE_CONFIG.TRANSFORMATION_QUALITY];

import React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonPulseProps {
  /** Additional CSS classes to apply */
  className?: string;
  /** Whether this is a standalone skeleton (adds ARIA attributes) */
  standalone?: boolean;
  /** Intensity of the shimmer animation */
  intensity?: "subtle" | "normal";
  /** Additional props forwarded to the div element */
  [key: string]: any;
}

/**
 * SkeletonPulse - Base skeleton loading component with consistent shimmer animation
 *
 * Provides a standardized skeleton element that can be used for any loading placeholder.
 * Uses the .skeleton-element class for improved shimmer animation and supports intensity
 * variations. Maintains accessibility standards and backward compatibility.
 */
const SkeletonPulse = React.memo<SkeletonPulseProps>(function SkeletonPulse({
  className = "",
  standalone = true,
  intensity = "normal",
  ...props
}) {
  const ariaProps = standalone
    ? {
        role: "status",
        "aria-label": "Loading content",
        "aria-busy": true,
      }
    : {};

  const intensityClass = intensity === "subtle" ? "skeleton-subtle" : "";

  return (
    <div
      {...ariaProps}
      className={cn("skeleton-element rounded", intensityClass, className)}
      {...props}
    />
  );
});

SkeletonPulse.displayName = "SkeletonPulse";

export default SkeletonPulse;

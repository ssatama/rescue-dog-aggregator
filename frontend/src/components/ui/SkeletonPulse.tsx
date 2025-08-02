import React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonPulseProps {
  /** Additional CSS classes to apply */
  className?: string;
  /** Whether this is a standalone skeleton (adds ARIA attributes) */
  standalone?: boolean;
  /** Additional props forwarded to the div element */
  [key: string]: any;
}

/**
 * SkeletonPulse - Base skeleton loading component with consistent orange-tinted shimmer
 *
 * Provides a standardized skeleton element that can be used for any loading placeholder.
 * Uses the existing .skeleton class for orange-tinted shimmer animation and maintains
 * accessibility standards.
 */
const SkeletonPulse = React.memo<SkeletonPulseProps>(function SkeletonPulse({
  className = "",
  standalone = true,
  ...props
}) {
  const ariaProps = standalone
    ? {
        role: "status",
        "aria-label": "Loading content",
        "aria-busy": true,
      }
    : {};

  return (
    <div
      {...ariaProps}
      className={cn("bg-muted animate-pulse rounded", className)}
      {...props}
    />
  );
});

SkeletonPulse.displayName = "SkeletonPulse";

export default SkeletonPulse;

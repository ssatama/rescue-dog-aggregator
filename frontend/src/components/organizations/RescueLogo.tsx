import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { IMAGE_SIZES } from "@/constants/imageSizes";

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

/** A rescue's logo, or its initials when it has none (#501). */
export default function RescueLogo({
  name,
  logoUrl,
  className,
  priority = false,
}: {
  name: string;
  logoUrl?: string | null;
  /** Sets the size, e.g. "h-12 w-12" */
  className?: string;
  priority?: boolean;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-surface",
        className,
      )}
    >
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt={`${name} logo`}
          fill
          sizes={IMAGE_SIZES.ORG_LOGO}
          priority={priority}
          className="object-contain p-1"
        />
      ) : (
        <span className="font-display font-bold text-orange-600 dark:text-orange-400" aria-hidden="true">
          {initials(name)}
        </span>
      )}
    </div>
  );
}

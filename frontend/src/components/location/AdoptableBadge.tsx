"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { useVisitorLocation } from "@/lib/visitorLocation";
import { isAdoptableTo } from "@/utils/adoptability";
import { getCountryName } from "@/utils/countryNames";
import type { Dog } from "@/types/dog";

/** "Adoptable to you" when the dog's rescue adopts out to where the visitor
 * lives (#493). Says nothing otherwise: never a "not adoptable" mark. */
export default function AdoptableBadge({
  dog,
  className,
}: {
  dog: Pick<Dog, "organization">;
  className?: string;
}): React.JSX.Element | null {
  const { country } = useVisitorLocation();
  if (!isAdoptableTo(dog, country)) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-good-soft px-2 py-0.5 text-xs font-semibold text-good",
        className,
      )}
    >
      <span aria-hidden="true">✓</span> Adoptable to you
      <span className="sr-only"> in {getCountryName(country)}</span>
    </span>
  );
}

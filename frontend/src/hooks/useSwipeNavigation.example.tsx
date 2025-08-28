/**
 * Example usage of useSwipeNavigation hook
 *
 * This demonstrates how to integrate swipe navigation into a dog detail page
 */

import React from "react";
import Image from "next/image";
import { useSwipeNavigation } from "./useSwipeNavigation";

interface DogDetailWithNavigationProps {
  dogSlug: string;
  searchParams?: Record<string, string>;
}

export function DogDetailWithNavigation({
  dogSlug,
  searchParams = {},
}: DogDetailWithNavigationProps) {
  const { handlers, prevDog, nextDog, isLoading } = useSwipeNavigation({
    currentDogSlug: dogSlug,
    searchParams,
  });

  if (isLoading) {
    return <div>Loading navigation...</div>;
  }

  return (
    <div
      {...handlers} // Enables swipe navigation
      className="dog-detail-container"
      tabIndex={0} // Enables keyboard focus for arrow key navigation
    >
      {/* Navigation indicators */}
      <div className="navigation-indicators">
        {prevDog && (
          <div className="prev-indicator">← Previous: {prevDog.name}</div>
        )}

        {nextDog && (
          <div className="next-indicator">Next: {nextDog.name} →</div>
        )}
      </div>

      {/* Main dog content */}
      <div className="dog-content">
        <h1>Current Dog: {dogSlug}</h1>
        <p>Swipe left/right or use arrow keys to navigate</p>

        {/* Show preloaded adjacent dogs */}
        <div className="adjacent-dogs">
          {prevDog && (
            <div className="adjacent-dog prev">
              <Image
                src={prevDog.primary_image_url || "/placeholder-dog.jpg"}
                alt={prevDog.name}
                width={100}
                height={100}
                className="object-cover"
              />
              <span>{prevDog.name}</span>
            </div>
          )}

          {nextDog && (
            <div className="adjacent-dog next">
              <Image
                src={nextDog.primary_image_url || "/placeholder-dog.jpg"}
                alt={nextDog.name}
                width={100}
                height={100}
                className="object-cover"
              />
              <span>{nextDog.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Manual navigation buttons (optional) */}
      <div className="manual-navigation">
        <button
          onClick={() =>
            prevDog && window.history.pushState({}, "", `/dogs/${prevDog.slug}`)
          }
          disabled={!prevDog}
          className="nav-button prev"
        >
          ← Previous
        </button>

        <button
          onClick={() =>
            nextDog && window.history.pushState({}, "", `/dogs/${nextDog.slug}`)
          }
          disabled={!nextDog}
          className="nav-button next"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

// Example with search parameters preserved
export function DogDetailWithFilters({
  dogSlug,
  breed,
  size,
}: {
  dogSlug: string;
  breed?: string;
  size?: string;
}) {
  const searchParams = React.useMemo(
    () => ({
      ...(breed && { breed }),
      ...(size && { size }),
    }),
    [breed, size],
  );

  const navigation = useSwipeNavigation({
    currentDogSlug: dogSlug,
    searchParams,
  });

  // Navigation will preserve the breed and size filters
  return (
    <DogDetailWithNavigation dogSlug={dogSlug} searchParams={searchParams} />
  );
}

// TypeScript usage with proper typing
interface Dog {
  id: number;
  slug: string;
  name: string;
  primary_image_url?: string;
  breed?: string;
  [key: string]: any;
}

export function TypedDogNavigation({ dogSlug }: { dogSlug: string }) {
  const { handlers, prevDog, nextDog, isLoading } = useSwipeNavigation({
    currentDogSlug: dogSlug,
    searchParams: {},
  });

  // TypeScript knows that prevDog and nextDog are Dog | null
  const prevDogName: string | null = prevDog?.name || null;
  const nextDogName: string | null = nextDog?.name || null;

  return (
    <div {...handlers}>
      {/* Fully typed component */}
      <p>Previous: {prevDogName || "None"}</p>
      <p>Next: {nextDogName || "None"}</p>
    </div>
  );
}

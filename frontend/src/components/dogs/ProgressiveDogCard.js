/**
 * Progressive loading wrapper for DogCard
 * Implements lazy loading with skeleton placeholder
 */
import React, { useState, useEffect, useMemo } from "react";
import DogCard from "./DogCard";
import DogCardSkeleton from "../ui/DogCardSkeleton";
import useProgressiveLoading from "../../hooks/useProgressiveLoading";

export default function ProgressiveDogCard({
  dog,
  index = 0,
  priority = false,
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  // Check for reduced motion preference
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // Calculate stagger delay based on index
  const staggerDelay = priority || prefersReducedMotion ? 0 : index * 50;

  const { ref, isVisible, isLoaded } = useProgressiveLoading({
    rootMargin: "100px", // Start loading 100px before viewport
    loadDelay: staggerDelay,
    threshold: 0.01,
  });

  // Priority cards load immediately
  const shouldRender = priority || prefersReducedMotion || isLoaded;

  // Handle image loading
  useEffect(() => {
    if (shouldRender && dog?.images?.[0]?.url) {
      const img = new Image();

      img.onload = () => {
        setImageLoaded(true);
      };

      img.onerror = () => {
        setImageFailed(true);
        setImageLoaded(true); // Still mark as loaded to show fallback
      };

      img.loading = "lazy";
      img.src = dog.images[0].url;
    }
  }, [shouldRender, dog]);

  // Priority cards don't use observer
  if (priority || prefersReducedMotion) {
    return (
      <div className="progressive-dog-card">
        <DogCard
          dog={dog}
          imageProps={{
            loading: "eager",
            "data-placeholder": !imageLoaded,
            "data-fallback": imageFailed,
          }}
        />
      </div>
    );
  }

  return (
    <div ref={ref} className="progressive-dog-card">
      {!shouldRender ? (
        <DogCardSkeleton />
      ) : (
        <DogCard
          dog={dog}
          imageProps={{
            loading: "lazy",
            "data-placeholder": !imageLoaded,
            "data-fallback": imageFailed,
          }}
        />
      )}
    </div>
  );
}

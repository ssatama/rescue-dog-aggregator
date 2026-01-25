"use client";

import React, { useState, useCallback, memo } from "react";
import { Heart } from "lucide-react";
import { useFavorites } from "../../hooks/useFavorites";
import { trackFavoriteToggle } from "@/lib/monitoring/breadcrumbs";

interface FavoriteButtonProps {
  dogId: number;
  dogName?: string;
  className?: string;
  compact?: boolean;
  orgSlug?: string;
}

export const FavoriteButton = memo(
  function FavoriteButton({
    dogId,
    dogName,
    className = "",
    compact = false,
    orgSlug,
  }: FavoriteButtonProps) {
  const { isFavorited, toggleFavorite } = useFavorites();
  const [isLoading, setIsLoading] = useState(false);

  const isFav = isFavorited(dogId);

  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      setIsLoading(true);
      try {
        const wasFavorited = isFav;
        await toggleFavorite(dogId, dogName);

        // Track favorite toggle
        if (dogName && orgSlug) {
          try {
            const action = wasFavorited ? "remove" : "add";
            trackFavoriteToggle(action, dogId.toString(), dogName, orgSlug);
          } catch (error) {
            console.error("Failed to track favorite toggle:", error);
          }
        }
      } finally {
        setIsLoading(false);
      }
    },
    [dogId, dogName, toggleFavorite, isFav, orgSlug],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();

        const wasFavorited = isFav;
        toggleFavorite(dogId, dogName);

        // Track favorite toggle for keyboard interaction
        if (dogName && orgSlug) {
          try {
            const action = wasFavorited ? "remove" : "add";
            trackFavoriteToggle(action, dogId.toString(), dogName, orgSlug);
          } catch (error) {
            console.error("Failed to track favorite toggle:", error);
          }
        }
      }
    },
    [dogId, dogName, toggleFavorite, isFav, orgSlug],
  );

  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={isLoading}
      aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={isFav}
      className={`
        inline-flex items-center justify-center
        ${compact ? "p-2" : "p-3"} rounded-full
        transition-all duration-200 ease-in-out
        hover:scale-110 active:scale-95
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        ${isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        ${isFav ? "text-red-500 hover:text-red-600" : "text-gray-400 hover:text-red-500"}
        ${className}
      `}
      style={{
        minWidth: compact ? "36px" : "44px",
        minHeight: compact ? "36px" : "44px",
      }}
    >
      <Heart
        size={20}
        fill={isFav ? "currentColor" : "none"}
        className="transition-colors duration-200"
      />
    </button>
  );
  },
  (prevProps, nextProps) =>
    prevProps.dogId === nextProps.dogId &&
    prevProps.compact === nextProps.compact &&
    prevProps.className === nextProps.className
);

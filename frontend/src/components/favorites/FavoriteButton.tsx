"use client";

import React, { useState, useCallback } from "react";
import { Heart } from "lucide-react";
import { useFavorites } from "../../hooks/useFavorites";

interface FavoriteButtonProps {
  dogId: number;
  dogName?: string;
  className?: string;
}

export function FavoriteButton({
  dogId,
  dogName,
  className = "",
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
        await toggleFavorite(dogId, dogName);
      } finally {
        setIsLoading(false);
      }
    },
    [dogId, dogName, toggleFavorite],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(dogId, dogName);
      }
    },
    [dogId, dogName, toggleFavorite],
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
        p-2 rounded-full
        transition-all duration-200 ease-in-out
        hover:scale-110 active:scale-95
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        ${isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        ${isFav ? "text-red-500 hover:text-red-600" : "text-gray-400 hover:text-red-500"}
        ${className}
      `}
    >
      <Heart
        size={20}
        fill={isFav ? "currentColor" : "none"}
        className="transition-colors duration-200"
      />
    </button>
  );
}

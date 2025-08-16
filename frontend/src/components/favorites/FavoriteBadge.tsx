"use client";

import React from "react";
import { useFavorites } from "../../hooks/useFavorites";

interface FavoriteBadgeProps {
  className?: string;
}

export function FavoriteBadge({ className = "" }: FavoriteBadgeProps) {
  const { count } = useFavorites();

  if (count === 0) {
    return null;
  }

  return (
    <span
      className={`
        inline-flex items-center justify-center
        min-w-[20px] h-5 px-1.5
        text-xs font-semibold
        bg-red-500 text-white
        rounded-full
        ${className}
      `}
      aria-label={`${count} favorite${count !== 1 ? "s" : ""}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

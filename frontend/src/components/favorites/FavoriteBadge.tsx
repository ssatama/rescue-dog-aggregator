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
        min-w-[18px] h-[18px] px-1.5
        text-[11px] font-semibold tabular-nums
        bg-foreground text-background
        rounded-full
        ${className}
      `}
      aria-label={`${count} favorite${count !== 1 ? "s" : ""}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

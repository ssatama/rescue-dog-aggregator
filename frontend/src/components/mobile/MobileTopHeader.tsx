"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Search, Heart } from "lucide-react";
import Link from "next/link";

/**
 * MobileTopHeader - Sticky header for mobile home page
 * Features:
 * - Logo/brand on left
 * - Search and favorites icons on right
 * - Sticky positioning with backdrop blur
 * - Dark mode support
 * - Safe area padding for iOS
 */
export default function MobileTopHeader() {
  const router = useRouter();

  const handleSearchClick = () => {
    router.push("/dogs");
  };

  const handleFavoritesClick = () => {
    router.push("/favorites");
  };

  return (
    <header
      className="sticky top-0 z-40 bg-white/85 dark:bg-gray-900/85 backdrop-blur-md border-b border-gray-200/70 dark:border-gray-800/70 px-4 py-2 flex items-center justify-between md:hidden"
      style={{ paddingTop: 'env(safe-area-inset-top, 0.5rem)' }}
    >
      {/* Logo/Brand */}
      <Link href="/" className="flex items-center gap-2">
        <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
          <span className="text-white text-2xl">🐕</span>
        </div>
        <span className="text-lg font-bold text-gray-900 dark:text-white">
          Rescue Dogs
        </span>
      </Link>

      {/* Action Icons */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleSearchClick}
          className="h-11 w-11 rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-200/60 dark:border-gray-700/60 flex items-center justify-center hover:shadow-md transition-shadow"
          aria-label="Search dogs"
        >
          <Search className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <button
          onClick={handleFavoritesClick}
          className="h-11 w-11 rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-200/60 dark:border-gray-700/60 flex items-center justify-center hover:shadow-md transition-shadow"
          aria-label="View favorites"
        >
          <Heart className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>
    </header>
  );
}
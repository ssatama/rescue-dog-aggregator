"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Search, Heart } from 'lucide-react';

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
    router.push('/dogs');
  };

  const handleFavoritesClick = () => {
    router.push('/favorites');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/85 dark:bg-gray-900/85 backdrop-blur-md border-b border-gray-200/70 dark:border-gray-800/70 px-4 py-2 flex items-center justify-between md:hidden pt-safe">
      {/* Logo/Brand */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
          <span className="text-white text-lg">🐕</span>
        </div>
        <span className="text-base font-semibold text-gray-900 dark:text-white">
          Rescue Dogs
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {/* Search Button */}
        <button
          onClick={handleSearchClick}
          aria-label="Search for dogs"
          className="h-11 w-11 rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-200/60 dark:border-gray-700/60 flex items-center justify-center hover:shadow-md active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none"
        >
          <Search className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>

        {/* Favorites Button */}
        <button
          onClick={handleFavoritesClick}
          aria-label="View favorites"
          className="h-11 w-11 rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-200/60 dark:border-gray-700/60 flex items-center justify-center hover:shadow-md active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none"
        >
          <Heart className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>
    </header>
  );
}
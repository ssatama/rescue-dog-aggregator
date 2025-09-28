"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Search, Heart, Dog, Star } from "lucide-react";

interface NavCard {
  title: string;
  icon: React.ReactNode;
  route: string;
  gradient: string;
  darkGradient: string;
  hasNew?: boolean;
}

/**
 * MobileNavCards - Navigation cards for mobile home page
 * Features:
 * - 4 colorful gradient cards in 2x2 grid
 * - Browse, Swipe, Breeds, Favorites
 * - NEW badge on Swipe
 * - Gradient backgrounds with dark mode support
 */
export default function MobileNavCards() {
  const router = useRouter();

  const navCards: NavCard[] = [
    {
      title: "Browse",
      icon: <Search className="h-6 w-6 text-white" />,
      route: "/dogs",
      gradient: "from-indigo-400 to-violet-500",  // Desaturated by ~10%
      darkGradient: "dark:from-indigo-500 dark:to-violet-600",
    },
    {
      title: "Swipe",
      icon: <Heart className="h-6 w-6 text-white" />,
      route: "/swipe",
      gradient: "from-fuchsia-400 to-pink-500",  // Desaturated by ~10%
      darkGradient: "dark:from-fuchsia-500 dark:to-pink-600",
      hasNew: true,
    },
    {
      title: "Breeds",
      icon: <Dog className="h-6 w-6 text-white" />,
      route: "/breeds",
      gradient: "from-sky-400 to-blue-500",  // Desaturated by ~10%
      darkGradient: "dark:from-sky-500 dark:to-blue-600",
    },
    {
      title: "Favorites",
      icon: <Star className="h-6 w-6 text-white" />,
      route: "/favorites",
      gradient: "from-[#D4714A] to-amber-400",  // Updated to use terracotta
      darkGradient: "dark:from-[#C05F3A] dark:to-amber-500",
    },
  ];

  const handleCardClick = (route: string) => {
    router.push(route);
  };

  return (
    <div className="grid grid-cols-2 gap-3 px-4 py-4 md:hidden">
      {navCards.map((card) => (
        <button
          key={card.title}
          onClick={() => handleCardClick(card.route)}
          aria-label={`Navigate to ${card.title}`}
          className={`
            relative rounded-2xl p-4 h-28 text-white
            bg-gradient-to-br ${card.gradient} ${card.darkGradient}
            ring-1 ring-white/10 
            active:scale-95 transition-all
            hover:shadow-xl focus-visible:ring-2 focus-visible:ring-[#D4714A] 
            focus-visible:outline-none
            shadow-[0_2px_8px_rgba(0,0,0,0.08)]
          `}
        >
          {/* NEW Badge */}
          {card.hasNew && (
            <div className="absolute top-2 right-2 rounded-full bg-white/90 text-pink-600 text-[10px] font-bold px-1.5 py-0.5 ring-1 ring-pink-200">
              NEW
            </div>
          )}

          {/* Icon and Title */}
          <div className="flex flex-col items-center justify-center h-full space-y-2">
            {card.icon}
            <span className="text-sm font-medium">{card.title}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
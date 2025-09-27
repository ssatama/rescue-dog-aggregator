"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Search, Heart, Dog, Star } from 'lucide-react';

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
      title: 'Browse',
      icon: <Search className="h-6 w-6 text-white" />,
      route: '/dogs',
      gradient: 'from-indigo-500 to-violet-600',
      darkGradient: 'dark:from-indigo-600 dark:to-violet-700',
    },
    {
      title: 'Swipe',
      icon: <Heart className="h-6 w-6 text-white" />,
      route: '/swipe',
      gradient: 'from-fuchsia-500 to-pink-600',
      darkGradient: 'dark:from-fuchsia-600 dark:to-pink-700',
      hasNew: true,
    },
    {
      title: 'Breeds',
      icon: <Dog className="h-6 w-6 text-white" />,
      route: '/breeds',
      gradient: 'from-sky-500 to-blue-600',
      darkGradient: 'dark:from-sky-600 dark:to-blue-700',
    },
    {
      title: 'Favorites',
      icon: <Star className="h-6 w-6 text-white" />,
      route: '/favorites',
      gradient: 'from-orange-500 to-amber-500',
      darkGradient: 'dark:from-orange-600 dark:to-amber-600',
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
            relative rounded-2xl p-4 h-28 text-white shadow-lg 
            bg-gradient-to-br ${card.gradient} ${card.darkGradient}
            ring-1 ring-white/10 
            active:scale-95 transition-transform
            hover:shadow-xl focus-visible:ring-2 focus-visible:ring-orange-500 
            focus-visible:outline-none
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
"use client";

import { useRouter } from "next/navigation";
import { Search, Heart, Dog, Star } from "lucide-react";

interface NavCard {
  title: string;
  icon: React.ReactNode;
  route: string;
  hasNew?: boolean;
}

/**
 * MobileNavCards Component
 * 
 * Premium navigation cards with Apple/Airbnb-inspired design:
 * - Clean neutral cards with subtle borders
 * - Rose accent icon chips for brand consistency
 * - Refined typography and spacing
 * - Subtle interactions and shadows
 */
export default function MobileNavCards() {
  const router = useRouter();

  const navItems = [
    {
      href: "/dogs",
      icon: <Search className="h-5 w-5" />,
      label: "Browse",
    },
    {
      href: "/swipe",
      icon: <Heart className="h-5 w-5" />,
      label: "Swipe",
      badge: "NEW",
    },
    {
      href: "/breeds",
      icon: <Dog className="h-5 w-5" />,
      label: "Breeds",
    },
    {
      href: "/favorites",
      icon: <Star className="h-5 w-5" />,
      label: "Favorites",
    },
  ];

  const handleCardClick = (route: string) => {
    router.push(route);
  };

  return (
    <div className="grid grid-cols-2 gap-3 px-4 py-4 md:hidden">
      {navItems.map((item) => (
        <button
          key={item.label}
          onClick={() => handleCardClick(item.href)}
          aria-label={`Navigate to ${item.label}`}
          className="
            relative bg-white dark:bg-zinc-900 
            ring-1 ring-zinc-200/60 dark:ring-zinc-800/60 
            rounded-2xl h-24 p-3
            active:scale-[0.98] transition-all duration-200
            hover:shadow-sm focus-visible:ring-2 focus-visible:ring-rose-500 
            focus-visible:outline-none
            shadow-[0_1px_0_rgba(0,0,0,0.06),0_8px_20px_rgba(0,0,0,0.04)]
          "
        >
          {/* NEW Badge */}
          {item.badge && (
            <div className="absolute top-2 right-2 rounded-full bg-[#E678A8]/20 dark:bg-[#E678A8]/10 text-[#E678A8] dark:text-[#E678A8] text-[10px] font-medium px-1.5 py-0.5 ring-1 ring-[#E678A8]/30 dark:ring-[#E678A8]/20">
              {item.badge}
            </div>
          )}

          {/* Icon and Title */}
          <div className="flex flex-col items-center justify-center h-full space-y-2">
            {/* Icon Chip */}
            <div className="h-9 w-9 rounded-full bg-[#E678A8]/10 dark:bg-[#E678A8]/10 flex items-center justify-center text-[#E678A8] dark:text-[#E678A8]">
              {item.icon}
            </div>
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {item.label}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
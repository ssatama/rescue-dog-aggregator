"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Search, Heart, Dog, Star } from "lucide-react";

const MobileNavCards: React.FC = () => {
  const router = useRouter();

  const navItems = [
    {
      icon: Search,
      label: "Browse",
      path: "/dogs",
      color: "bg-pink-100 dark:bg-pink-900/20",
      iconColor: "text-pink-600 dark:text-pink-400",
    },
    {
      icon: Heart,
      label: "Swipe",
      path: "/swipe",
      color: "bg-red-100 dark:bg-red-900/20",
      iconColor: "text-red-600 dark:text-red-400",
      badge: "NEW",
    },
    {
      icon: Dog,
      label: "Breeds",
      path: "/breeds",
      color: "bg-purple-100 dark:bg-purple-900/20",
      iconColor: "text-purple-600 dark:text-purple-400",
    },
    {
      icon: Star,
      label: "Favorites",
      path: "/favorites",
      color: "bg-orange-100 dark:bg-orange-900/20",
      iconColor: "text-orange-600 dark:text-orange-400",
    },
  ];

  return (
    <div className="px-4 py-6">
      <div className="grid grid-cols-2 gap-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => router.push(item.path)}
              className="relative bg-white dark:bg-zinc-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] border border-zinc-100 dark:border-zinc-700"
              aria-label={`Navigate to ${item.label}`}
            >
              {item.badge && (
                <span className="absolute top-2 right-2 px-2 py-0.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold rounded-full">
                  {item.badge}
                </span>
              )}
              <div
                className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center mb-3`}
              >
                <Icon className={`w-6 h-6 ${item.iconColor}`} />
              </div>
              <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {item.label}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MobileNavCards;
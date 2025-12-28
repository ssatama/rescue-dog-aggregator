"use client";

import Link from "next/link";
import { Sparkles, Heart } from "lucide-react";
import { AGE_CATEGORIES, getAgeCategoriesArray } from "@/utils/ageData";

interface AgeStat {
  slug: string;
  count: number;
}

interface MobileAgeBrowseProps {
  ageStats?: AgeStat[];
}

/**
 * MobileAgeBrowse - Distinctive mobile section for browsing dogs by age
 * Features side-by-side gradient cards with playful animations
 */
export default function MobileAgeBrowse({
  ageStats = [],
}: MobileAgeBrowseProps) {
  const categories = getAgeCategoriesArray();

  const categoriesWithStats = categories.map((category) => {
    const stats = ageStats.find(
      (s) => s.slug?.toLowerCase() === category.slug.toLowerCase()
    );
    return {
      ...category,
      count: stats?.count || 0,
    };
  });

  const puppies = categoriesWithStats.find((c) => c.slug === "puppies");
  const seniors = categoriesWithStats.find((c) => c.slug === "senior");

  // Don't render if no data
  if (!puppies && !seniors) {
    return null;
  }

  return (
    <section
      className="px-4 py-6"
      aria-labelledby="mobile-age-browse-heading"
    >
      {/* Header */}
      <h2
        id="mobile-age-browse-heading"
        className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-4"
      >
        Browse by Age
      </h2>

      {/* Side-by-side cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Puppies Card */}
        {puppies && (
          <Link href={`/dogs/${puppies.slug}`} className="group block">
            <div className="relative h-36 rounded-2xl overflow-hidden shadow-lg shadow-pink-500/20 dark:shadow-pink-900/30 transition-all duration-300 active:scale-[0.98]">
              {/* Gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-pink-400 via-rose-500 to-orange-400 dark:from-pink-600 dark:via-rose-700 dark:to-orange-600" />

              {/* Animated sparkles */}
              <div className="absolute top-3 right-3 animate-float-slow">
                <Sparkles className="w-4 h-4 text-white/50" />
              </div>
              <div
                className="absolute top-8 right-6 animate-float-medium"
                style={{ animationDelay: "0.5s" }}
              >
                <Sparkles className="w-3 h-3 text-white/40" />
              </div>

              {/* Paw print decoration */}
              <div className="absolute -bottom-2 -left-1 text-4xl opacity-10 rotate-[-15deg] select-none">
                🐾
              </div>

              {/* Content */}
              <div className="relative h-full p-4 flex flex-col justify-between">
                {/* Emoji with bounce */}
                <span
                  className="text-3xl animate-bounce-gentle select-none"
                  role="img"
                  aria-label="Puppy"
                >
                  {puppies.emoji}
                </span>

                {/* Text */}
                <div>
                  <h3 className="text-white font-bold text-base mb-0.5">
                    {puppies.name}
                  </h3>
                  <p className="text-white/80 text-xs font-medium">
                    {puppies.count.toLocaleString()} waiting
                  </p>
                </div>
              </div>

              {/* Hover/touch glow */}
              <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity duration-200 pointer-events-none">
                <div className="absolute inset-0 bg-white/10" />
              </div>
            </div>
          </Link>
        )}

        {/* Seniors Card */}
        {seniors && (
          <Link href={`/dogs/${seniors.slug}`} className="group block">
            <div className="relative h-36 rounded-2xl overflow-hidden shadow-lg shadow-amber-500/20 dark:shadow-amber-900/30 transition-all duration-300 active:scale-[0.98]">
              {/* Gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600 dark:from-amber-700 dark:via-orange-800 dark:to-rose-800" />

              {/* Animated hearts */}
              <div className="absolute top-3 right-3 animate-pulse-gentle">
                <Heart className="w-4 h-4 text-white/50 fill-white/30" />
              </div>
              <div
                className="absolute top-8 right-6 animate-pulse-gentle"
                style={{ animationDelay: "0.7s" }}
              >
                <Heart className="w-3 h-3 text-white/40 fill-white/20" />
              </div>

              {/* Warm glow decoration */}
              <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white/10 rounded-full blur-xl" />

              {/* Content */}
              <div className="relative h-full p-4 flex flex-col justify-between">
                {/* Emoji with pulse */}
                <span
                  className="text-3xl animate-pulse-slow select-none"
                  role="img"
                  aria-label="Senior dog"
                >
                  {seniors.emoji}
                </span>

                {/* Text */}
                <div>
                  <h3 className="text-white font-bold text-base mb-0.5">
                    {seniors.name}
                  </h3>
                  <p className="text-white/80 text-xs font-medium">
                    {seniors.count.toLocaleString()} waiting
                  </p>
                </div>
              </div>

              {/* Hover/touch glow */}
              <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity duration-200 pointer-events-none">
                <div className="absolute inset-0 bg-white/10" />
              </div>
            </div>
          </Link>
        )}
      </div>
    </section>
  );
}

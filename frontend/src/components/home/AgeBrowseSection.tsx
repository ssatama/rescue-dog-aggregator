"use client";

import Link from "next/link";
import { Sparkles, Heart, ArrowRight } from "lucide-react";
import { AGE_CATEGORIES, getAgeCategoriesArray } from "@/utils/ageData";
import type { AgeBrowseSectionProps } from "@/types/homeComponents";

/**
 * AgeBrowseSection - A distinctive, emotionally resonant section for browsing dogs by age
 * Features playful animations for puppies and warm, dignified styling for seniors
 */
export default function AgeBrowseSection({ ageStats = [] }: AgeBrowseSectionProps) {
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

  return (
    <section
      className="relative py-24 overflow-hidden bg-gradient-to-b from-orange-50/50 via-white to-rose-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950"
      aria-labelledby="age-browse-heading"
    >
      {/* Subtle background texture */}
      <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <p className="text-sm font-medium tracking-widest uppercase text-orange-600 dark:text-orange-400 mb-3">
            Every age deserves love
          </p>
          <h2
            id="age-browse-heading"
            className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight"
          >
            Find Your Perfect Match
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
            Whether you&apos;re looking for playful energy or calm companionship,
            there&apos;s a rescue dog waiting for you
          </p>
        </div>

        {/* Age Category Cards */}
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* Puppies Card */}
          {puppies && (
            <Link href={`/dogs/${puppies.slug}`} className="group block">
              <article className="relative h-full min-h-[320px] rounded-3xl overflow-hidden shadow-xl shadow-pink-500/10 dark:shadow-pink-900/20 transition-all duration-500 group-hover:shadow-2xl group-hover:shadow-pink-500/20 dark:group-hover:shadow-pink-800/30 group-hover:-translate-y-1">
                {/* Gradient Background */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${puppies.gradient} ${puppies.darkGradient} transition-all duration-500`}
                />

                {/* Animated floating elements */}
                <div className="absolute inset-0 overflow-hidden">
                  {/* Sparkle 1 */}
                  <div className="absolute top-8 right-12 animate-float-slow">
                    <Sparkles className="w-5 h-5 text-white/40" />
                  </div>
                  {/* Sparkle 2 */}
                  <div
                    className="absolute top-20 right-8 animate-float-medium"
                    style={{ animationDelay: "0.5s" }}
                  >
                    <Sparkles className="w-4 h-4 text-white/30" />
                  </div>
                  {/* Sparkle 3 */}
                  <div
                    className="absolute bottom-24 right-16 animate-float-fast"
                    style={{ animationDelay: "1s" }}
                  >
                    <Sparkles className="w-6 h-6 text-white/25" />
                  </div>
                  {/* Paw prints decoration */}
                  <div className="absolute -bottom-4 -left-4 text-7xl opacity-10 rotate-[-15deg] select-none">
                    🐾
                  </div>
                  <div
                    className="absolute top-4 -right-2 text-5xl opacity-10 rotate-[25deg] select-none"
                    style={{ animationDelay: "0.3s" }}
                  >
                    🐾
                  </div>
                </div>

                {/* Content */}
                <div className="relative h-full p-8 flex flex-col justify-between">
                  <div>
                    {/* Icon + Badge row */}
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <span
                          className="text-5xl animate-bounce-gentle select-none"
                          role="img"
                          aria-label="Puppy"
                        >
                          {puppies.emoji}
                        </span>
                        <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5">
                          <Sparkles className="w-4 h-4 text-white" />
                          <span className="text-sm font-medium text-white">
                            {puppies.ageRange}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Title + Tagline */}
                    <h3 className="text-3xl font-bold text-white mb-2 tracking-tight">
                      {puppies.name}
                    </h3>
                    <p className="text-white/90 text-lg leading-relaxed">
                      {puppies.tagline}
                    </p>
                  </div>

                  {/* Bottom row */}
                  <div className="flex items-end justify-between mt-8">
                    {/* Count */}
                    <div>
                      <p className="text-4xl font-bold text-white">
                        {puppies.count.toLocaleString()}
                      </p>
                      <p className="text-white/80 font-medium">
                        puppies waiting
                      </p>
                    </div>

                    {/* Arrow */}
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all duration-300 group-hover:bg-white/30 group-hover:scale-110">
                      <ArrowRight className="w-5 h-5 text-white transition-transform duration-300 group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>

                {/* Hover glow effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                  <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent" />
                </div>
              </article>
            </Link>
          )}

          {/* Seniors Card */}
          {seniors && (
            <Link href={`/dogs/${seniors.slug}`} className="group block">
              <article className="relative h-full min-h-[320px] rounded-3xl overflow-hidden shadow-xl shadow-amber-500/10 dark:shadow-amber-900/20 transition-all duration-500 group-hover:shadow-2xl group-hover:shadow-amber-500/20 dark:group-hover:shadow-amber-800/30 group-hover:-translate-y-1">
                {/* Gradient Background */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${seniors.gradient} ${seniors.darkGradient} transition-all duration-500`}
                />

                {/* Animated floating elements */}
                <div className="absolute inset-0 overflow-hidden">
                  {/* Heart 1 */}
                  <div className="absolute top-10 right-10 animate-pulse-gentle">
                    <Heart className="w-5 h-5 text-white/40 fill-white/20" />
                  </div>
                  {/* Heart 2 */}
                  <div
                    className="absolute top-24 right-6 animate-pulse-gentle"
                    style={{ animationDelay: "0.7s" }}
                  >
                    <Heart className="w-4 h-4 text-white/30 fill-white/15" />
                  </div>
                  {/* Heart 3 */}
                  <div
                    className="absolute bottom-28 right-14 animate-pulse-gentle"
                    style={{ animationDelay: "1.4s" }}
                  >
                    <Heart className="w-6 h-6 text-white/25 fill-white/10" />
                  </div>
                  {/* Warm glow decoration */}
                  <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                  <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl" />
                </div>

                {/* Content */}
                <div className="relative h-full p-8 flex flex-col justify-between">
                  <div>
                    {/* Icon + Badge row */}
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <span
                          className="text-5xl animate-pulse-slow select-none"
                          role="img"
                          aria-label="Senior dog"
                        >
                          {seniors.emoji}
                        </span>
                        <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5">
                          <Heart className="w-4 h-4 text-white fill-white/50" />
                          <span className="text-sm font-medium text-white">
                            {seniors.ageRange}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Title + Tagline */}
                    <h3 className="text-3xl font-bold text-white mb-2 tracking-tight">
                      {seniors.name}
                    </h3>
                    <p className="text-white/90 text-lg leading-relaxed">
                      {seniors.tagline}
                    </p>
                  </div>

                  {/* Bottom row */}
                  <div className="flex items-end justify-between mt-8">
                    {/* Count */}
                    <div>
                      <p className="text-4xl font-bold text-white">
                        {seniors.count.toLocaleString()}
                      </p>
                      <p className="text-white/80 font-medium">
                        wise souls waiting
                      </p>
                    </div>

                    {/* Arrow */}
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all duration-300 group-hover:bg-white/30 group-hover:scale-110">
                      <ArrowRight className="w-5 h-5 text-white transition-transform duration-300 group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>

                {/* Hover glow effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                  <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent" />
                </div>
              </article>
            </Link>
          )}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <Link
            href="/dogs"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 font-medium transition-colors"
          >
            Or browse all dogs
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

    </section>
  );
}

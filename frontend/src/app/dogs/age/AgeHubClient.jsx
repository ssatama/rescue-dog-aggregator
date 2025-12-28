"use client";

import Link from "next/link";
import { Sparkles, Heart, ArrowRight, ArrowLeft } from "lucide-react";
import { AGE_CATEGORIES, getAgeCategoriesArray } from "@/utils/ageData";

/**
 * AgeHubClient - A distinctive, emotionally resonant hub page for browsing dogs by age
 * Features animated gradients, floating emojis, and delightful micro-interactions
 */
export default function AgeHubClient({ initialStats }) {
  const categories = getAgeCategoriesArray();

  const categoriesWithStats = categories.map((category) => {
    const stats = initialStats?.ageCategories?.find(
      (s) => s.slug?.toLowerCase() === category.slug.toLowerCase()
    );
    return {
      ...category,
      count: stats?.count || 0,
    };
  });

  const puppies = categoriesWithStats.find((c) => c.slug === "puppies");
  const seniors = categoriesWithStats.find((c) => c.slug === "senior");
  const totalDogs = (puppies?.count || 0) + (seniors?.count || 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-rose-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Hero Section */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        {/* Animated background gradient */}
        <div className="absolute inset-0 opacity-30 dark:opacity-20">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-200 via-orange-100 to-amber-200 dark:from-pink-900/30 dark:via-orange-900/20 dark:to-amber-900/30 animate-pulse-slow" />
        </div>

        {/* Floating decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Large floating emoji - puppies */}
          <div className="absolute top-16 left-[10%] text-6xl md:text-7xl opacity-20 animate-float-slow select-none">
            🐶
          </div>
          {/* Large floating emoji - seniors */}
          <div
            className="absolute top-24 right-[10%] text-6xl md:text-7xl opacity-20 animate-float-medium select-none"
            style={{ animationDelay: "1s" }}
          >
            🦴
          </div>
          {/* Sparkles */}
          <div className="absolute top-32 left-1/4 animate-float-fast">
            <Sparkles className="w-8 h-8 text-pink-300 dark:text-pink-600 opacity-40" />
          </div>
          {/* Hearts */}
          <div
            className="absolute top-40 right-1/4 animate-pulse-gentle"
            style={{ animationDelay: "0.5s" }}
          >
            <Heart className="w-8 h-8 text-amber-400 dark:text-amber-600 opacity-40 fill-amber-200 dark:fill-amber-800" />
          </div>
          {/* Paw prints */}
          <div className="absolute bottom-20 left-[15%] text-4xl opacity-10 rotate-[-20deg] select-none">
            🐾
          </div>
          <div
            className="absolute bottom-32 right-[20%] text-3xl opacity-10 rotate-[15deg] select-none"
            style={{ animationDelay: "0.7s" }}
          >
            🐾
          </div>
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Back link */}
          <Link
            href="/dogs"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            All Dogs
          </Link>

          {/* Main heading */}
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">
            Every Age{" "}
            <span className="bg-gradient-to-r from-pink-500 via-orange-500 to-amber-500 bg-clip-text text-transparent">
              Deserves Love
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-4">
            Whether you&apos;re looking for boundless puppy energy or the calm
            wisdom of a senior companion, your perfect match is waiting
          </p>

          {/* Stats summary */}
          <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
            {totalDogs.toLocaleString()} dogs across all ages
          </p>
        </div>
      </section>

      {/* Age Category Cards */}
      <section className="relative py-12 md:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            {/* Puppies Card */}
            {puppies && (
              <Link href={`/dogs/${puppies.slug}`} className="group block">
                <article className="relative h-80 md:h-96 rounded-3xl overflow-hidden shadow-2xl shadow-pink-500/20 dark:shadow-pink-900/30 transition-all duration-500 group-hover:shadow-3xl group-hover:shadow-pink-500/30 dark:group-hover:shadow-pink-800/40 group-hover:-translate-y-2">
                  {/* Gradient Background */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${puppies.gradient} dark:${puppies.darkGradient} transition-all duration-500`}
                  />

                  {/* Animated sparkle particles */}
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-6 right-8 animate-float-slow">
                      <Sparkles className="w-6 h-6 text-white/50" />
                    </div>
                    <div
                      className="absolute top-16 right-12 animate-float-medium"
                      style={{ animationDelay: "0.3s" }}
                    >
                      <Sparkles className="w-5 h-5 text-white/40" />
                    </div>
                    <div
                      className="absolute top-28 right-6 animate-float-fast"
                      style={{ animationDelay: "0.6s" }}
                    >
                      <Sparkles className="w-4 h-4 text-white/30" />
                    </div>
                    <div
                      className="absolute bottom-20 right-10 animate-float-medium"
                      style={{ animationDelay: "0.9s" }}
                    >
                      <Sparkles className="w-7 h-7 text-white/35" />
                    </div>

                    {/* Paw prints decoration */}
                    <div className="absolute -bottom-4 -left-4 text-8xl opacity-10 rotate-[-15deg] select-none">
                      🐾
                    </div>
                    <div className="absolute top-4 -right-2 text-6xl opacity-10 rotate-[25deg] select-none">
                      🐾
                    </div>
                  </div>

                  {/* Content */}
                  <div className="relative h-full p-8 md:p-10 flex flex-col justify-between">
                    <div>
                      {/* Emoji with bounce animation */}
                      <div className="mb-6">
                        <span
                          className="text-6xl md:text-7xl animate-bounce-gentle select-none inline-block"
                          role="img"
                          aria-label="Puppy"
                        >
                          {puppies.emoji}
                        </span>
                      </div>

                      {/* Age badge */}
                      <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-4">
                        <Sparkles className="w-4 h-4 text-white" />
                        <span className="text-sm font-medium text-white">
                          {puppies.ageRange}
                        </span>
                      </div>

                      {/* Title */}
                      <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">
                        {puppies.name}
                      </h2>

                      {/* Tagline */}
                      <p className="text-white/90 text-lg leading-relaxed max-w-xs">
                        {puppies.tagline}
                      </p>
                    </div>

                    {/* Bottom row */}
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-5xl font-bold text-white">
                          {puppies.count.toLocaleString()}
                        </p>
                        <p className="text-white/80 font-medium text-lg">
                          puppies waiting
                        </p>
                      </div>

                      {/* Arrow button */}
                      <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all duration-300 group-hover:bg-white/30 group-hover:scale-110">
                        <ArrowRight className="w-6 h-6 text-white transition-transform duration-300 group-hover:translate-x-1" />
                      </div>
                    </div>
                  </div>

                  {/* Hover glow effect */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-t from-white/15 to-transparent" />
                  </div>
                </article>
              </Link>
            )}

            {/* Seniors Card */}
            {seniors && (
              <Link href={`/dogs/${seniors.slug}`} className="group block">
                <article className="relative h-80 md:h-96 rounded-3xl overflow-hidden shadow-2xl shadow-amber-500/20 dark:shadow-amber-900/30 transition-all duration-500 group-hover:shadow-3xl group-hover:shadow-amber-500/30 dark:group-hover:shadow-amber-800/40 group-hover:-translate-y-2">
                  {/* Gradient Background */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${seniors.gradient} dark:${seniors.darkGradient} transition-all duration-500`}
                  />

                  {/* Animated heart particles */}
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-6 right-8 animate-pulse-gentle">
                      <Heart className="w-6 h-6 text-white/50 fill-white/30" />
                    </div>
                    <div
                      className="absolute top-16 right-12 animate-pulse-gentle"
                      style={{ animationDelay: "0.5s" }}
                    >
                      <Heart className="w-5 h-5 text-white/40 fill-white/25" />
                    </div>
                    <div
                      className="absolute top-28 right-6 animate-pulse-gentle"
                      style={{ animationDelay: "1s" }}
                    >
                      <Heart className="w-4 h-4 text-white/30 fill-white/20" />
                    </div>
                    <div
                      className="absolute bottom-24 right-10 animate-pulse-gentle"
                      style={{ animationDelay: "1.5s" }}
                    >
                      <Heart className="w-7 h-7 text-white/35 fill-white/25" />
                    </div>

                    {/* Warm glow decorations */}
                    <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-white/15 rounded-full blur-2xl" />
                    <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-xl" />
                  </div>

                  {/* Content */}
                  <div className="relative h-full p-8 md:p-10 flex flex-col justify-between">
                    <div>
                      {/* Emoji with pulse animation */}
                      <div className="mb-6">
                        <span
                          className="text-6xl md:text-7xl animate-pulse-slow select-none inline-block"
                          role="img"
                          aria-label="Senior dog"
                        >
                          {seniors.emoji}
                        </span>
                      </div>

                      {/* Age badge */}
                      <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-4">
                        <Heart className="w-4 h-4 text-white fill-white/50" />
                        <span className="text-sm font-medium text-white">
                          {seniors.ageRange}
                        </span>
                      </div>

                      {/* Title */}
                      <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">
                        {seniors.name}
                      </h2>

                      {/* Tagline */}
                      <p className="text-white/90 text-lg leading-relaxed max-w-xs">
                        {seniors.tagline}
                      </p>
                    </div>

                    {/* Bottom row */}
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-5xl font-bold text-white">
                          {seniors.count.toLocaleString()}
                        </p>
                        <p className="text-white/80 font-medium text-lg">
                          wise souls waiting
                        </p>
                      </div>

                      {/* Arrow button */}
                      <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all duration-300 group-hover:bg-white/30 group-hover:scale-110">
                        <ArrowRight className="w-6 h-6 text-white transition-transform duration-300 group-hover:translate-x-1" />
                      </div>
                    </div>
                  </div>

                  {/* Hover glow effect */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-t from-white/15 to-transparent" />
                  </div>
                </article>
              </Link>
            )}
          </div>

          {/* Bottom CTA */}
          <div className="text-center mt-16">
            <Link
              href="/dogs"
              className="inline-flex items-center gap-2 px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-full transition-all duration-300 shadow-lg shadow-orange-600/30 hover:shadow-xl hover:shadow-orange-600/40 hover:-translate-y-0.5"
            >
              Browse All Dogs
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

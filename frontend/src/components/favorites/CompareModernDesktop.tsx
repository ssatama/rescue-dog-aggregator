"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Sparkles,
  Heart,
  Home,
  Users,
  Cat,
  Baby,
  Battery,
  GraduationCap,
  MapPin,
  Calendar,
  Ruler,
  ChevronDown,
  ChevronUp,
  Star,
  TrendingUp,
  Award,
  Zap,
  Shield,
  ArrowRight,
} from "lucide-react";
import type { Dog } from "./types";
import {
  getAgeDisplay,
  getCompatibility,
  getPersonalityTraits,
} from "./compareUtils";

// Static color mapping for Tailwind classes (required for production builds)
const CATEGORY_STYLE_MAP: Record<
  string,
  {
    container: string;
    icon: string;
    badge: string;
  }
> = {
  blue: {
    container: "bg-blue-100 dark:bg-blue-900/30",
    icon: "text-blue-600 dark:text-blue-400",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  purple: {
    container: "bg-purple-100 dark:bg-purple-900/30",
    icon: "text-purple-600 dark:text-purple-400",
    badge:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  },
  green: {
    container: "bg-green-100 dark:bg-green-900/30",
    icon: "text-green-600 dark:text-green-400",
    badge:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  orange: {
    container: "bg-orange-100 dark:bg-orange-900/30",
    icon: "text-orange-600 dark:text-orange-400",
    badge:
      "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  },
};

interface CompareModernDesktopProps {
  dogs: Dog[];
  onClose: () => void;
  onBack?: () => void;
}

// Trait categories for comparison
const TRAIT_CATEGORIES = {
  lifestyle: {
    label: "Lifestyle Match",
    icon: Home,
    color: "blue",
  },
  personality: {
    label: "Personality",
    icon: Sparkles,
    color: "purple",
  },
  compatibility: {
    label: "Compatibility",
    icon: Users,
    color: "green",
  },
  requirements: {
    label: "Care Requirements",
    icon: Shield,
    color: "orange",
  },
};

export default function CompareModernDesktop({
  dogs,
  onClose,
  onBack,
}: CompareModernDesktopProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["highlights"]),
  );
  const [hoveredDog, setHoveredDog] = useState<string | number | null>(null);
  const [selectedComparisonMode, setSelectedComparisonMode] = useState<
    "grid" | "focus"
  >("grid");

  const toggleSection = (section: string) => {
    const newSet = new Set(expandedSections);
    if (newSet.has(section)) {
      newSet.delete(section);
    } else {
      newSet.add(section);
    }
    setExpandedSections(newSet);
  };

  const getDogScore = (dog: Dog) => {
    // Calculate a simple match score based on available data
    let score = 0;
    if (dog.dog_profiler_data?.personality_traits) score += 25;
    if (dog.dog_profiler_data?.tagline) score += 25;
    if (dog.dog_profiler_data?.unique_quirk) score += 25;
    if (dog.dog_profiler_data?.energy_level) score += 25;
    return score;
  };

  const getBestMatch = () => {
    return dogs.reduce((best, current) =>
      getDogScore(current) > getDogScore(best) ? current : best,
    );
  };

  const bestMatch = getBestMatch();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-orange-900/20">
      {/* Premium Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border-b border-gray-200/50 dark:border-gray-700/50"
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className="text-sm font-medium text-gray-600 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 transition-colors flex items-center gap-1"
                >
                  ← Back
                </button>
              )}
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                  Compare Your Favorites
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                  Finding your perfect match from {dogs.length} amazing dogs
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setSelectedComparisonMode("grid")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    selectedComparisonMode === "grid"
                      ? "bg-white dark:bg-gray-700 text-orange-600 dark:text-orange-400 shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  Grid View
                </button>
                <button
                  onClick={() => setSelectedComparisonMode("focus")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    selectedComparisonMode === "focus"
                      ? "bg-white dark:bg-gray-700 text-orange-600 dark:text-orange-400 shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  Focus View
                </button>
              </div>

              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200 group"
                aria-label="Close"
              >
                <X
                  size={20}
                  className="group-hover:rotate-90 transition-transform duration-300"
                />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Best Match Highlight */}
        {bestMatch && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 p-6 bg-gradient-to-r from-orange-500/10 via-yellow-500/10 to-orange-500/10 dark:from-orange-900/30 dark:via-yellow-900/30 dark:to-orange-900/30 rounded-2xl border border-orange-200/50 dark:border-orange-700/50"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-500 rounded-lg">
                <Award className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Best Match Based on Available Information
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                {bestMatch.primary_image_url && (
                  <div className="w-12 h-12 rounded-lg overflow-hidden">
                    <Image
                      src={bestMatch.primary_image_url}
                      alt={bestMatch.name}
                      width={48}
                      height={48}
                      className="object-cover"
                    />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {bestMatch.name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {bestMatch.dog_profiler_data?.tagline ||
                      "A wonderful companion"}
                  </p>
                </div>
              </div>
              <div className="ml-auto">
                <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4" />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {getDogScore(bestMatch)}% profile complete
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Main Comparison Grid */}
        <div
          className={`grid ${selectedComparisonMode === "grid" ? "grid-cols-1 lg:grid-cols-" + Math.min(dogs.length, 3) : "grid-cols-1"} gap-6 mb-8`}
        >
          {dogs.map((dog, index) => {
            const isBestMatch = bestMatch?.id === dog.id;
            const compatibility = getCompatibility(dog);
            const traits = getPersonalityTraits(dog);
            const score = getDogScore(dog);

            return (
              <motion.div
                key={dog.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onMouseEnter={() => setHoveredDog(dog.id)}
                onMouseLeave={() => setHoveredDog(null)}
                className={`relative ${selectedComparisonMode === "focus" && index > 0 ? "lg:col-span-1 opacity-60 hover:opacity-100" : ""}`}
              >
                {/* Best Match Badge */}
                {isBestMatch && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className="absolute -top-3 -right-3 z-10 bg-gradient-to-r from-orange-500 to-yellow-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1"
                  >
                    <Award className="w-3 h-3" />
                    BEST MATCH
                  </motion.div>
                )}

                <motion.div
                  whileHover={{ y: -4 }}
                  className={`bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border-2 transition-all duration-300 ${
                    isBestMatch
                      ? "border-orange-400 dark:border-orange-500 shadow-orange-200/50 dark:shadow-orange-900/50"
                      : "border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-600"
                  }`}
                >
                  {/* Dog Image Section */}
                  <div className="relative h-64 overflow-hidden group">
                    {dog.primary_image_url ? (
                      <Image
                        src={dog.primary_image_url}
                        alt={dog.name}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                        <Heart className="w-12 h-12 text-gray-400 dark:text-gray-600" />
                      </div>
                    )}

                    {/* Overlay with Quick Stats */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <div className="flex items-center gap-3 text-white">
                          {score >= 75 && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-white/20 backdrop-blur-sm rounded-lg">
                              <Zap className="w-3 h-3" />
                              <span className="text-xs font-medium">
                                High Match
                              </span>
                            </div>
                          )}
                          {dog.dog_profiler_data?.energy_level && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-white/20 backdrop-blur-sm rounded-lg">
                              <Battery className="w-3 h-3" />
                              <span className="text-xs font-medium">
                                {dog.dog_profiler_data.energy_level}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Profile Completeness */}
                    <div className="absolute top-4 right-4">
                      <div className="w-12 h-12 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
                        <div className="relative">
                          <svg className="w-10 h-10 transform -rotate-90">
                            <circle
                              cx="20"
                              cy="20"
                              r="16"
                              stroke="currentColor"
                              strokeWidth="3"
                              fill="none"
                              className="text-gray-200 dark:text-gray-700"
                            />
                            <circle
                              cx="20"
                              cy="20"
                              r="16"
                              stroke="currentColor"
                              strokeWidth="3"
                              fill="none"
                              strokeDasharray={`${score} 100`}
                              className="text-orange-500 dark:text-orange-400 transition-all duration-700"
                            />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-900 dark:text-gray-100">
                            {score}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dog Information */}
                  <div className="p-6">
                    {/* Name and Tagline */}
                    <div className="mb-4">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                        {dog.name}
                      </h3>
                      {dog.dog_profiler_data?.tagline && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                          &quot;{dog.dog_profiler_data.tagline}&quot;
                        </p>
                      )}
                    </div>

                    {/* Key Info Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">
                          Age:
                        </span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {getAgeDisplay(dog)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Ruler className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">
                          Size:
                        </span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {dog.standardized_size || "Unknown"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">
                          Location:
                        </span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {dog.location || "UK"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Heart className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">
                          Breed:
                        </span>
                        <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          {dog.standardized_breed || dog.breed || "Mixed"}
                        </span>
                      </div>
                    </div>

                    {/* Personality Traits */}
                    {traits.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                          Personality
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {traits.slice(0, 5).map((trait, idx) => (
                            <motion.span
                              key={idx}
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: 0.1 * idx }}
                              className="px-3 py-1 bg-gradient-to-r from-purple-100 to-purple-50 dark:from-purple-900/30 dark:to-purple-800/20 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium border border-purple-200/50 dark:border-purple-700/50"
                            >
                              {trait}
                            </motion.span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Compatibility Icons */}
                    <div className="flex items-center gap-4 mb-4">
                      <div
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                          compatibility.dogs === "yes"
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                            : compatibility.dogs === "no"
                              ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        <Heart className="w-3.5 h-3.5" />
                        <span>Dogs</span>
                      </div>
                      <div
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                          compatibility.cats === "yes"
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                            : compatibility.cats === "no"
                              ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        <Cat className="w-3.5 h-3.5" />
                        <span>Cats</span>
                      </div>
                      <div
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                          compatibility.children === "yes"
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                            : compatibility.children === "no"
                              ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        <Baby className="w-3.5 h-3.5" />
                        <span>Kids</span>
                      </div>
                    </div>

                    {/* Unique Quirk */}
                    {dog.dog_profiler_data?.unique_quirk && (
                      <div className="p-3 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-xl mb-4 border border-orange-200/50 dark:border-orange-700/50">
                        <div className="flex items-center gap-2 mb-1">
                          <Sparkles className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                          <span className="text-xs font-semibold text-orange-700 dark:text-orange-300">
                            What makes {dog.name} special
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {dog.dog_profiler_data.unique_quirk}
                        </p>
                      </div>
                    )}

                    {/* CTA Button */}
                    <motion.a
                      href={dog.adoption_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl font-semibold text-sm transition-all duration-300 shadow-lg hover:shadow-xl"
                    >
                      Learn More About {dog.name}
                      <ArrowRight className="w-4 h-4" />
                    </motion.a>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        {/* Detailed Comparison Sections */}
        <div className="space-y-4">
          {Object.entries(TRAIT_CATEGORIES).map(([key, category]) => {
            const isExpanded = expandedSections.has(key);
            const Icon = category.icon;

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700"
              >
                <button
                  onClick={() => toggleSection(key)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${CATEGORY_STYLE_MAP[category.color]?.container || CATEGORY_STYLE_MAP.blue.container}`}
                    >
                      <Icon
                        className={`w-5 h-5 ${CATEGORY_STYLE_MAP[category.color]?.icon || CATEGORY_STYLE_MAP.blue.icon}`}
                      />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      {category.label}
                    </h3>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                          {dogs.map((dog) => (
                            <div key={dog.id} className="space-y-2">
                              <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">
                                {dog.name}
                              </h4>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                {key === "lifestyle" && (
                                  <>
                                    <p>
                                      Energy:{" "}
                                      {dog.dog_profiler_data?.energy_level ||
                                        "Unknown"}
                                    </p>
                                    <p>
                                      Experience:{" "}
                                      {dog.dog_profiler_data
                                        ?.experience_level || "Unknown"}
                                    </p>
                                  </>
                                )}
                                {key === "personality" && (
                                  <p>
                                    {getPersonalityTraits(dog).join(", ") ||
                                      "No data available"}
                                  </p>
                                )}
                                {key === "compatibility" && (
                                  <>
                                    <p>Dogs: {getCompatibility(dog).dogs}</p>
                                    <p>Cats: {getCompatibility(dog).cats}</p>
                                    <p>
                                      Children: {getCompatibility(dog).children}
                                    </p>
                                  </>
                                )}
                                {key === "requirements" && (
                                  <>
                                    <p>
                                      Size: {dog.standardized_size || "Unknown"}
                                    </p>
                                    <p>Age: {getAgeDisplay(dog)}</p>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

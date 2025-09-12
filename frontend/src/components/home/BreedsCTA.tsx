"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

interface TraitData {
  name: string;
  percentage: number;
  color: string;
}

// Breakpoint constants
const BREAKPOINTS = {
  mobile: 640,
  tablet: 1024,
};

const personalityTraits: TraitData[] = [
  { name: "Affectionate", percentage: 78, color: "bg-pink-500" },
  { name: "Energetic", percentage: 65, color: "bg-yellow-500" },
  { name: "Intelligent", percentage: 82, color: "bg-blue-500" },
  { name: "Gentle", percentage: 71, color: "bg-green-500" },
];

const topBreeds = [
  { name: "Labrador", count: 20 },
  { name: "Golden Retriever", count: 17 },
  { name: "German Shepherd", count: 38 },
];

export function BreedsCTA() {
  const router = useRouter();
  const [viewportSize, setViewportSize] = useState<"mobile" | "tablet" | "desktop">("desktop");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    const checkViewport = () => {
      const width = window.innerWidth;
      if (width < BREAKPOINTS.mobile) {
        setViewportSize("mobile");
      } else if (width < BREAKPOINTS.tablet) {
        setViewportSize("tablet");
      } else {
        setViewportSize("desktop");
      }
    };
    
    checkViewport();
    window.addEventListener("resize", checkViewport);
    return () => window.removeEventListener("resize", checkViewport);
  }, []);

  const handleCTAClick = () => {
    router.push("/breeds");
  };

  // Don't render until client-side to avoid hydration issues
  if (!isClient) {
    return (
      <section className="py-8 md:py-12 lg:py-16 px-4 bg-gradient-to-r from-orange-50 to-yellow-50">
        <div className="max-w-6xl mx-auto animate-pulse">
          <div className="h-48 bg-orange-100 rounded-lg"></div>
        </div>
      </section>
    );
  }

  // Mobile and Tablet view (simplified for better loading)
  if (viewportSize === "mobile" || viewportSize === "tablet") {
    return (
      <section
        role="region"
        aria-label="Breed Discovery"
        className="py-8 px-4 bg-gradient-to-r from-orange-50 to-yellow-50"
      >
        <div className={`${viewportSize === "tablet" ? "max-w-2xl" : "max-w-sm"} mx-auto`}>
          <div className="flex items-center gap-2 mb-4">
            <span className="animate-pulse bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold">
              NEW
            </span>
            <h2 className={`${viewportSize === "tablet" ? "text-2xl" : "text-xl"} font-bold text-gray-900`}>
              NEW: Breed Personality Insights
            </h2>
          </div>

          <div className={`grid ${viewportSize === "tablet" ? "grid-cols-2 gap-4" : "grid-cols-1 gap-4"} mb-6`}>
            {/* Personality Traits Card */}
            <div className="bg-white rounded-lg p-4 shadow-md">
              <h3 className="font-semibold mb-3 text-gray-800">Personality Traits</h3>
              <div className="space-y-2">
                {personalityTraits.slice(0, 3).map((trait) => (
                  <div key={trait.name} className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 w-20">{trait.name}</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                      <motion.div
                        className={`h-full ${trait.color}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${trait.percentage}%` }}
                        transition={{ duration: 1, delay: 0.2 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Breeds Card */}
            <div className="bg-white rounded-lg p-4 shadow-md">
              <h3 className="font-semibold mb-3 text-gray-800">Top Breeds</h3>
              <div className="space-y-2">
                {topBreeds.map((breed) => (
                  <div
                    key={breed.name}
                    className="flex items-center justify-between p-2 bg-orange-50 rounded-md"
                  >
                    <span className="text-sm font-medium text-gray-700">{breed.name}</span>
                    <span className="text-xs text-gray-500">{breed.count} available</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleCTAClick}
            className="w-full bg-orange-600 text-white font-semibold py-3 px-4 rounded-full hover:bg-orange-700 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
            aria-label="Discover Breeds and explore personality insights"
          >
            Discover Breeds
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </section>
    );
  }

  // Desktop view
  return (
    <section
      role="region"
      aria-label="Breed Discovery and Personality Insights"
      className="py-16 px-4 bg-gradient-to-br from-orange-50 via-yellow-50 to-orange-50"
    >
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="animate-pulse bg-red-500 text-white text-sm px-3 py-1 rounded-full font-bold">
              NEW
            </span>
            <span className="text-sm text-gray-600 font-medium">
              50+ breeds analyzed
            </span>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Discover Your Perfect Match by Personality
          </h2>

          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Our new breed explorer reveals personality insights from 2,500+ rescue dogs
          </p>
        </motion.div>

        <div className="grid md:grid-cols-4 gap-6 mb-10">
          {personalityTraits.map((trait, index) => (
            <motion.div
              key={trait.name}
              data-testid={`trait-card-${index}`}
              className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
            >
              <h3 className="font-bold text-gray-800 mb-3">{trait.name}</h3>
              <div className="mb-2">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Average</span>
                  <span>{trait.percentage}%</span>
                </div>
                <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
                  <motion.div
                    data-testid={`trait-bar-${trait.name.toLowerCase()}`}
                    className={`h-full ${trait.color}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${trait.percentage}%` }}
                    transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">Based on breed data</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <button
            onClick={handleCTAClick}
            className="bg-orange-600 text-white font-bold py-4 px-8 rounded-full text-lg hover:bg-orange-700 active:scale-95 transition-all duration-200 inline-flex items-center gap-3 shadow-lg hover:shadow-xl"
            aria-label="Explore Breeds and Personalities - Discover personality insights for rescue dogs"
          >
            Explore Breeds & Personalities
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </button>
        </motion.div>
      </div>
    </section>
  );
}
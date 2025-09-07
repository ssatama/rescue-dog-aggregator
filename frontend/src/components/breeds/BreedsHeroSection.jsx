"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function BreedsHeroSection({ mixedBreedData, totalDogs }) {
  const mixedBreedCount = mixedBreedData?.count || 0;
  const percentage = totalDogs > 0 ? Math.round((mixedBreedCount / totalDogs) * 100) : 0;
  const sampleDogs = mixedBreedData?.sample_dogs || [];
  
  const formatCount = (count) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1).replace('.0', '')}K`;
    }
    return count.toString();
  };

  // Pastel colors for personality traits
  const PASTEL_COLORS = [
    { bg: "bg-blue-100", text: "text-blue-800" },
    { bg: "bg-green-100", text: "text-green-800" },
    { bg: "bg-purple-100", text: "text-purple-800" },
    { bg: "bg-yellow-100", text: "text-yellow-800" },
    { bg: "bg-pink-100", text: "text-pink-800" },
  ];

  const capitalizeFirst = (str) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  return (
    <section 
      data-testid="hero-section"
      className="relative bg-gradient-to-br from-orange-400 to-orange-500 text-white py-4 md:py-6 px-4 md:px-6 overflow-hidden"
    >
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="relative max-w-7xl mx-auto">
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-3xl md:text-5xl font-bold mb-2">
            Every Dog is Unique
          </h1>
          <p className="text-base md:text-lg opacity-95 max-w-2xl mx-auto">
            Discover {formatCount(mixedBreedCount)} one-of-a-kind mixed breed companions waiting for their forever homes
          </p>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap justify-center gap-3 md:gap-6 mb-6 md:mb-8">
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 md:p-4 min-w-[100px]">
            <div className="text-2xl md:text-3xl font-bold">
              {formatCount(mixedBreedCount)}
            </div>
            <div className="text-xs md:text-sm opacity-95">Mixed Breeds</div>
          </div>
          
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 md:p-4 min-w-[100px]">
            <div className="text-2xl md:text-3xl font-bold">
              {percentage}%
            </div>
            <div className="text-xs md:text-sm opacity-95">Of All Dogs</div>
          </div>
          
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 md:p-4 min-w-[100px]">
            <div className="text-2xl md:text-3xl font-bold">
              ∞
            </div>
            <div className="text-xs md:text-sm opacity-95">Unique Personalities</div>
          </div>
        </div>

        {/* Sample Dogs */}
        {sampleDogs.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-6 md:mb-8 max-w-6xl mx-auto">
            {sampleDogs.slice(0, 5).map((dog, index) => (
              <div 
                key={dog.slug}
                className="bg-white rounded-lg p-3 shadow-lg transform transition-transform hover:scale-105"
              >
                <div className="relative h-40 md:h-48 mb-2 rounded-md overflow-hidden">
                  <Image
                    src={dog.primary_image_url}
                    alt={dog.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                    priority={index === 0}
                  />
                </div>
                <h3 className="text-gray-800 font-semibold text-lg mb-1">
                  {dog.name}
                </h3>
                <p className="text-gray-600 text-sm mb-2">
                  {dog.age_group || dog.age_text} • {dog.sex}
                </p>
                <div className="flex flex-wrap gap-1">
                  {dog.personality_traits?.slice(0, 2).map((trait, idx) => {
                    const colors = PASTEL_COLORS[idx % PASTEL_COLORS.length];
                    return (
                      <span
                        key={trait}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}
                      >
                        {capitalizeFirst(trait)}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTA Button */}
        <div className="text-center">
          <Link href="/breeds/mixed">
            <Button 
              size="default" 
              className="bg-white text-orange-500 hover:bg-gray-100 font-semibold px-4 py-2 text-sm"
            >
              Explore Mixed Breeds
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>

        {/* Decorative dog icons */}
        <div className="absolute top-10 left-10 opacity-20">
          <Heart className="h-12 w-12 md:h-16 md:w-16 text-white" />
        </div>
        <div className="absolute bottom-10 right-10 opacity-20 transform rotate-12">
          <Heart className="h-12 w-12 md:h-16 md:w-16 text-white" />
        </div>
      </div>
    </section>
  );
}
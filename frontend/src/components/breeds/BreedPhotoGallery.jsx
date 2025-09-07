"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function BreedPhotoGallery({ dogs, breedName, className = "" }) {
  const [imageErrors, setImageErrors] = useState({});

  const handleImageError = (dogId) => {
    setImageErrors(prev => ({ ...prev, [dogId]: true }));
  };

  if (!dogs || dogs.length === 0) {
    return (
      <div className={`grid grid-cols-2 md:grid-cols-3 gap-2 ${className}`}>
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center"
          >
            <svg
              className="w-12 h-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        ))}
      </div>
    );
  }

  const getMasonryLayout = () => {
    // Predefined aspect ratios to create masonry effect
    const aspectRatios = [
      'aspect-[4/5]',    // Tall rectangle
      'aspect-square',   // Square
      'aspect-[3/4]',    // Portrait
      'aspect-[5/4]',    // Landscape
      'aspect-[4/3]',    // Landscape
      'aspect-square'    // Square
    ];

    return dogs?.slice(0, 6).map((dog, index) => (
      <Link
        key={dog.id}
        href={`/dogs/${dog.slug}`}
        className={`relative overflow-hidden rounded-lg cursor-pointer group block ${aspectRatios[index]}`}
      >
        <Image
          src={imageErrors[dog.id] ? "/images/dog-placeholder.jpg" : dog.primary_image_url}
          alt={`${dog.name} - ${breedName} rescue dog`}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          priority={index < 3}
          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          onError={() => handleImageError(dog.id)}
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
        <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <span className="text-white text-sm font-medium bg-black/50 px-2 py-1 rounded">
            {dog.name}
          </span>
        </div>
      </Link>
    ));
  };

  const getMobileCarousel = () => {
    return (
      <div className="flex overflow-x-auto space-x-2 pb-2 scrollbar-hide">
        {dogs?.slice(0, 6).map((dog, index) => (
          <Link
            key={dog.id}
            href={`/dogs/${dog.slug}`}
            className="flex-shrink-0 w-64 aspect-[4/5] relative overflow-hidden rounded-lg cursor-pointer group block"
          >
            <Image
              src={imageErrors[dog.id] ? "/images/dog-placeholder.jpg" : dog.primary_image_url}
              alt={`${dog.name} - ${breedName} rescue dog`}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              priority={index < 3}
              sizes="256px"
              onError={() => handleImageError(dog.id)}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
            <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <span className="text-white text-sm font-medium bg-black/50 px-2 py-1 rounded">
                {dog.name}
              </span>
            </div>
          </Link>
        ))}
      </div>
    );
  };

  return (
    <div className={`breed-photo-gallery ${className}`}>
      {/* Desktop: Masonry Grid */}
      <div className="hidden md:block">
        <div className="grid grid-cols-3 gap-2 auto-rows-min">
          {getMasonryLayout()}
        </div>
      </div>
      
      {/* Mobile: Swipeable Carousel */}
      <div className="md:hidden">
        {getMobileCarousel()}
      </div>
    </div>
  );
}
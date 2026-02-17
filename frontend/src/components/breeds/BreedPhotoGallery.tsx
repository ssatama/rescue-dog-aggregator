"use client";

import React, { useState, useRef } from "react";
import { FallbackImage } from "../ui/FallbackImage";
import Link from "next/link";

interface CarouselDog {
  id: number | string;
  name: string;
  slug: string;
  primary_image_url: string;
}

interface BreedMobileCarouselProps {
  dogs: CarouselDog[];
  breedName: string;
  imageErrors: Record<string, boolean>;
  handleImageError: (dogId: string | number) => void;
}

function BreedMobileCarousel({
  dogs,
  breedName,
  imageErrors,
  handleImageError,
}: BreedMobileCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const displayedDogs = dogs?.slice(0, 6) || [];

  const scrollToSlide = (index: number): void => {
    if (carouselRef.current) {
      const slideWidth = carouselRef.current.offsetWidth * 0.7; // 70vw
      const gap = 12; // gap-3 = 0.75rem = 12px
      const scrollPosition = index * (slideWidth + gap);
      carouselRef.current.scrollTo({
        left: scrollPosition,
        behavior: "smooth",
      });
      setCurrentSlide(index);
    }
  };

  const handleScroll = (): void => {
    if (carouselRef.current) {
      const scrollLeft = carouselRef.current.scrollLeft;
      const slideWidth = carouselRef.current.offsetWidth * 0.7;
      const gap = 12;
      const newIndex = Math.round(scrollLeft / (slideWidth + gap));
      if (newIndex !== currentSlide) {
        setCurrentSlide(newIndex);
      }
    }
  };

  return (
    <div className="w-full">
      <div
        ref={carouselRef}
        className="flex overflow-x-auto gap-3 pb-2 snap-x snap-mandatory scrollbar-hide"
        onScroll={handleScroll}
        style={{
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {displayedDogs.map((dog, index) => (
          <Link
            key={dog.id}
            href={`/dogs/${dog.slug}`}
            className="flex-shrink-0 w-[70vw] max-w-[280px] aspect-[4/5] relative overflow-hidden rounded-lg cursor-pointer group block snap-start"
          >
            <FallbackImage
              src={dog.primary_image_url}
              alt={`${dog.name} - ${breedName} rescue dog`}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              priority={index < 3}
              sizes="(max-width: 640px) 70vw, 280px"
              fallbackSrc="/images/dog-placeholder.jpg"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            <div className="absolute bottom-2 left-2">
              <span className="text-white text-sm font-medium bg-black/50 px-2 py-1 rounded">
                {dog.name}
              </span>
            </div>
          </Link>
        ))}
      </div>
      {/* Lollipop-style indicators */}
      <div className="flex justify-center mt-4 gap-2">
        {displayedDogs.map((_, index) => {
          const isActive = currentSlide === index;
          return (
            <button
              key={index}
              className={`w-10 h-10 rounded-full border-2 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                isActive
                  ? "bg-orange-600 border-orange-600"
                  : "bg-white border-gray-300 hover:border-orange-400"
              }`}
              onClick={() => scrollToSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full mx-auto ${
                  isActive ? "bg-white" : "bg-gray-400"
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface BreedPhotoGalleryProps {
  dogs: CarouselDog[];
  breedName: string;
  className?: string;
}

export default function BreedPhotoGallery({ dogs, breedName, className = "" }: BreedPhotoGalleryProps) {
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const handleImageError = (dogId: string | number): void => {
    setImageErrors((prev) => ({ ...prev, [dogId]: true }));
  };

  if (!dogs || dogs.length === 0) {
    return (
      <div className={`${className}`}>
        {/* Desktop placeholder */}
        <div className="hidden md:grid grid-cols-3 gap-2">
          {[...Array(6)].map((_, i) => {
            const aspectRatios = [
              "aspect-[4/5]",
              "aspect-square",
              "aspect-[3/4]",
              "aspect-[5/4]",
              "aspect-[4/3]",
              "aspect-square",
            ];
            return (
              <div
                key={i}
                className={`${aspectRatios[i]} bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center animate-pulse`}
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
            );
          })}
        </div>
        {/* Mobile placeholder */}
        <div className="md:hidden">
          <div className="flex gap-3 overflow-hidden">
            {[...Array(2)].map((_, i) => (
              <div
                key={i}
                className="flex-shrink-0 w-[70vw] max-w-[280px] aspect-[4/5] bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center animate-pulse"
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
        </div>
      </div>
    );
  }

  const getMasonryLayout = (): React.JSX.Element[] | undefined => {
    // Predefined aspect ratios to create masonry effect
    const aspectRatios = [
      "aspect-[4/5]", // Tall rectangle
      "aspect-square", // Square
      "aspect-[3/4]", // Portrait
      "aspect-[5/4]", // Landscape
      "aspect-[4/3]", // Landscape
      "aspect-square", // Square
    ];

    return dogs?.slice(0, 6).map((dog, index) => (
      <Link
        key={dog.id}
        href={`/dogs/${dog.slug}`}
        className={`relative overflow-hidden rounded-lg cursor-pointer group block ${aspectRatios[index]}`}
      >
        <FallbackImage
          src={dog.primary_image_url}
          alt={`${dog.name} - ${breedName} rescue dog`}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          priority={index < 3}
          fallbackSrc="/images/dog-placeholder.jpg"
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
        <BreedMobileCarousel
          dogs={dogs}
          breedName={breedName}
          imageErrors={imageErrors}
          handleImageError={handleImageError}
        />
      </div>
    </div>
  );
}

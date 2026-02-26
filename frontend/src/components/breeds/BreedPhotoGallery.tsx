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
}

function BreedMobileCarousel({
  dogs,
  breedName,
}: BreedMobileCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const displayedDogs = dogs?.slice(0, 6) || [];

  const scrollToSlide = (index: number): void => {
    if (carouselRef.current) {
      const slideWidth = carouselRef.current.offsetWidth * 0.7;
      const gap = 12;
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
            className="flex-shrink-0 w-[70vw] max-w-[280px] aspect-[4/5] relative overflow-hidden rounded-xl cursor-pointer group block snap-start"
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
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            <div className="absolute bottom-3 left-3">
              <span className="text-white text-sm font-medium">
                {dog.name}
              </span>
            </div>
          </Link>
        ))}
      </div>
      <div className="flex justify-center mt-3 gap-1.5">
        {displayedDogs.map((_, index) => {
          const isActive = currentSlide === index;
          return (
            <button
              key={index}
              className={`h-2 rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 ${
                isActive
                  ? "w-6 bg-orange-600"
                  : "w-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400"
              }`}
              onClick={() => scrollToSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
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
  if (!dogs || dogs.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="aspect-[4/3] bg-gray-50 dark:bg-gray-800/50 rounded-xl flex flex-col items-center justify-center text-center p-6">
          <svg
            className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
            />
          </svg>
          <p className="text-sm font-medium text-gray-400 dark:text-gray-500">
            Photos coming soon
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`breed-photo-gallery ${className}`}>
      {/* Desktop: Clean Grid */}
      <div className="hidden md:block">
        <div className="grid grid-cols-3 gap-2">
          {dogs.slice(0, 6).map((dog, index) => (
            <Link
              key={dog.id}
              href={`/dogs/${dog.slug}`}
              className="relative overflow-hidden rounded-xl cursor-pointer group block aspect-[4/5]"
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
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span className="text-white text-sm font-medium">
                  {dog.name}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Mobile: Swipeable Carousel */}
      <div className="md:hidden">
        <BreedMobileCarousel
          dogs={dogs}
          breedName={breedName}
        />
      </div>
    </div>
  );
}

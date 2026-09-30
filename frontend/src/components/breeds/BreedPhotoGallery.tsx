"use client";

import { FallbackImage } from "../ui/FallbackImage";
import Link from "next/link";
import type { GalleryDog } from "@/types/breeds";

interface BreedPhotoGalleryProps {
  dogs: GalleryDog[];
  breedName: string;
  className?: string;
}

export default function BreedPhotoGallery({ dogs, breedName, className = "" }: BreedPhotoGalleryProps) {
  // None of the breed's newest dogs has a photo (pickGalleryDogs logs it):
  // leave the gallery out rather than apologise for it (#660)
  if (!dogs || dogs.length === 0) {
    return null;
  }

  // From 768px only. On phones the list's own cards are the photos, just
  // below the header, so a carousel here only repeated them (#661)
  return (
    <div className={`breed-photo-gallery hidden md:block ${className}`}>
      <div className="grid grid-cols-3 gap-2">
        {dogs.slice(0, 6).map((dog, index) => (
          <Link
            key={dog.slug}
            href={`/dogs/${dog.slug}`}
            className="relative overflow-hidden rounded-xl cursor-pointer group block aspect-[4/5]"
          >
            <FallbackImage
              src={dog.primary_image_url}
              alt={`${dog.name} - ${breedName} rescue dog`}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300 motion-reduce:transition-none motion-reduce:transform-none"
              sizes="(max-width: 1024px) 33vw, 25vw"
              // Not preloaded: a phone hides the gallery, and a lazy image it
              // hides is never fetched. The first row still loads first (#672)
              fetchPriority={index < 3 ? "high" : "auto"}
              fallbackSrc="/images/dog-placeholder.jpg"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 motion-reduce:transition-none" />
            <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 motion-reduce:transition-none">
              <span className="text-white text-sm font-medium">
                {dog.name}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

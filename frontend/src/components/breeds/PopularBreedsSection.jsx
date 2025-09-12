"use client";

import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";

export default function PopularBreedsSection({ popularBreeds }) {
  if (!popularBreeds || popularBreeds.length === 0) {
    return null;
  }

  // Filter out Mixed and Unknown breeds and take first 5 pure/crossbreeds for display
  const displayBreeds = popularBreeds
    .filter(
      (breed) =>
        breed.primary_breed !== "Mixed Breed" &&
        breed.primary_breed !== "Mix" &&
        breed.primary_breed !== "Unknown" &&
        breed.breed_group !== "Mixed" &&
        breed.breed_group !== "Unknown",
    )
    .slice(0, 4);

  // Pastel colors for personality traits
  const PASTEL_COLORS = [
    {
      bg: "bg-blue-100 dark:bg-blue-900/30",
      text: "text-blue-800 dark:text-blue-300",
    },
    {
      bg: "bg-green-100 dark:bg-green-900/30",
      text: "text-green-800 dark:text-green-300",
    },
    {
      bg: "bg-purple-100 dark:bg-purple-900/30",
      text: "text-purple-800 dark:text-purple-300",
    },
    {
      bg: "bg-yellow-100 dark:bg-yellow-900/30",
      text: "text-yellow-800 dark:text-yellow-300",
    },
    {
      bg: "bg-pink-100 dark:bg-pink-900/30",
      text: "text-pink-800 dark:text-pink-300",
    },
  ];

  const capitalizeFirst = (str) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const handleBrowseAllClick = () => {
    // Dispatch event to expand all breed groups
    window.dispatchEvent(new CustomEvent("expandAllBreedGroups"));

    // Smooth scroll to breed groups section
    setTimeout(() => {
      const breedGroupsSection = document.getElementById("breed-groups");
      if (breedGroupsSection) {
        breedGroupsSection.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 100); // Small delay to ensure expansion happens first
  };

  return (
    <section
      className="py-12 bg-white dark:bg-gray-900"
      aria-labelledby="popular-breeds-heading"
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h2
            id="popular-breeds-heading"
            className="text-3xl font-bold dark:text-white"
          >
            Popular Breeds Available Now
          </h2>
          <button
            onClick={handleBrowseAllClick}
            className="text-primary hover:underline flex items-center gap-1 font-medium transition-colors"
            aria-label="Browse all breeds and expand breed groups"
          >
            Browse All Breeds
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {displayBreeds.map((breed) => {
            const firstDog = breed.sample_dogs?.[0];
            const imageUrl =
              firstDog?.primary_image_url || "/images/dog-placeholder.jpg";
            const traits = firstDog?.personality_traits || [];

            return (
              <Link
                key={breed.breed_slug}
                href={`/breeds/${breed.breed_slug}`}
                className="group"
                data-testid="breed-card"
              >
                <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-lg dark:hover:shadow-xl dark:hover:shadow-gray-700/20 transition-all duration-200 hover:scale-[1.02] h-full">
                  {/* Dog Image */}
                  <div className="relative h-64 w-full overflow-hidden bg-gray-100 dark:bg-gray-700">
                    <Image
                      src={imageUrl}
                      alt={`${breed.primary_breed} rescue dog`}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    />
                    <Badge className="absolute top-3 right-3 bg-orange-500 dark:bg-orange-600 text-white">
                      {breed.count} available
                    </Badge>
                  </div>

                  {/* Breed Info */}
                  <div className="p-4">
                    <h3 className="text-xl font-semibold mb-1 group-hover:text-primary dark:text-gray-100">
                      {breed.primary_breed}
                    </h3>

                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {breed.breed_group} Group •{" "}
                      {breed.breed_type === "purebred" ? "Purebred" : "Mixed"}
                    </p>

                    {/* Personality Traits */}
                    {traits.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {traits.slice(0, 3).map((trait, index) => {
                          const colors =
                            PASTEL_COLORS[index % PASTEL_COLORS.length];
                          return (
                            <span
                              key={trait}
                              className={`px-2 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}
                            >
                              {capitalizeFirst(trait)}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

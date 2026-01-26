// frontend/src/components/home/FeaturedDogsSection.jsx

import Link from "next/link";
import DogCardOptimized from "../dogs/DogCardOptimized";
import { Button } from "../ui/button";

export default function FeaturedDogsSection({ dogs, totalCount }) {
  return (
    <section
      className="bg-white dark:bg-gray-900 py-32 border-t border-orange-200/30 dark:border-orange-800/30 bg-dot-pattern"
      aria-labelledby="featured-dogs-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2
            id="featured-dogs-heading"
            className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4"
          >
            Dogs Waiting for Homes
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Showing 6 of {totalCount.toLocaleString()} available dogs
          </p>
        </div>

        {/* Dogs Grid */}
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-6 mb-12">
          {dogs.slice(0, 6).map((dog, index) => (
            <DogCardOptimized
              key={dog.id}
              dog={dog}
              priority={index < 3}
              disableContainment
            />
          ))}
        </div>

        {/* CTA Button */}
        <div className="text-center">
          <Link href="/dogs">
            <Button
              size="lg"
              className="bg-orange-600 hover:bg-orange-700 text-white px-16 py-6 text-lg font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 group"
            >
              Browse All {totalCount.toLocaleString()} Dogs
              <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform duration-300">
                →
              </span>
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

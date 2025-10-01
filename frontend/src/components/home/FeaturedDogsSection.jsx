// frontend/src/components/home/FeaturedDogsSection.jsx

import Link from "next/link";
import DogCardOptimized from "../dogs/DogCardOptimized";
import { Button } from "../ui/button";

export default function FeaturedDogsSection({ dogs, totalCount }) {
  return (
    <section
      className="bg-white dark:bg-gray-900 py-24"
      aria-labelledby="featured-dogs-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2
            id="featured-dogs-heading"
            className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-3"
          >
            Dogs Waiting for Homes
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Showing 6 of {totalCount.toLocaleString()} available dogs
          </p>
        </div>

        {/* Dogs Grid */}
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-6 mb-12">
          {dogs.slice(0, 6).map((dog) => (
            <DogCardOptimized key={dog.id} dog={dog} />
          ))}
        </div>

        {/* CTA Button */}
        <div className="text-center">
          <Link href="/dogs">
            <Button
              size="lg"
              className="bg-orange-600 hover:bg-orange-700 text-white px-12 py-4 text-lg"
            >
              Browse All {totalCount.toLocaleString()} Dogs →
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

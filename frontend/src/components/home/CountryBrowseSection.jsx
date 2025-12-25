"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { COUNTRIES, getCountriesArray } from "@/utils/countryData";

/**
 * CountryBrowseSection - Desktop homepage section showing top countries by dog count
 * Displays the top 4 countries with the most dogs available for adoption
 */
export default function CountryBrowseSection({ countryStats = [] }) {
  const countriesData = getCountriesArray();

  // Merge country metadata with stats, sort by count, take top 4
  const countriesWithStats = countriesData
    .map((country) => {
      const stats = countryStats.find(
        (s) => s.code?.toUpperCase() === country.code.toUpperCase()
      );
      return {
        ...country,
        count: stats?.count || 0,
      };
    })
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  // Don't render if no countries with dogs
  if (countriesWithStats.length === 0) {
    return null;
  }

  return (
    <section
      className="bg-white dark:bg-gray-950 py-20"
      aria-labelledby="country-browse-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2
            id="country-browse-heading"
            className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4"
          >
            Dogs from Across Europe
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Browse rescue dogs by their country of origin
          </p>
        </div>

        {/* Country Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {countriesWithStats.map((country) => (
            <Link
              key={country.code}
              href={`/dogs/country/${country.code.toLowerCase()}`}
              className="group"
            >
              <div className="flex items-center gap-3 p-5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:border-orange-200 dark:hover:border-orange-800 transition-all duration-200">
                <span className="text-4xl" role="img" aria-label={`${country.name} flag`}>
                  {country.flag}
                </span>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                    {country.shortName}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {country.count.toLocaleString()} dogs
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* View All CTA */}
        <div className="text-center">
          <Link href="/dogs/country">
            <Button
              variant="outline"
              size="lg"
              className="border-orange-600 text-orange-600 hover:bg-orange-50 dark:border-orange-500 dark:text-orange-400 dark:hover:bg-orange-950/30"
            >
              View All Countries →
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

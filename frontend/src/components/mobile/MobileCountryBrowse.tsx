"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { COUNTRIES, getCountriesArray } from "@/utils/countryData";

interface CountryStat {
  code: string;
  count: number;
}

interface MobileCountryBrowseProps {
  countryStats?: CountryStat[];
}

/**
 * MobileCountryBrowse - Mobile homepage section showing top countries by dog count
 * Displays as a horizontal scrollable list with the top 4 countries
 */
export default function MobileCountryBrowse({
  countryStats = [],
}: MobileCountryBrowseProps) {
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
      className="px-4 py-6"
      aria-labelledby="mobile-country-browse-heading"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2
          id="mobile-country-browse-heading"
          className="text-lg font-bold text-zinc-900 dark:text-zinc-50"
        >
          Browse by Country
        </h2>
        <Link
          href="/dogs/country"
          className="flex items-center text-sm font-medium text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300"
        >
          View All
          <ChevronRight className="w-4 h-4 ml-0.5" />
        </Link>
      </div>

      {/* Horizontal scroll container */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {countriesWithStats.map((country) => (
          <Link
            key={country.code}
            href={`/dogs/country/${country.code.toLowerCase()}`}
            className="flex-shrink-0"
          >
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-[0_1px_0_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)] hover:border-orange-300 dark:hover:border-orange-700 transition-colors">
              <span
                className="text-2xl"
                role="img"
                aria-label={`${country.name} flag`}
              >
                {country.flag}
              </span>
              <div>
                <p className="font-semibold text-zinc-900 dark:text-zinc-50 text-sm whitespace-nowrap">
                  {country.shortName}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {country.count.toLocaleString()} dogs
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

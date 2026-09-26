import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import type { CountriesHubClientProps } from "@/types/pageComponents";
import { catalogCountryValue } from "@/utils/adoptability";
import { COUNTRIES, getAllCountryCodes } from "@/utils/countryData";

/**
 * /dogs/country (#502): a country page per country where dogs live now, each
 * with both numbers, since where a dog lives is not where it can be adopted.
 */
export default function CountriesHubClient({ initialStats, adoptableOptions = [] }: CountriesHubClientProps) {
  const optionValues = adoptableOptions.map((option) => String(option.value));
  const countries = getAllCountryCodes()
    .map((code) => {
      const country = COUNTRIES[code];
      const value = catalogCountryValue(optionValues, code);
      return {
        ...country,
        count: initialStats?.countries?.find((c) => c.code === code)?.count ?? 0,
        adoptable: adoptableOptions.find((option) => String(option.value) === value)?.count ?? 0,
      };
    })
    .filter((country) => country.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <div className="mx-auto max-w-7xl py-6 lg:py-8">
      <Breadcrumbs
        items={[
          { name: "Home", url: "/" },
          { name: "Dogs", url: "/dogs" },
          { name: "Countries" },
        ]}
      />

      <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">Rescue dogs by country</h1>
      <p className="mt-2 max-w-2xl text-base text-subtle">
        Where the dogs live now. Many rescues rehome across borders, so the dogs you can adopt depend on where you
        live, not where they are.
      </p>

      <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {countries.map((country) => {
          const place = country.placeName ?? country.name;
          return (
            <li key={country.code}>
              <Link
                href={`/dogs/country/${country.code.toLowerCase()}`}
                className="group flex h-full items-center gap-4 rounded-2xl border border-line bg-surface p-4 transition-colors hover:bg-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-5"
              >
                <span className="text-3xl leading-none" aria-hidden="true">
                  {country.flag}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-lg font-bold text-ink">{country.name}</span>
                  <span className="block text-sm text-ink">
                    {country.count.toLocaleString("en-GB")} {country.count === 1 ? "dog" : "dogs"} in {place}
                  </span>
                  {country.adoptable > 0 && (
                    <span className="block text-sm text-subtle">
                      {country.adoptable.toLocaleString("en-GB")} adoptable by people living there
                    </span>
                  )}
                </span>
                <ArrowRight
                  className="h-5 w-5 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            </li>
          );
        })}
      </ul>

      <Link
        href="/dogs"
        className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-orange-700 underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-orange-400"
      >
        Browse every dog, wherever it lives
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}

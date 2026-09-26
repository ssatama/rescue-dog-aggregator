"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import LandingNav from "@/components/landing/LandingNav";
import type { CountryDogsClientProps } from "@/types/pageComponents";
import DogsPageClientSimplified from "../../DogsPageClientSimplified";

/**
 * A country page (#502): the dogs that live in the country, in the catalog
 * itself. The intro says plainly that this is not the same as the dogs
 * someone living there can adopt, and links to those.
 */
export default function CountryDogsClient({
  country,
  initialDogs,
  metadata,
  allCountries,
  totalCount,
  adoptableCount,
}: CountryDogsClientProps) {
  const place = country.placeName ?? country.name;
  const initialParams = useMemo(() => ({ location_country: country.code }), [country.code]);
  const navItems = [
    { href: "/dogs/country", label: "All countries" },
    ...Object.values(allCountries).map((c) => ({
      href: `/dogs/country/${c.code.toLowerCase()}`,
      label: `${c.flag} ${c.shortName}`,
      current: c.code === country.code,
    })),
  ];

  return (
    <div className="mx-auto max-w-7xl py-6 lg:py-8">
      <Breadcrumbs
        items={[
          { name: "Home", url: "/" },
          { name: "Dogs", url: "/dogs" },
          { name: "Countries", url: "/dogs/country" },
          { name: country.name },
        ]}
      />

      <header className="grid gap-3">
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Rescue dogs in {place}
        </h1>
        <p className="max-w-2xl text-base text-subtle">{country.description}.</p>
        {totalCount > 0 && (
          <p className="max-w-2xl text-base text-ink">
            <strong className="font-semibold">{totalCount.toLocaleString("en-GB")}</strong>{" "}
            {totalCount === 1 ? "dog is" : "dogs are"} in {place} right now.
            {adoptableCount > 0 && (
              <>
                {" "}
                <strong className="font-semibold">{adoptableCount.toLocaleString("en-GB")}</strong>{" "}
                {adoptableCount === 1 ? "dog" : "dogs"} can be adopted by someone living in {place}, counting
                rescues abroad that rehome there.
              </>
            )}
          </p>
        )}
        {adoptableCount > 0 && (
          <Link
            href={`/dogs?available_country=${encodeURIComponent(country.code)}`}
            className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-orange-700 underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-orange-400"
          >
            See every dog you can adopt in {place}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
        <LandingNav label="Browse by country" items={navItems} />
      </header>

      <section id="dogs-grid" aria-label={`Rescue dogs in ${place}`} className="scroll-mt-20">
        <DogsPageClientSimplified
          initialDogs={initialDogs}
          metadata={metadata}
          initialParams={initialParams}
          hideHero
          hideBreadcrumbs
        />
      </section>
    </div>
  );
}

"use client";

import Layout from "@/components/layout/Layout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import CountryQuickNav from "@/components/countries/CountryQuickNav";
import DogsPageClientSimplified from "../../DogsPageClientSimplified";

export default function CountryDogsClient({
  country,
  initialDogs,
  metadata,
  allCountries,
  totalCount,
}) {
  const breadcrumbItems = [
    { name: "Home", url: "/" },
    { name: "Dogs", url: "/dogs" },
    { name: "Countries", url: "/dogs/country" },
    { name: country.name },
  ];

  const totalDogs = totalCount || 0;

  return (
    <Layout>
      <div className="container mx-auto px-4 pt-4">
        <Breadcrumbs items={breadcrumbItems} />
      </div>

      <section
        className={`relative bg-gradient-to-br ${country.gradient} py-6 md:py-10 px-4 overflow-hidden`}
      >
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_50%,white_1px,transparent_1px)] bg-[length:20px_20px]" />

        <div className="absolute top-4 right-4 md:top-8 md:right-8 text-6xl md:text-8xl opacity-20">
          {country.flag}
        </div>

        <div className="relative max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl md:text-4xl">{country.flag}</span>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-white drop-shadow-md">
              Rescue Dogs in {country.name}
            </h1>
          </div>
          <p className="text-base md:text-lg text-white/95 max-w-2xl drop-shadow-sm">
            {country.tagline} &mdash;{" "}
            <span className="font-semibold">
              {totalDogs.toLocaleString()}
            </span>{" "}
            dogs waiting for their forever homes
          </p>
        </div>
      </section>

      <CountryQuickNav
        currentCountry={country.code}
        allCountries={allCountries}
      />

      <DogsPageClientSimplified
        initialDogs={initialDogs}
        metadata={metadata}
        initialParams={{ location_country: country.code }}
        hideHero={true}
        hideBreadcrumbs={true}
        wrapWithLayout={false}
      />
    </Layout>
  );
}

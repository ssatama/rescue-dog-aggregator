"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import Layout from "@/components/layout/Layout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import CountryQuickNav from "@/components/countries/CountryQuickNav";
import DogsPageClientSimplified from "../../DogsPageClientSimplified";
import FallbackImage from "@/components/ui/FallbackImage";

export default function CountryDogsClient({
  country,
  initialDogs,
  featuredDogs,
  metadata,
  allCountries,
}) {
  const breadcrumbItems = [
    { name: "Home", url: "/" },
    { name: "Dogs", url: "/dogs" },
    { name: "Countries", url: "/dogs/country" },
    { name: country.name },
  ];

  const totalDogs = initialDogs?.total || 0;

  return (
    <Layout>
      <div className="container mx-auto px-4 pt-4">
        <Breadcrumbs items={breadcrumbItems} />
      </div>

      <section
        className={`relative bg-gradient-to-br ${country.gradient} text-white py-8 md:py-12 px-4 overflow-hidden`}
      >
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_50%,white_1px,transparent_1px)] bg-[length:20px_20px]" />

        <div className="absolute top-6 right-6 md:top-10 md:right-10 text-6xl md:text-8xl opacity-20">
          {country.flag}
        </div>

        <div className="relative max-w-6xl mx-auto">
          <div className="mb-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl md:text-5xl">{country.flag}</span>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
                Rescue Dogs in {country.name}
              </h1>
            </div>
            <p className="text-lg md:text-xl opacity-95 max-w-2xl">
              {country.tagline} &mdash;{" "}
              <span className="font-semibold">
                {totalDogs.toLocaleString()}
              </span>{" "}
              dogs waiting for their forever homes
            </p>
          </div>

          {featuredDogs.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 animate-fade-in animation-delay-200">
              {featuredDogs.map((dog, idx) => (
                <Link key={dog.slug} href={`/dogs/${dog.slug}`}>
                  <div className="relative aspect-square rounded-xl overflow-hidden bg-white/10 group cursor-pointer">
                    <FallbackImage
                      src={dog.primary_image_url}
                      alt={dog.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 768px) 50vw, 25vw"
                      priority={idx === 0}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="text-white font-semibold text-sm truncate">
                        {dog.name}
                      </p>
                      <p className="text-white/80 text-xs">
                        {dog.standardized_breed || dog.breed || "Mixed"}
                      </p>
                    </div>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Heart className="h-5 w-5 text-white drop-shadow" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
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
